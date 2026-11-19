import { Producer, ProduceAcks, compatibilityPartitioner, stringSerializers } from '@platformatic/kafka';
import type { Mensaje, MotivoInvalido } from './contrato';

export type MotivoDlt = MotivoInvalido | 'postgres-no-responde';

export const topicDlt = (topic: string): string => `${topic}.dlt`;

const LARGO_DETALLE = 500;

export function cabecerasDlt(m: Mensaje, grupo: string, motivo: MotivoDlt, detalle: string): Map<string, string> {
  const cabeceras = new Map(m.headers);
  cabeceras.set('x-motivo', motivo);
  cabeceras.set('x-grupo', grupo);
  cabeceras.set('x-topic-origen', m.topic);
  cabeceras.set('x-particion', String(m.partition));
  cabeceras.set('x-offset', String(m.offset));
  if (detalle) cabeceras.set('x-detalle', detalle.slice(0, LARGO_DETALLE));
  return cabeceras;
}

export class PublicadorDlt {
  private readonly productor: Producer<string, string, string, string>;

  constructor(brokers: string[], clientId: string) {
    this.productor = new Producer({
      clientId,
      bootstrapBrokers: brokers,
      serializers: stringSerializers,
      idempotent: true,
      acks: ProduceAcks.ALL,
      retries: 10,
      partitioner: compatibilityPartitioner,
      autocreateTopics: false,
    });
  }

  async desviar(m: Mensaje, grupo: string, motivo: MotivoDlt, detalle: string): Promise<string> {
    const topic = topicDlt(m.topic);
    const r = await this.productor.send({
      messages: [{ topic, key: m.key || undefined, value: m.value, headers: cabecerasDlt(m, grupo, motivo, detalle) }],
    });
    const destino = r.offsets?.[0];
    return destino ? `${topic}[${destino.partition}]@${destino.offset}` : topic;
  }

  async cerrar(): Promise<void> {
    await this.productor.close();
  }
}
