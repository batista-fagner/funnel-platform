import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'checkbox' | 'textarea';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId?: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'fields', type: 'jsonb' })
  fields: FormField[];

  @Column({ name: 'thank_you_url', type: 'varchar', nullable: true })
  thankYouUrl?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
