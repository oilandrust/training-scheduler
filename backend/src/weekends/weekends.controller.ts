import { Controller, Get, Param } from '@nestjs/common';
import { WeekendsService } from './weekends.service';

@Controller('modules')
export class WeekendsController {
  constructor(private readonly weekends: WeekendsService) {}

  @Get()
  list() {
    return this.weekends.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.weekends.get(id);
  }
}
