import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { CarouselService } from './carousel.service';
import { SlideData } from './carousel.entity';

@Controller('carousel')
export class CarouselController {
  constructor(private readonly service: CarouselService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: { topic: string; tone: string; slideCount: number; instagramHandle?: string }) {
    return this.service.create(body);
  }

  @Patch(':id')
  updateSlides(@Param('id') id: string, @Body() body: { slides: SlideData[] }) {
    return this.service.updateSlides(id, body.slides);
  }

  @Post(':id/generate-image/:slideIndex')
  generateImage(@Param('id') id: string, @Param('slideIndex') slideIndex: string) {
    return this.service.generateImage(id, Number(slideIndex));
  }

  @Post(':id/generate-images')
  generateAllImages(@Param('id') id: string) {
    return this.service.generateAllImages(id);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
