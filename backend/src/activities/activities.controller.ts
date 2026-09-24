import { Body, Controller, Delete, Param, Patch } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Patch(':id')
  update(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activities.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.activities.remove(id, user.id);
  }
}
