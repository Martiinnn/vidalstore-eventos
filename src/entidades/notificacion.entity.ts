import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Check
} from 'typeorm';

@Entity('notificaciones')
@Check(`"estado" IN ('enviada', 'fallida')`)
export class Notificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  para: string;

  @Column({ type: 'varchar', length: 255 })
  asunto: string;

  @Column({ type: 'varchar', length: 20 })
  estado: string;

  @Column({ name: 'evento_id', type: 'varchar', length: 100, nullable: true })
  eventoId?: string | null;

  @CreateDateColumn({ name: 'creada_en', type: 'timestamptz' })
  creadaEn: Date;
}
