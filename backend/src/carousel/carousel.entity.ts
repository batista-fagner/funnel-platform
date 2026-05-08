import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type CarouselStatus = 'draft' | 'text_ready' | 'images_ready' | 'published';

export interface SlideData {
  index: number;
  text: string;
  imagePrompt: string;
  imageUrl: string | null;
  imageStatus: 'pending' | 'generating' | 'done' | 'error';
  finalSlideUrl: string | null;
}

@Entity('carousels')
export class Carousel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  topic: string;

  @Column({ type: 'varchar' })
  tone: string;

  @Column({ name: 'slide_count', type: 'int' })
  slideCount: number;

  @Column({ type: 'varchar', default: 'draft' })
  status: CarouselStatus;

  @Column({ name: 'instagram_handle', type: 'varchar', nullable: true })
  instagramHandle: string | null;

  @Column({ type: 'jsonb', default: [] })
  slides: SlideData[];

  @Column({ name: 'ig_media_id', type: 'varchar', nullable: true })
  igMediaId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
