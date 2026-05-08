import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type LeadClassification = 'otimo' | 'bom' | 'frio';
export type LeadStatus = 'novo' | 'contatado' | 'convertido' | 'perdido';
export type WaStage = 'abertura' | 'escuta' | 'rapport' | 'video' | 'fechamento' | 'confirmado' | 'perdido' | 'encerrado';

export interface Post {
  code: string;
  caption: string;
  takenAt: number;
  imageUrl: string;
  commentCount?: number;
  likeCount?: number;
}

export interface EnrichmentData {
  followers?: number;
  engagement_rate?: number;
  content_type?: string;
  recent_stories?: string[];
  enrichment_bonus?: number;
  posts?: Post[];
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId?: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'email', type: 'varchar', unique: true, nullable: true })
  email?: string;

  @Column({ name: 'phone', type: 'varchar', unique: true })
  phone: string;

  @Column({ name: 'instagram', type: 'varchar', nullable: true })
  instagram?: string;

  @Column({ name: 'revenue_range', type: 'varchar', nullable: true })
  revenueRange?: string;

  @Column({ name: 'score', type: 'int', default: 0 })
  score: number;

  @Column({ name: 'classification', type: 'varchar', default: 'frio' })
  classification: LeadClassification;

  @Column({ name: 'status', type: 'varchar', default: 'novo' })
  status: LeadStatus;

  @Column({ name: 'utm_source', type: 'varchar', nullable: true })
  utmSource?: string;

  @Column({ name: 'utm_medium', type: 'varchar', nullable: true })
  utmMedium?: string;

  @Column({ name: 'utm_campaign', type: 'varchar', nullable: true })
  utmCampaign?: string;

  @Column({ name: 'utm_content', type: 'varchar', nullable: true })
  utmContent?: string;

  @Column({ name: 'fbclid', type: 'varchar', nullable: true })
  fbclid?: string;

  @Column({ name: 'click_id', type: 'varchar', nullable: true })
  clickId?: string;

  @Column({ name: 'vsl_percentage', type: 'int', default: 0 })
  vslPercentage: number;

  @Column({ name: 'enrichment_data', type: 'jsonb', nullable: true })
  enrichmentData?: EnrichmentData;

  @Column({ name: 'ai_insight', type: 'jsonb', nullable: true })
  aiInsight?: any;

  @Column({ name: 'last_event_at', type: 'timestamp', nullable: true })
  lastEventAt?: Date;

  @Column({ name: 'wa_stage', type: 'varchar', nullable: true })
  waStage?: WaStage;

  @Column({ name: 'ai_context', type: 'jsonb', nullable: true })
  aiContext?: any[];

  @Column({ name: 'wa_last_message_at', type: 'timestamp', nullable: true })
  waLastMessageAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
