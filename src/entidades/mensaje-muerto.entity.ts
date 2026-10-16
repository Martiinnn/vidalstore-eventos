import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn
} from 'typeorm';

@Entity('mensajes_muertos')
export class MensajeMuerto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cola_origen', type: 'varchar', length: 100 })
  colaOrigen: string;

  @Column({ name: 'routing_key', type: 'varchar', length: 100 })
  routingKey: string;

  @Column({ type: 'varchar', length: 100 })
  motivo: string;

  @Column({ type: 'integer', default: 1 })
  intentos: number;

  @Column({ type: 'text' })
  payload: string;

  @CreateDateColumn({ name: 'recibido_en', type: 'timestamptz' })
  recibidoEn: Date;
}
