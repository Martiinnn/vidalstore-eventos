import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { MensajeriaService } from '../mensajeria/mensajeria.service';

@Controller('salud')
export class SaludController {
  constructor(
    private readonly mensajeriaService: MensajeriaService,
    private readonly dataSource: DataSource
  ) {}

  @Get()
  async obtenerSalud(@Res() res: Response) {
    const brokerConectado = this.mensajeriaService.estaConectado();
    let postgresConectado = false;

    try {
      await this.dataSource.query('SELECT 1');
      postgresConectado = true;
    } catch {
      postgresConectado = false;
    }

    const sano = brokerConectado && postgresConectado;
    const statusCode = sano ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json({
      estado: sano ? 'ok' : 'degradado',
      broker: brokerConectado ? 'conectado' : 'desconectado',
      postgres: postgresConectado ? 'conectado' : 'desconectado',
      fecha: new Date().toISOString()
    });
  }
}
