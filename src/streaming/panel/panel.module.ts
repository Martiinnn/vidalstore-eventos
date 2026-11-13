import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KpiMinuto } from './kpi-minuto.entity';
import { PanelNegocio } from './panel.negocio';
import { PanelConsumidor } from './panel.consumidor';
import { PanelEnVivoService } from './panel-en-vivo.service';
import { PanelEnVivoController } from './panel-en-vivo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KpiMinuto])],
  controllers: [PanelEnVivoController],
  providers: [PanelNegocio, PanelConsumidor, PanelEnVivoService],
  exports: [PanelNegocio, PanelEnVivoService]
})
export class PanelModule {}
