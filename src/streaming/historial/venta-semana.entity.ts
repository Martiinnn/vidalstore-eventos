import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'ventas_semana' })
export class VentaSemana {
  @PrimaryColumn({ type: 'date' })
  semana!: string;

  @PrimaryColumn({ name: 'juego_id', type: 'text' })
  juegoId!: string;

  @Column({ type: 'int', default: 0 })
  unidades!: number;

  @Column({ name: 'monto_pagado', type: 'numeric', default: 0 })
  montoPagado!: number;

  @Column({ type: 'int', default: 0 })
  revocadas!: number;

  @Column({ name: 'monto_neto', type: 'numeric', default: 0 })
  montoNeto!: number;
}
