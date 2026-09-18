import { Body, Controller, Delete, Param, Patch } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activities.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.activities.remove(id);
  }
}
