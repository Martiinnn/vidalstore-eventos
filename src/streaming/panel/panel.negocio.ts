import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Procesador, Resultado } from '../consumidor-kafka';
import type { SobreEventoDto } from '../../kafka/dto/sobre-evento.dto';
import { minutoDe } from '../ventanas';

const CUENTAN = ['partida.iniciada', 'partida.terminada', 'compra.realizada'];

@Injectable()
export class PanelNegocio implements Procesador<SobreEventoDto> {
  constructor(private readonly base: DataSource) {}

  async procesar(e: SobreEventoDto): Promise<Resultado> {
    if (!CUENTAN.includes(e.tipo)) return 'ignorado';
    const monto = e.tipo === 'compra.realizada' ? Number(e.datos?.precioPagadoClp ?? e.datos?.precio ?? 0) : 0;
    const filas: unknown[] = await this.base.query(
      `INSERT INTO kpi_minuto (evento_id, minuto, juego_id, tipo, monto) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (evento_id) DO NOTHING RETURNING evento_id`,
      [e.eventoId, minutoDe(e.emitidoEn), String(e.juegoId), e.tipo, monto],
    );
    return filas.length === 1 ? 'nuevo' : 'duplicado';
  }
}
