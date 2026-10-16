import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import amqp from 'amqplib';
import type { Channel, ChannelModel } from 'amqplib';
import { randomUUID } from 'crypto';
import { EXCHANGES, COLAS, ROUTING_KEYS } from './topologia';

@Injectable()
export class MensajeriaService implements OnModuleInit, OnModuleDestroy {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  async onModuleInit() {
    await this.conectar();
  }

  async onModuleDestroy() {
    await this.desconectar();
  }

  async conectar(): Promise<void> {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://vidalstore_admin:vidalstore_pass_2026@localhost:5672';
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      this.connection.on('error', (err) => {
        console.error('RabbitMQ error:', err.message);
        this.channel = null;
        this.connection = null;
      });

      this.connection.on('close', () => {
        this.channel = null;
        this.connection = null;
      });

      await this.inicializarTopologia();
    } catch (err: any) {
      console.error('Error conectando a RabbitMQ:', err.message);
    }
  }

  async inicializarTopologia(): Promise<void> {
    if (!this.channel) return;

    await this.channel.assertExchange(
      EXCHANGES.EVENTOS.NOMBRE,
      EXCHANGES.EVENTOS.TIPO,
      EXCHANGES.EVENTOS.OPCIONES
    );
    await this.channel.assertExchange(
      EXCHANGES.COMANDOS.NOMBRE,
      EXCHANGES.COMANDOS.TIPO,
      EXCHANGES.COMANDOS.OPCIONES
    );
    await this.channel.assertExchange(
      EXCHANGES.DLX.NOMBRE,
      EXCHANGES.DLX.TIPO,
      EXCHANGES.DLX.OPCIONES
    );

    await this.channel.assertQueue(COLAS.DLQ_AVISOS, { durable: true });
    await this.channel.bindQueue(COLAS.DLQ_AVISOS, EXCHANGES.DLX.NOMBRE, COLAS.AVISOS);

    await this.channel.assertQueue(COLAS.DLQ_AUDITORIA, { durable: true });
    await this.channel.bindQueue(COLAS.DLQ_AUDITORIA, EXCHANGES.DLX.NOMBRE, COLAS.AUDITORIA);

    await this.channel.assertQueue(COLAS.DLQ_CORREOS, { durable: true });
    await this.channel.bindQueue(COLAS.DLQ_CORREOS, EXCHANGES.DLX.NOMBRE, COLAS.CORREOS);

    await this.channel.assertQueue(COLAS.AVISOS, {
      durable: true,
      deadLetterExchange: EXCHANGES.DLX.NOMBRE,
      deadLetterRoutingKey: COLAS.AVISOS
    });
    await this.channel.bindQueue(
      COLAS.AVISOS,
      EXCHANGES.EVENTOS.NOMBRE,
      ROUTING_KEYS.LICENCIA_REVOCADA
    );

    await this.channel.assertQueue(COLAS.AUDITORIA, {
      durable: true,
      deadLetterExchange: EXCHANGES.DLX.NOMBRE,
      deadLetterRoutingKey: COLAS.AUDITORIA
    });
    await this.channel.bindQueue(
      COLAS.AUDITORIA,
      EXCHANGES.EVENTOS.NOMBRE,
      ROUTING_KEYS.AUDITORIA_TODO
    );

    await this.channel.assertQueue(COLAS.CORREOS, {
      durable: true,
      deadLetterExchange: EXCHANGES.DLX.NOMBRE,
      deadLetterRoutingKey: COLAS.CORREOS
    });
    await this.channel.bindQueue(
      COLAS.CORREOS,
      EXCHANGES.COMANDOS.NOMBRE,
      ROUTING_KEYS.CORREO_ENVIAR
    );
  }

  getChannel(): Channel | null {
    return this.channel;
  }

  getConnection(): ChannelModel | null {
    return this.connection;
  }

  estaConectado(): boolean {
    return this.channel !== null && this.connection !== null;
  }

  async publicarComando(exchange: string, routingKey: string, payload: Record<string, any>, eventoIdOriginal?: string): Promise<boolean> {
    if (!this.channel) {
      console.warn('No hay canal disponible para publicar comando');
      return false;
    }
    const eventoId = eventoIdOriginal || randomUUID();
    const emitidoEn = new Date().toISOString();
    const buffer = Buffer.from(JSON.stringify(payload));
    return this.channel.publish(exchange, routingKey, buffer, {
      persistent: true,
      contentType: 'application/json',
      headers: {
        'x-evento-id': eventoId,
        'x-emitido-en': emitidoEn
      }
    });
  }

  async desconectar(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch {}
  }
}
