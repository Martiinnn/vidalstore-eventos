import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentaSemana } from './venta-semana.entity';
import { CompraVista } from './compra-vista.entity';
import { EventoProcesado } from '../evento-procesado.entity';
import { HistorialNegocio } from './historial.negocio';
import { HistorialConsumidor } from './historial.consumidor';

@Module({
  imports: [TypeOrmModule.forFeature([VentaSemana, CompraVista, EventoProcesado])],
  providers: [HistorialNegocio, HistorialConsumidor],
  exports: [HistorialNegocio]
})
export class HistorialModule {}
