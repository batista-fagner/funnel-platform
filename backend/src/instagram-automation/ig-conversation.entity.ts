import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ig_conversations')
export class IgConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_ig_id', type: 'varchar' })
  senderIgId: string;

  @Column({ name: 'ig_username', type: 'varchar', nullable: true })
  igUsername?: string;

  @Column({ name: 'automation_id', type: 'uuid' })
  automationId: string;

  @Column({ name: 'step', type: 'varchar', default: 'waiting_email' })
  step: string; // 'waiting_email' | 'completed'

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
