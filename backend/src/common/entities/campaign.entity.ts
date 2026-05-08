import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'meta_campaign_id', type: 'varchar', nullable: true })
  metaCampaignId?: string;

  @Column({ name: 'status', type: 'varchar', default: 'ativa' })
  status: 'ativa' | 'pausada' | 'concluida';

  @Column({ name: 'daily_budget', type: 'decimal', nullable: true })
  dailyBudget?: number;

  @Column({ name: 'objective', type: 'varchar', nullable: true })
  objective?: string;

  @Column({ name: 'utm_campaign', type: 'varchar', nullable: true })
  utmCampaign?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
