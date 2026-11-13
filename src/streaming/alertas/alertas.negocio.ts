import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Procesador, Resultado } from '../consumidor-kafka';
import type { SobreEventoDto } from '../../kafka/dto/sobre-evento.dto';
import { ventanaDe5MinutosDe } from '../ventanas';

export const UMBRAL_ERROR = 0.2;
export const MINIMO_TERMINADAS = 3;

const GRUPO = 'vidalstore-alertas';

@Injectable()
export class AlertasNegocio implements Procesador<SobreEventoDto> {
  constructor(private readonly base: DataSource) {}

  async procesar(e: SobreEventoDto): Promise<Resultado> {
    if (e.tipo !== 'partida.terminada') return 'ignorado';
    const enError = e.datos?.resultado === 'error' ? 1 : 0;
    const ventana = ventanaDe5MinutosDe(e.emitidoEn);
    const juegoId = String(e.juegoId);

    return this.base.transaction(async (tx) => {
      const nuevo: unknown[] = await tx.query(
        `INSERT INTO eventos_procesados (grupo, evento_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING RETURNING evento_id`,
        [GRUPO, e.eventoId],
      );
      if (nuevo.length === 0) return 'duplicado';

      const [v] = await tx.query<{ terminadas: number; en_error: number }[]>(
        `INSERT INTO ventanas_partidas (juego_id, ventana, terminadas, en_error) VALUES ($1, $2, 1, $3)
         ON CONFLICT (juego_id, ventana) DO UPDATE
           SET terminadas = ventanas_partidas.terminadas + 1, en_error = ventanas_partidas.en_error + EXCLUDED.en_error
         RETURNING terminadas, en_error`,
        [juegoId, ventana, enError],
      );

      if (v.terminadas >= MINIMO_TERMINADAS && v.en_error > UMBRAL_ERROR * v.terminadas) {
        await tx.query(
          `INSERT INTO alertas (juego_id, ventana, terminadas, en_error, actualizada_en) VALUES ($1, $2, $3, $4, now())
           ON CONFLICT (juego_id, ventana) DO UPDATE
             SET terminadas = EXCLUDED.terminadas, en_error = EXCLUDED.en_error, actualizada_en = now()`,
          [juegoId, ventana, v.terminadas, v.en_error],
        );
      } else {
        await tx.query(`DELETE FROM alertas WHERE juego_id = $1 AND ventana = $2`, [juegoId, ventana]);
      }
      return 'nuevo';
    });
  }
}
