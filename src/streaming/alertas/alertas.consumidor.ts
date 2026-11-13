import { Injectable } from '@nestjs/common';
import { ConsumidorKafka } from '../consumidor-kafka';
import { SobreEventoDto } from '../../kafka/dto/sobre-evento.dto';
import { TOPICS } from '../../kafka/topologia';
import { AlertasNegocio } from './alertas.negocio';

@Injectable()
export class AlertasConsumidor extends ConsumidorKafka<SobreEventoDto> {
  constructor(alertas: AlertasNegocio) {
    super({ grupo: 'vidalstore-alertas', topics: [TOPICS.ACTIVIDAD], dto: SobreEventoDto }, alertas);
  }
}
