import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MINIMO_TERMINADAS, UMBRAL_ERROR } from '../alertas/alertas.negocio';

const ZONA = 'America/Santiago';

type FilaMinuto = { minuto: Date; hora: string; iniciadas: number; terminadas: number; en_curso: number; compras: number; total_clp: number };
type FilaJuego = { juego_id: string; en_curso: number; compras: number; total_clp: number };
type FilaAlerta = { juego_id: string; desde: string; hasta: string; terminadas: number; en_error: number };

@Injectable()
export class PanelEnVivoService {
  constructor(private readonly base: DataSource) {}

  async enVivo() {
    const [minutos, juegos, alertas] = await Promise.all([
      this.base.query<FilaMinuto[]>(
        `SELECT minuto, to_char(minuto AT TIME ZONE '${ZONA}', 'HH24:MI') AS hora,
                iniciadas, terminadas, compras, total_clp,
                sum(iniciadas - terminadas) OVER (ORDER BY minuto)::int AS en_curso
           FROM (SELECT minuto,
                        count(*) FILTER (WHERE tipo = 'partida.iniciada')::int  AS iniciadas,
                        count(*) FILTER (WHERE tipo = 'partida.terminada')::int AS terminadas,
                        count(*) FILTER (WHERE tipo = 'compra.realizada')::int   AS compras,
                        coalesce(sum(monto) FILTER (WHERE tipo = 'compra.realizada'), 0)::numeric AS total_clp
                   FROM kpi_minuto GROUP BY minuto) AS m
          ORDER BY minuto`,
      ),
      this.base.query<FilaJuego[]>(
        `SELECT k.juego_id,
                (count(*) FILTER (WHERE k.tipo = 'partida.iniciada') - count(*) FILTER (WHERE k.tipo = 'partida.terminada'))::int AS en_curso,
                count(*) FILTER (WHERE k.tipo = 'compra.realizada')::int AS compras,
                coalesce(sum(k.monto) FILTER (WHERE k.tipo = 'compra.realizada'), 0)::numeric AS total_clp
           FROM kpi_minuto k
          GROUP BY k.juego_id
          ORDER BY en_curso DESC, compras DESC, k.juego_id`,
      ),
      this.base.query<FilaAlerta[]>(
        `SELECT a.juego_id, a.terminadas, a.en_error,
                to_char(a.ventana AT TIME ZONE '${ZONA}', 'HH24:MI') AS desde,
                to_char((a.ventana + interval '5 minutes') AT TIME ZONE '${ZONA}', 'HH24:MI') AS hasta
           FROM alertas a
          ORDER BY a.ventana, a.juego_id`,
      ),
    ]);

    const ultimo = minutos.at(-1);
    const maximo = minutos.reduce<FilaMinuto | undefined>((max, m) => (!max || m.en_curso > max.en_curso ? m : max), undefined);

    return {
      zonaHoraria: ZONA,
      generadoEn: new Date().toISOString(),
      hasta: ultimo ? ultimo.hora : null,
      totales: {
        partidasIniciadas: minutos.reduce((s, m) => s + m.iniciadas, 0),
        partidasTerminadas: minutos.reduce((s, m) => s + m.terminadas, 0),
        partidasEnCurso: ultimo?.en_curso ?? 0,
        compras: minutos.reduce((s, m) => s + m.compras, 0),
        montoClp: minutos.reduce((s, m) => s + Number(m.total_clp), 0),
      },
      maximoEnCurso: maximo ? { hora: maximo.hora, partidas: maximo.en_curso } : null,
      porMinuto: minutos.map((m) => ({
        minuto: m.minuto,
        hora: m.hora,
        iniciadas: m.iniciadas,
        terminadas: m.terminadas,
        enCurso: m.en_curso,
        compras: m.compras,
        totalClp: Number(m.total_clp),
      })),
      porJuego: juegos.map((j) => ({
        juegoId: j.juego_id,
        enCurso: j.en_curso,
        compras: j.compras,
        totalClp: Number(j.total_clp),
      })),
      regla: { umbralError: UMBRAL_ERROR, minimoTerminadas: MINIMO_TERMINADAS, ventanaMinutos: 5 },
      alertas: alertas.map((a) => ({
        juegoId: a.juego_id,
        desde: a.desde,
        hasta: a.hasta,
        terminadas: a.terminadas,
        enError: a.en_error,
        porcentaje: Math.round((1000 * a.en_error) / a.terminadas) / 10,
      })),
    };
  }
}
