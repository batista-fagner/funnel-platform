import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ig_automations')
export class InstagramAutomation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'post_id', type: 'varchar' })
  postId: string;

  @Column({ name: 'post_caption', type: 'text', nullable: true })
  postCaption?: string;

  @Column({ name: 'post_thumbnail', type: 'varchar', nullable: true })
  postThumbnail?: string;

  @Column({ name: 'post_permalink', type: 'varchar', nullable: true })
  postPermalink?: string;

  @Column({ name: 'keyword', type: 'varchar', default: 'eu quero' })
  keyword: string;

  @Column({ name: 'reply_message', type: 'text' })
  replyMessage: string;

  @Column({ name: 'comment_reply', type: 'text', nullable: true })
  commentReply?: string;

  @Column({ name: 'accept_any', type: 'boolean', default: false })
  acceptAny: boolean;

  @Column({ name: 'dm_button_label', type: 'varchar', nullable: true })
  dmButtonLabel?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'triggered_count', type: 'int', default: 0 })
  triggeredCount: number;

  @Column({ name: 'capture_confirmation', type: 'boolean', default: false })
  captureConfirmation: boolean;

  @Column({ name: 'confirmation_question', type: 'text', nullable: true })
  confirmationQuestion?: string;

  @Column({ name: 'capture_email', type: 'boolean', default: false })
  captureEmail: boolean;

  @Column({ name: 'email_question', type: 'text', nullable: true })
  emailQuestion?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
