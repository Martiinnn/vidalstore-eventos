import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ConsumeMessage } from 'amqplib';
import { MensajeriaService } from '../../mensajeria/mensajeria.service';
import { COLAS } from '../../mensajeria/topologia';
import { Notificacion } from '../../entidades/notificacion.entity';

@Injectable()
export class CorreosConsumer implements OnModuleInit {
  constructor(
    private readonly mensajeriaService: MensajeriaService,
    @InjectRepository(Notificacion)
    private readonly notificacionRepo: Repository<Notificacion>
  ) {}

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
      COLAS.CORREOS,
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

    if (!payload?.para || !payload?.asunto) {
      channel.nack(msg, false, false);
      return;
    }

    try {
      console.log(`[Correo Simulado] Enviando correo a ${payload.para} | Asunto: ${payload.asunto}`);

      const eventoId = payload?.eventoId || (msg.properties.headers?.['x-evento-id'] as string) || null;
      const notificacion = this.notificacionRepo.create({
        para: payload.para,
        asunto: payload.asunto,
        estado: 'enviada',
        eventoId
      });

      await this.notificacionRepo.save(notificacion);
      channel.ack(msg);
    } catch {
      channel.nack(msg, false, false);
    }
  }
}
