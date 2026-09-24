import { Module } from '@nestjs/common';
import { DaysController } from './days.controller';
import { DaysService } from './days.service';
import { ActivitiesModule } from '../activities/activities.module';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  imports: [ActivitiesModule, SchedulesModule],
  controllers: [DaysController],
  providers: [DaysService],
})
export class DaysModule {}
