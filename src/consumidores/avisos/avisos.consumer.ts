import { Injectable, OnModuleInit } from '@nestjs/common';
import type { ConsumeMessage } from 'amqplib';
import { MensajeriaService } from '../../mensajeria/mensajeria.service';
import { COLAS, EXCHANGES, ROUTING_KEYS } from '../../mensajeria/topologia';

@Injectable()
export class AvisosConsumer implements OnModuleInit {
  constructor(private readonly mensajeriaService: MensajeriaService) {}

  async onModuleInit() {
    setTimeout(() => this.iniciarConsumidor(), 1000);
  }

  async iniciarConsumidor(): Promise<void> {
    const channel = this.mensajeriaService.getChannel();
    if (!channel) {
      setTimeout(() => this.iniciarConsumidor(), 2000);
      return;
    }

    await channel.prefetch(1);
    await channel.consume(
      COLAS.AVISOS,
      (msg) => this.procesarMensaje(msg),
      { noAck: false }
    );
  }

  async procesarMensaje(msg: ConsumeMessage | null): Promise<void> {
    if (!msg) return;
    const channel = this.mensajeriaService.getChannel();
    if (!channel) return;

    let payload: any;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      channel.nack(msg, false, false);
      return;
    }

    if (!payload?.usuarioSub) {
      channel.nack(msg, false, false);
      return;
    }

    try {
      const eventoIdOriginal = msg.properties.headers?.['x-evento-id'] as string;
      const comandoCorreo = {
        para: payload.usuarioSub,
        asunto: 'Aviso de revocacion de licencia',
        cuerpo: `Su licencia ${payload.licenciaId || ''} ha sido revocada por ${payload.revocadaPor || 'administrador'}. Motivo: ${payload.motivo || 'Revocacion administrativa'}.`,
        origen: 'vidalstore.avisos',
        eventoId: eventoIdOriginal || null
      };

      await this.mensajeriaService.publicarComando(
        EXCHANGES.COMANDOS.NOMBRE,
        ROUTING_KEYS.CORREO_ENVIAR,
        comandoCorreo,
        eventoIdOriginal
      );

      channel.ack(msg);
    } catch {
      channel.nack(msg, false, false);
    }
  }
}
