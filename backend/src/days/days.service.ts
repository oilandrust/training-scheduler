import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DaysService {
  constructor(private readonly prisma: PrismaService) {}

  async get(id: string) {
    const day = await this.prisma.day.findUnique({
      where: { id },
      include: {
        module: { include: { training: true } },
        activities: { orderBy: { startMinutes: 'asc' } },
      },
    });

    if (!day) {
      throw new NotFoundException(`Day ${id} not found`);
    }

    return day;
  }
}
