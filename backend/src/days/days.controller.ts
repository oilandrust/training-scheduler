import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DaysService } from './days.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateActivityDto } from '../activities/dto/create-activity.dto';

@Controller('days')
export class DaysController {
  constructor(
    private readonly days: DaysService,
    private readonly activities: ActivitiesService,
  ) {}

  @Get(':id')
  get(@Param('id') id: string) {
    return this.days.get(id);
  }

  @Post(':id/activities')
  createActivity(@Param('id') id: string, @Body() dto: CreateActivityDto) {
    return this.activities.create(id, dto);
  }
}
