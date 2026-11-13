import { Module } from '@nestjs/common';
import { PanelModule } from './panel/panel.module';
import { AlertasModule } from './alertas/alertas.module';
import { HistorialModule } from './historial/historial.module';

@Module({
  imports: [PanelModule, AlertasModule, HistorialModule],
  exports: [PanelModule, AlertasModule, HistorialModule]
})
export class StreamingModule {}
