import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DaysService } from './days.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateActivityDto } from '../activities/dto/create-activity.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';

@Controller('days')
export class DaysController {
  constructor(
    private readonly days: DaysService,
    private readonly activities: ActivitiesService,
  ) {}

  @Get(':id')
  get(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.days.get(id, user.id);
  }

  @Post(':id/activities')
  createActivity(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activities.create(id, dto, user.id);
  }
}
