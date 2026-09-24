import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WeekendsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.trainingModule.findMany({
      where: { ownerId: userId },
      orderBy: [{ weekendNumber: 'asc' }],
      include: {
        training: true,
        days: { orderBy: { date: 'asc' } },
      },
    });
  }

  async get(id: string, userId: string) {
    const module = await this.prisma.trainingModule.findUnique({
      where: { id },
      include: {
        training: true,
        days: {
          orderBy: { date: 'asc' },
          include: {
            activities: { orderBy: { startMinutes: 'asc' } },
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException(`Module ${id} not found`);
    }
    if (module.ownerId !== userId) {
      throw new ForbiddenException('Not your schedule');
    }

    return module;
  }
}
