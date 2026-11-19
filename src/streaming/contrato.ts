import type { Message } from '@platformatic/kafka';
import { plainToInstance } from 'class-transformer';
import { validateSync, type ValidationError } from 'class-validator';

export type Mensaje = Message<string, string, string, string>;

export type MotivoInvalido = 'json-invalido' | `falta-${string}` | 'version-desconocida' | 'dto-invalido';

export class EventoInvalido extends Error {
  constructor(
    readonly motivo: MotivoInvalido,
    detalle: string,
  ) {
    super(detalle);
  }
}

export class Contrato<T extends object> {
  constructor(private readonly dto: new () => T) {}

  validar(m: Mensaje): T {
    let crudo: unknown;
    try {
      crudo = JSON.parse(m.value);
    } catch (error) {
      throw new EventoInvalido('json-invalido', `no es un JSON de evento (${(error as Error).message})`);
    }
    if (crudo === null || typeof crudo !== 'object' || Array.isArray(crudo)) {
      throw new EventoInvalido('dto-invalido', 'el value es JSON, pero no es un objeto');
    }
    const evento = plainToInstance(this.dto, crudo);
    const errores = validateSync(evento, { whitelist: true, forbidNonWhitelisted: true });
    if (errores.length === 0) return evento;

    const detalle = motivos(errores).join('; ');
    const faltante = errores.find((e) => e.value === undefined || e.value === null);
    if (faltante) throw new EventoInvalido(`falta-${faltante.property}`, detalle);
    if (errores.some((e) => e.property === 'version')) throw new EventoInvalido('version-desconocida', detalle);
    throw new EventoInvalido('dto-invalido', detalle);
  }
}

function motivos(errores: ValidationError[], ruta = ''): string[] {
  return errores.flatMap((e) => [
    ...(e.constraints ? [`${ruta}${e.property} (${Object.keys(e.constraints).join(', ')})`] : []),
    ...motivos(e.children ?? [], `${ruta}${e.property}.`),
  ]);
}
