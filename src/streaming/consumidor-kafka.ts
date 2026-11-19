import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { setTimeout as esperar } from 'node:timers/promises';
import {
  Consumer,
  MessagesStream,
  MessagesStreamFallbackModes,
  MessagesStreamModes,
  stringDeserializers,
} from '@platformatic/kafka';
import { Contrato, EventoInvalido, type Mensaje } from './contrato';
import { PublicadorDlt, type MotivoDlt } from './dlt';

export type Resultado = 'nuevo' | 'duplicado' | 'ignorado';

export interface Procesador<T> {
  procesar(evento: T): Promise<Resultado>;
}

export type OpcionesGrupo<T extends object> = {
  grupo: string;
  topics: string[];
  dto: new () => T;
  desdeElPrincipio?: boolean;
};

export const ESPERAS_REINTENTO_MS = [1000, 2000, 4000];
const CADA_RESUMEN_MS = 10_000;

export abstract class ConsumidorKafka<T extends object> implements OnModuleInit, OnModuleDestroy {
  protected readonly log: Logger;
  private readonly consumidor: Consumer<string, string, string, string>;
  private readonly dlt: PublicadorDlt;
  private readonly contrato: Contrato<T>;
  private flujo?: MessagesStream<string, string, string, string>;
  private reloj?: NodeJS.Timeout;
  private cerrando = false;
  private readonly cuenta = { nuevos: 0, duplicados: 0, ignorados: 0, invalidos: 0, sinPostgres: 0 };
  private ultimoResumen = '';

  protected constructor(
    private readonly opciones: OpcionesGrupo<T>,
    private readonly negocio: Procesador<T>,
  ) {
    this.log = new Logger(opciones.grupo);
    this.contrato = new Contrato(opciones.dto);
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092,localhost:9094,localhost:9096').split(',').map(b => b.trim()).filter(Boolean);
    this.consumidor = new Consumer({
      groupId: opciones.grupo,
      clientId: 'vidalstore-eventos',
      bootstrapBrokers: brokers,
      deserializers: stringDeserializers,
    });
    this.dlt = new PublicadorDlt(brokers, `vidalstore-eventos-dlt-${opciones.grupo}`);
  }

  async onModuleInit(): Promise<void> {
    this.flujo = await this.consumidor.consume({
      topics: this.opciones.topics,
      autocommit: false,
      mode: this.opciones.desdeElPrincipio ? MessagesStreamModes.EARLIEST : MessagesStreamModes.COMMITTED,
      fallbackMode: MessagesStreamFallbackModes.EARLIEST,
    });
    this.log.log(`grupo ${this.opciones.grupo} leyendo ${this.opciones.topics.join(' y ')}`);
    this.reloj = setInterval(() => this.resumir(), CADA_RESUMEN_MS);
    void this.leer();
  }

  private async leer(): Promise<void> {
    try {
      for await (const m of this.flujo!) {
        const donde = `${m.topic}[${m.partition}]@${m.offset}`;
        let evento: T;
        try {
          evento = this.contrato.validar(m);
        } catch (error) {
          if (!(error instanceof EventoInvalido)) throw error;
          this.cuenta.invalidos++;
          await this.desviar(m, donde, error.motivo, error.message);
          await m.commit();
          continue;
        }
        const resultado = await this.procesarConReintentos(evento, donde);
        if (resultado === undefined) return;
        if (resultado instanceof Error) {
          this.cuenta.sinPostgres++;
          await this.desviar(m, donde, 'postgres-no-responde', resultado.message);
        }
        if (resultado === 'nuevo') this.cuenta.nuevos++;
        if (resultado === 'ignorado') this.cuenta.ignorados++;
        if (resultado === 'duplicado') {
          this.cuenta.duplicados++;
          this.log.warn(`${donde} DUPLICADO: ya estaba procesado, no suma`);
        }
        await m.commit();
      }
    } catch (error) {
      if (!this.cerrando) this.log.error(`el consumidor se detuvo: ${(error as Error).message}`);
    }
  }

  private async desviar(m: Mensaje, donde: string, motivo: MotivoDlt, detalle: string): Promise<void> {
    const destino = await this.dlt.desviar(m, this.opciones.grupo, motivo, detalle);
    this.log.warn(`${donde} AL .DLT (${motivo}) -> ${destino}: ${detalle}`);
  }

  private async procesarConReintentos(evento: T, donde: string): Promise<Resultado | Error | undefined> {
    for (let intento = 0; !this.cerrando; intento++) {
      try {
        return await this.negocio.procesar(evento);
      } catch (error) {
        const causa = error instanceof Error ? error : new Error(String(error));
        if (intento === ESPERAS_REINTENTO_MS.length) {
          this.log.error(`${donde} sin Postgres tras ${intento} reintentos: ${causa.message}`);
          return causa;
        }
        const espera = ESPERAS_REINTENTO_MS[intento];
        this.log.error(
          `${donde} no se pudo escribir, reintento ${intento + 1} de ${ESPERAS_REINTENTO_MS.length} en ${espera / 1000} s: ${causa.message}`,
        );
        await esperar(espera);
      }
    }
    return undefined;
  }

  private resumir(): void {
    const { nuevos, duplicados, ignorados, invalidos, sinPostgres } = this.cuenta;
    const texto =
      `desde el arranque: ${nuevos} nuevos, ${duplicados} duplicados, ${ignorados} ignorados, ` +
      `${invalidos + sinPostgres} al .dlt (${invalidos} invalidos, ${sinPostgres} sin postgres)`;
    if (texto === this.ultimoResumen || nuevos + duplicados + ignorados + invalidos + sinPostgres === 0) return;
    this.ultimoResumen = texto;
    this.log.log(texto);
  }

  async onModuleDestroy(): Promise<void> {
    this.cerrando = true;
    if (this.reloj) clearInterval(this.reloj);
    this.resumir();
    await this.flujo?.close();
    await this.consumidor.close();
    await this.dlt.cerrar();
  }
}
