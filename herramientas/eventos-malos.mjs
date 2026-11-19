import { randomUUID } from 'node:crypto';
import { Producer, ProduceAcks, compatibilityPartitioner, stringSerializers } from '@platformatic/kafka';

const cual = process.argv[2] ?? 'compras';
if (!['compras', 'actividad'].includes(cual)) {
  console.error('uso: node herramientas/eventos-malos.mjs [compras|actividad]');
  process.exit(1);
}
const topic = `vidalstore.${cual}`;
const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092,localhost:9094,localhost:9096').split(',');

const usuarioSub = 'a4c8e1f2-3b5d-4a7e-9c01-2f6b8d4e5a90';
const juegoId = '292030';
const bueno = () => ({
  eventoId: randomUUID(),
  tipo: cual === 'compras' ? 'compra.realizada' : 'partida.iniciada',
  version: 1,
  emitidoEn: new Date().toISOString(),
  juegoId,
  usuarioSub,
  datos: cual === 'compras' ? { compraId: `prueba-e3-${Date.now()}`, monto: 29990 } : { sesionId: randomUUID(), modo: 'campaña' },
});

const sinEventoId = bueno();
delete sinEventoId.eventoId;
const repetido = bueno();

const casos = [
  ['JSON cortado a la mitad', JSON.stringify(bueno()).slice(0, 80), 'json-invalido'],
  ['sin eventoId', JSON.stringify(sinEventoId), 'falta-eventoId'],
  ['version 99', JSON.stringify({ ...bueno(), version: 99 }), 'version-desconocida'],
  ['eventoId que no es uuid', JSON.stringify({ ...bueno(), eventoId: 'no-soy-un-uuid' }), 'dto-invalido'],
  ['valido', JSON.stringify(repetido), 'no va al .dlt'],
  ['el mismo otra vez (duplicado)', JSON.stringify(repetido), 'no va al .dlt'],
];

const productor = new Producer({
  clientId: 'vidalstore-eventos-malos',
  bootstrapBrokers: brokers,
  serializers: stringSerializers,
  idempotent: true,
  acks: ProduceAcks.ALL,
  partitioner: compatibilityPartitioner,
  autocreateTopics: false,
});

try {
  for (const [que, value, esperado] of casos) {
    const evento = (() => {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    })();
    const headers = { 'content-type': 'application/json', 'x-prueba': 'eventos-malos' };
    if (evento.eventoId) headers['x-evento-id'] = evento.eventoId;
    const r = await productor.send({
      messages: [{ topic, key: cual === 'compras' ? usuarioSub : juegoId, value, headers }],
    });
    const o = r.offsets?.[0];
    console.log(`${topic}[${o?.partition}]@${o?.offset}  ${que.padEnd(30)} -> ${esperado}`);
  }
  console.log(`listo: 6 mensajes en ${topic}. Mira ${topic}.dlt (4 por cada grupo que lee ${topic}).`);
} finally {
  await productor.close();
}
