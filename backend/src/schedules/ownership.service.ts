import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async assertModuleOwner(moduleId: string, userId: string) {
    const module = await this.prisma.trainingModule.findUnique({
      where: { id: moduleId },
      select: { id: true, ownerId: true },
    });
    if (!module) throw new NotFoundException(`Schedule ${moduleId} not found`);
    if (module.ownerId !== userId) throw new ForbiddenException('Not your schedule');
    return module;
  }

  async assertDayOwner(dayId: string, userId: string) {
    const day = await this.prisma.day.findUnique({
      where: { id: dayId },
      select: { id: true, module: { select: { ownerId: true } } },
    });
    if (!day) throw new NotFoundException(`Day ${dayId} not found`);
    if (day.module.ownerId !== userId) throw new ForbiddenException('Not your schedule');
    return day;
  }

  async assertActivityOwner(activityId: string, userId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, day: { select: { module: { select: { ownerId: true } } } } },
    });
    if (!activity) throw new NotFoundException(`Activity ${activityId} not found`);
    if (activity.day.module.ownerId !== userId) throw new ForbiddenException('Not your schedule');
    return activity;
  }
}
