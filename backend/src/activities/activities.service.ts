import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OwnershipService } from '../schedules/ownership.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  async create(dayId: string, dto: CreateActivityDto, userId: string) {
    await this.ownership.assertDayOwner(dayId, userId);
    const day = await this.prisma.day.findUnique({ where: { id: dayId } });
    if (!day) {
      throw new NotFoundException(`Day ${dayId} not found`);
    }
    this.assertTimeRange(dto.startMinutes, dto.endMinutes);

    return this.prisma.activity.create({
      data: {
        dayId,
        title: dto.title.trim(),
        startMinutes: dto.startMinutes,
        endMinutes: dto.endMinutes,
        kind: dto.kind,
        room: dto.room,
        facilitator: dto.facilitator,
        breakoutNotes: dto.breakoutNotes,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: UpdateActivityDto, userId: string) {
    await this.ownership.assertActivityOwner(id, userId);
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Activity ${id} not found`);
    }

    const startMinutes = dto.startMinutes ?? existing.startMinutes;
    const endMinutes = dto.endMinutes ?? existing.endMinutes;
    this.assertTimeRange(startMinutes, endMinutes);

    return this.prisma.activity.update({
      where: { id },
      data: {
        ...dto,
        title: dto.title?.trim(),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.ownership.assertActivityOwner(id, userId);
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Activity ${id} not found`);
    }
    await this.prisma.activity.delete({ where: { id } });
    return { ok: true };
  }

  private assertTimeRange(startMinutes: number, endMinutes: number) {
    if (endMinutes <= startMinutes) {
      throw new BadRequestException('End time must be after start time');
    }
  }
}
