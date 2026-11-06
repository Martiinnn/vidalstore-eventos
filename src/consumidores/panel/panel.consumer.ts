import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import {
  Consumer,
  MessagesStream,
  MessagesStreamModes,
  MessagesStreamFallbackModes,
  stringDeserializers
} from '@platformatic/kafka';
import { TOPICS } from '../../kafka/topologia';
import { SobreEventoDto, validarSobreEvento } from '../../kafka/dto/sobre-evento.dto';

@Injectable()
export class PanelConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PanelConsumer.name);
  private consumidor: Consumer<string, string, string, string>;
  private flujo: MessagesStream<string, string, string, string> | null = null;
  private ejecutando = false;

  constructor() {
    const bootstrapBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092,localhost:9094,localhost:9096').split(',');
    const clientId = process.env.KAFKA_CLIENT_ID || 'vidalstore-panel';

    this.consumidor = new Consumer({
      groupId: 'vidalstore-panel',
      clientId,
      bootstrapBrokers,
      deserializers: stringDeserializers
    });
  }

  async onModuleInit(): Promise<void> {
    this.ejecutando = true;
    this.iniciarConsumo().catch((err) => {
      this.logger.error(`Error al iniciar consumo kafka: ${err?.message || err}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.ejecutando = false;
    if (this.flujo) {
      try {
        await this.flujo.close();
      } catch (err) {
        this.logger.error(`Error al cerrar flujo kafka: ${err?.message || err}`);
      }
      this.flujo = null;
    }
    if (this.consumidor) {
      try {
        await this.consumidor.close();
      } catch (err) {
        this.logger.error(`Error al cerrar consumidor kafka: ${err?.message || err}`);
      }
    }
  }

  private async iniciarConsumo(): Promise<void> {
    try {
      this.flujo = await this.consumidor.consume({
        topics: [TOPICS.COMPRAS, TOPICS.ACTIVIDAD],
        autocommit: false,
        mode: MessagesStreamModes.COMMITTED,
        fallbackMode: MessagesStreamFallbackModes.EARLIEST
      });

      for await (const m of this.flujo) {
        if (!this.ejecutando) {
          break;
        }

        try {
          if (m.value) {
            const raw = JSON.parse(m.value);
            const dto = new SobreEventoDto(raw);
            validarSobreEvento(dto);
          }
        } catch {
        } finally {
          await m.commit();
        }
      }
    } catch (err) {
      if (this.ejecutando) {
        this.logger.error(`Fallo en el flujo de consumo kafka: ${err?.message || err}`);
      }
    }
  }
}
