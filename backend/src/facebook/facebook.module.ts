import { Module } from '@nestjs/common';
import { FacebookService } from './facebook.service';
import { FacebookController } from './facebook.controller';

@Module({
  providers: [FacebookService],
  controllers: [FacebookController],
  exports: [FacebookService],
})
export class FacebookModule {}
