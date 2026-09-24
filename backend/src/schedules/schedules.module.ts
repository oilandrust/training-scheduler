import { Module } from '@nestjs/common';
import { OwnershipService } from './ownership.service';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  controllers: [SchedulesController],
  providers: [SchedulesService, OwnershipService],
  exports: [SchedulesService, OwnershipService],
})
export class SchedulesModule {}
