import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Procesador, Resultado } from '../consumidor-kafka';
import type { SobreEventoDto } from '../../kafka/dto/sobre-evento.dto';

const GRUPO = 'vidalstore-historial';

@Injectable()
export class HistorialNegocio implements Procesador<SobreEventoDto> {
  private readonly log = new Logger(GRUPO);

  constructor(private readonly base: DataSource) {}

  async procesar(e: SobreEventoDto): Promise<Resultado> {
    const licenciaId = e.datos?.licenciaId;
    if (!licenciaId) return 'ignorado';
    const juegoId = String(e.juegoId);

    return this.base.transaction(async (tx) => {
      const nuevo: unknown[] = await tx.query(
        `INSERT INTO eventos_procesados (grupo, evento_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING RETURNING evento_id`,
        [GRUPO, e.eventoId],
      );
      if (nuevo.length === 0) return 'duplicado';

      if (e.tipo === 'compra.realizada') {
        const precio = Number(e.datos?.precioPagadoClp ?? e.datos?.precio ?? 0);
        const [p] = await tx.query<{ semana: string }[]>(
          `INSERT INTO compras_vistas (licencia_id, semana, juego_id, precio_pagado, revocada)
           VALUES ($1, date_trunc('week', $2::timestamptz AT TIME ZONE 'America/Santiago')::date, $3, $4, false)
           ON CONFLICT (licencia_id) DO NOTHING RETURNING semana::text AS semana`,
          [licenciaId, e.emitidoEn, juegoId, precio],
        );
        if (!p) {
          this.log.warn(`compra ${licenciaId} ya registrada con otro evento: no suma`);
          return 'nuevo';
        }
        await tx.query(
          `INSERT INTO ventas_semana (semana, juego_id, unidades, monto_pagado, revocadas, monto_neto)
           VALUES ($1, $2, 1, $3, 0, $3)
           ON CONFLICT (semana, juego_id) DO UPDATE
             SET unidades = ventas_semana.unidades + 1,
                 monto_pagado = ventas_semana.monto_pagado + EXCLUDED.monto_pagado,
                 monto_neto = ventas_semana.monto_neto + EXCLUDED.monto_neto`,
          [p.semana, juegoId, precio],
        );
        return 'nuevo';
      }

      if (e.tipo === 'licencia.revocada') {
        const [p] = await tx.query<{ semana: string; juego_id: string; precio_pagado: string }[]>(
          `WITH revocada AS (
             UPDATE compras_vistas SET revocada = true WHERE licencia_id = $1 AND NOT revocada
             RETURNING semana::text AS semana, juego_id, precio_pagado)
           SELECT semana, juego_id, precio_pagado FROM revocada`,
          [licenciaId],
        );
        if (!p) {
          this.log.warn(`revocacion de licencia ${licenciaId} sin compra previa: no resta`);
          return 'nuevo';
        }
        const precio = Number(p.precio_pagado);
        await tx.query(
          `UPDATE ventas_semana SET revocadas = revocadas + 1, monto_neto = monto_neto - $3
            WHERE semana = $1 AND juego_id = $2`,
          [p.semana, p.juego_id, precio],
        );
        return 'nuevo';
      }

      return 'ignorado';
    });
  }
}
