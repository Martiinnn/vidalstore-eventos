import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ConsumeMessage } from 'amqplib';
import { MensajeriaService } from '../../mensajeria/mensajeria.service';
import { COLAS } from '../../mensajeria/topologia';
import { EventoAuditoria } from '../../entidades/evento-auditoria.entity';

@Injectable()
export class AuditoriaConsumer implements OnModuleInit {
  constructor(
    private readonly mensajeriaService: MensajeriaService,
    @InjectRepository(EventoAuditoria)
    private readonly auditoriaRepo: Repository<EventoAuditoria>
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
      COLAS.AUDITORIA,
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

    const eventoId = (msg.properties.headers?.['x-evento-id'] as string) || payload?.eventoId;
    if (!eventoId) {
      channel.nack(msg, false, false);
      return;
    }

    const emitidoEnRaw = msg.properties.headers?.['x-emitido-en'] as string;
    const emitidoEn = emitidoEnRaw ? new Date(emitidoEnRaw) : null;
    const usuarioSub = payload?.usuarioSub || payload?.editorSub || null;

    try {
      const nuevoEvento = this.auditoriaRepo.create({
        routingKey: msg.fields.routingKey,
        eventoId,
        usuarioSub,
        payload,
        emitidoEn
      });

      await this.auditoriaRepo.save(nuevoEvento);
      channel.ack(msg);
    } catch (err: any) {
      if (err.code === '23505') {
        channel.ack(msg);
        return;
      }
      channel.nack(msg, false, false);
    }
  }
}
