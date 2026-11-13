import { Controller, Get } from '@nestjs/common';
import { PanelEnVivoService } from './panel-en-vivo.service';

@Controller('panel')
export class PanelEnVivoController {
  constructor(private readonly panel: PanelEnVivoService) {}

  @Get('en-vivo')
  enVivo() {
    return this.panel.enVivo();
  }
}
