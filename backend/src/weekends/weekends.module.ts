import { Module } from '@nestjs/common';
import { WeekendsController } from './weekends.controller';
import { WeekendsService } from './weekends.service';

@Module({
  controllers: [WeekendsController],
  providers: [WeekendsService],
})
export class WeekendsModule {}
