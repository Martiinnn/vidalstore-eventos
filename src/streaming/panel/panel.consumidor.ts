import { Injectable } from '@nestjs/common';
import { ConsumidorKafka } from '../consumidor-kafka';
import { SobreEventoDto } from '../../kafka/dto/sobre-evento.dto';
import { TOPICS } from '../../kafka/topologia';
import { PanelNegocio } from './panel.negocio';

@Injectable()
export class PanelConsumidor extends ConsumidorKafka<SobreEventoDto> {
  constructor(panel: PanelNegocio) {
    super({ grupo: 'vidalstore-panel', topics: [TOPICS.ACTIVIDAD, TOPICS.COMPRAS], dto: SobreEventoDto }, panel);
  }
}
