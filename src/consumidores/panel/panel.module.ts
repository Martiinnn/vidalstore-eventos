import { Module } from '@nestjs/common';
import { PanelConsumer } from './panel.consumer';

@Module({
  providers: [PanelConsumer],
  exports: [PanelConsumer]
})
export class PanelModule {}
