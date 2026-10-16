import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index
} from 'typeorm';

@Entity('eventos_auditoria')
@Index(['routingKey', 'recibidoEn'])
export class EventoAuditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'routing_key', type: 'varchar', length: 100 })
  routingKey: string;

  @Column({ name: 'evento_id', type: 'varchar', length: 100, unique: true })
  eventoId: string;

  @Column({ name: 'usuario_sub', type: 'varchar', length: 100, nullable: true })
  usuarioSub?: string | null;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ name: 'emitido_en', type: 'timestamptz', nullable: true })
  emitidoEn?: Date | null;

  @CreateDateColumn({ name: 'recibido_en', type: 'timestamptz' })
  recibidoEn: Date;
}
