import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'compras_vistas' })
export class CompraVista {
  @PrimaryColumn({ name: 'licencia_id', type: 'text' })
  licenciaId!: string;

  @Column({ type: 'date' })
  semana!: string;

  @Column({ name: 'juego_id', type: 'text' })
  juegoId!: string;

  @Column({ name: 'precio_pagado', type: 'numeric' })
  precioPagado!: number;

  @Column({ type: 'boolean', default: false })
  revocada!: boolean;
}
