import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventoAuditoria, Notificacion, MensajeMuerto } from './entidades';
import { KpiMinuto } from './streaming/panel/kpi-minuto.entity';
import { EventoProcesado } from './streaming/evento-procesado.entity';
import { VentanaPartidas } from './streaming/alertas/ventana-partidas.entity';
import { Alerta } from './streaming/alertas/alerta.entity';
import { CompraVista } from './streaming/historial/compra-vista.entity';
import { VentaSemana } from './streaming/historial/venta-semana.entity';
import { MensajeriaModule } from './mensajeria/mensajeria.module';
import { AuditoriaModule } from './consumidores/auditoria/auditoria.module';
import { AvisosModule } from './consumidores/avisos/avisos.module';
import { CorreosModule } from './consumidores/correos/correos.module';
import { MensajesMuertosModule } from './consumidores/mensajes-muertos/mensajes-muertos.module';
import { StreamingModule } from './streaming/streaming.module';
import { SaludModule } from './salud/salud.module';

const ENTIDADES = [
  EventoAuditoria,
  Notificacion,
  MensajeMuerto,
  KpiMinuto,
  EventoProcesado,
  VentanaPartidas,
  Alerta,
  CompraVista,
  VentaSemana
];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || `postgresql://${process.env.POSTGRES_USER || 'vidalstore'}:${process.env.POSTGRES_PASSWORD || 'vidalstore_pass_2026'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'vidalstore'}`,
      entities: ENTIDADES,
      synchronize: true
    }),
    TypeOrmModule.forFeature(ENTIDADES),
    MensajeriaModule,
    AuditoriaModule,
    AvisosModule,
    CorreosModule,
    MensajesMuertosModule,
    StreamingModule,
    SaludModule
  ],
  exports: [TypeOrmModule]
})
export class AppModule {}
