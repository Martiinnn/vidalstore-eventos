import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { PanelEnVivoService } from './panel-en-vivo.service';

@Controller('panel')
export class PanelEnVivoController {
  constructor(private readonly panel: PanelEnVivoService) {}

  @Get('en-vivo')
  enVivo(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.trim()) {
      throw new UnauthorizedException('Credenciales requeridas para consultar metricas del panel en vivo');
    }
    return this.panel.enVivo();
  }
}
