import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { WeekendsService } from './weekends.service';

@Controller('modules')
export class WeekendsController {
  constructor(private readonly weekends: WeekendsService) {}

  @Get()
  list(@CurrentUser() user: AuthedUser) {
    return this.weekends.list(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    return this.weekends.get(id, user.id);
  }
}
