import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventoAuditoria, Notificacion, MensajeMuerto } from './entidades';
import { MensajeriaModule } from './mensajeria/mensajeria.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || `postgresql://${process.env.POSTGRES_USER || 'vidalstore'}:${process.env.POSTGRES_PASSWORD || 'vidalstore_pass_2026'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'vidalstore'}`,
      entities: [EventoAuditoria, Notificacion, MensajeMuerto],
      synchronize: true
    }),
    TypeOrmModule.forFeature([EventoAuditoria, Notificacion, MensajeMuerto]),
    MensajeriaModule
  ],
  exports: [TypeOrmModule]
})
export class AppModule {}
