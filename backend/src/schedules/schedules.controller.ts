import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.schedules.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthedUser, @Body() dto: CreateScheduleDto) {
    return this.schedules.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.schedules.get(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedules.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.schedules.remove(id, user.id);
  }

  @Post(':id/share')
  share(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.schedules.createShare(id, user.id);
  }

  @Delete(':id/share')
  revokeShare(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.schedules.revokeShare(id, user.id);
  }
}
