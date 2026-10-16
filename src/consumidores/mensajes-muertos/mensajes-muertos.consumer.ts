import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ConsumeMessage } from 'amqplib';
import { MensajeriaService } from '../../mensajeria/mensajeria.service';
import { COLAS } from '../../mensajeria/topologia';
import { MensajeMuerto } from '../../entidades/mensaje-muerto.entity';

@Injectable()
export class MensajesMuertosConsumer implements OnModuleInit {
  constructor(
    private readonly mensajeriaService: MensajeriaService,
    @InjectRepository(MensajeMuerto)
    private readonly mensajeMuertoRepo: Repository<MensajeMuerto>
  ) {}

  async onModuleInit() {
    setTimeout(() => this.iniciarConsumidores(), 1000);
  }

  async iniciarConsumidores(): Promise<void> {
    const channel = this.mensajeriaService.getChannel();
    if (!channel) {
      setTimeout(() => this.iniciarConsumidores(), 2000);
      return;
    }

    await channel.prefetch(1);
    const colasDlq = [COLAS.DLQ_AVISOS, COLAS.DLQ_AUDITORIA, COLAS.DLQ_CORREOS];

    for (const cola of colasDlq) {
      await channel.consume(
        cola,
        (msg) => this.procesarMensajeMuerto(msg, cola),
        { noAck: false }
      );
    }
  }

  async procesarMensajeMuerto(msg: ConsumeMessage | null, colaActual: string): Promise<void> {
    if (!msg) return;
    const channel = this.mensajeriaService.getChannel();
    if (!channel) return;

    const payload = msg.content.toString();
    const xDeath = msg.properties.headers?.['x-death'];
    const infoDeath = Array.isArray(xDeath) && xDeath.length > 0 ? xDeath[0] : null;

    const colaOrigen = infoDeath?.queue || colaActual;
    const routingKey = (Array.isArray(infoDeath?.['routing-keys']) ? infoDeath['routing-keys'][0] : msg.fields.routingKey) || '';
    const motivo = infoDeath?.reason || 'rejected';
    const intentos = Number(infoDeath?.count) || 1;

    console.log(`[DLQ] Mensaje muerto registrado desde ${colaOrigen} | RoutingKey: ${routingKey} | Motivo: ${motivo} | Intentos: ${intentos}`);

    try {
      const registro = this.mensajeMuertoRepo.create({
        colaOrigen,
        routingKey,
        motivo,
        intentos,
        payload
      });

      await this.mensajeMuertoRepo.save(registro);
      channel.ack(msg);
    } catch (err: any) {
      console.error('[DLQ] Error al guardar en base de datos:', err.message);
      channel.nack(msg, false, true);
    }
  }
}
