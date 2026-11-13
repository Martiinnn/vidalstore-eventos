import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'ventanas_partidas' })
export class VentanaPartidas {
  @PrimaryColumn({ name: 'juego_id', type: 'text' })
  juegoId!: string;

  @PrimaryColumn({ type: 'timestamptz' })
  ventana!: Date;

  @Column({ type: 'int', default: 0 })
  terminadas!: number;

  @Column({ name: 'en_error', type: 'int', default: 0 })
  enError!: number;
}
