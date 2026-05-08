import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carousel } from './carousel.entity';
import { CarouselService } from './carousel.service';
import { CarouselController } from './carousel.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Carousel])],
  providers: [CarouselService],
  controllers: [CarouselController],
})
export class CarouselModule {}
