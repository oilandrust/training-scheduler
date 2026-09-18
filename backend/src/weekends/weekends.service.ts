import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WeekendsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.trainingModule.findMany({
      orderBy: [{ weekendNumber: 'asc' }],
      include: {
        training: true,
        days: { orderBy: { date: 'asc' } },
      },
    });
  }

  async get(id: string) {
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

    return module;
  }
}
