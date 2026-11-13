import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alerta } from './alerta.entity';
import { VentanaPartidas } from './ventana-partidas.entity';
import { EventoProcesado } from '../evento-procesado.entity';
import { AlertasNegocio } from './alertas.negocio';
import { AlertasConsumidor } from './alertas.consumidor';

@Module({
  imports: [TypeOrmModule.forFeature([Alerta, VentanaPartidas, EventoProcesado])],
  providers: [AlertasNegocio, AlertasConsumidor],
  exports: [AlertasNegocio]
})
export class AlertasModule {}
