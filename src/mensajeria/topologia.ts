export const EXCHANGES = {
  EVENTOS: {
    NOMBRE: 'vidalstore.eventos',
    TIPO: 'topic',
    OPCIONES: { durable: true }
  },
  COMANDOS: {
    NOMBRE: 'vidalstore.comandos',
    TIPO: 'direct',
    OPCIONES: { durable: true }
  },
  DLX: {
    NOMBRE: 'vidalstore.dlx',
    TIPO: 'direct',
    OPCIONES: { durable: true }
  }
} as const;

export const COLAS = {
  AVISOS: 'cola.avisos',
  AUDITORIA: 'cola.auditoria',
  CORREOS: 'cola.correos',
  DLQ_AVISOS: 'dlq.avisos',
  DLQ_AUDITORIA: 'dlq.auditoria',
  DLQ_CORREOS: 'dlq.correos'
} as const;

export const ROUTING_KEYS = {
  COMPRA_REALIZADA: 'compra.realizada',
  LICENCIA_REVOCADA: 'licencia.revocada',
  JUEGO_PUBLICADO: 'juego.publicado',
  CORREO_ENVIAR: 'correo.enviar',
  AUDITORIA_TODO: '#'
} as const;
