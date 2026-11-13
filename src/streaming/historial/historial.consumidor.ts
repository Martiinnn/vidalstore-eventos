import { Injectable } from '@nestjs/common';
import { ConsumidorKafka } from '../consumidor-kafka';
import { SobreEventoDto } from '../../kafka/dto/sobre-evento.dto';
import { TOPICS } from '../../kafka/topologia';
import { HistorialNegocio } from './historial.negocio';

@Injectable()
export class HistorialConsumidor extends ConsumidorKafka<SobreEventoDto> {
  constructor(historial: HistorialNegocio) {
    super({ grupo: 'vidalstore-historial', topics: [TOPICS.COMPRAS], dto: SobreEventoDto }, historial);
  }
}
