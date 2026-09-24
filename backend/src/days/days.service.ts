import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../schedules/ownership.service';

@Injectable()
export class DaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async get(id: string, userId: string) {
    await this.ownership.assertDayOwner(id, userId);
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
