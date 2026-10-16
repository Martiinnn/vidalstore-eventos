import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || `postgresql://${process.env.POSTGRES_USER || 'vidalstore'}:${process.env.POSTGRES_PASSWORD || 'vidalstore_pass_2026'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'vidalstore'}`,
      autoLoadEntities: true,
      synchronize: true
    })
  ]
})
export class AppModule {}
