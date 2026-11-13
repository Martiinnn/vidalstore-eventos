const MINUTO_MS = 60_000;

export const minutoDe = (emitidoEn: string): string =>
  new Date(Math.floor(Date.parse(emitidoEn) / MINUTO_MS) * MINUTO_MS).toISOString();

export const ventanaDe5MinutosDe = (emitidoEn: string): string =>
  new Date(Math.floor(Date.parse(emitidoEn) / (5 * MINUTO_MS)) * 5 * MINUTO_MS).toISOString();
