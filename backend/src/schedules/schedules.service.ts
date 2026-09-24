import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { OwnershipService } from './ownership.service';
import { eachUtcDate, parseDateOnly, weekdayName } from './dates';

const moduleInclude = {
  training: true,
  days: {
    orderBy: { date: 'asc' as const },
    include: {
      activities: { orderBy: { startMinutes: 'asc' as const } },
    },
  },
};

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
    private readonly config: ConfigService,
  ) {}

  async list(userId: string) {
    const modules = await this.prisma.trainingModule.findMany({
      where: { ownerId: userId },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        training: true,
        days: { select: { id: true, _count: { select: { activities: true } } } },
        shareLinks: {
          where: { revokedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return modules.map((module) => ({
      id: module.id,
      title: module.title,
      weekendNumber: module.weekendNumber,
      startDate: module.startDate,
      endDate: module.endDate,
      timezone: module.timezone,
      training: module.training,
      dayCount: module.days.length,
      activityCount: module.days.reduce((sum, day) => sum + day._count.activities, 0),
      shareUrl: module.shareLinks[0] ? this.publicUrl(module.shareLinks[0].token) : null,
    }));
  }

  async get(id: string, userId: string) {
    await this.ownership.assertModuleOwner(id, userId);
    const module = await this.prisma.trainingModule.findUnique({
      where: { id },
      include: moduleInclude,
    });
    if (!module) throw new NotFoundException(`Schedule ${id} not found`);
    return module;
  }

  async create(userId: string, dto: CreateScheduleDto) {
    const start = parseDateOnly(dto.startDate);
    const end = parseDateOnly(dto.endDate);
    if (end < start) throw new BadRequestException('End date must be on or after start date');
    const dates = eachUtcDate(start, end);
    if (dates.length > 14) throw new BadRequestException('A weekend can be at most 14 days');

    return this.prisma.trainingModule.create({
      data: {
        title: dto.title.trim(),
        weekendNumber: dto.weekendNumber ?? 1,
        startDate: start,
        endDate: end,
        timezone: dto.timezone?.trim() || 'America/Los_Angeles',
        owner: { connect: { id: userId } },
        training: {
          create: { name: (dto.trainingName ?? dto.title).trim() },
        },
        days: {
          create: dates.map((date) => ({
            date,
            weekday: weekdayName(date),
            startMinutes: 9 * 60,
            endMinutes: 18 * 60,
          })),
        },
      },
      include: moduleInclude,
    });
  }

  async update(id: string, userId: string, dto: UpdateScheduleDto) {
    await this.ownership.assertModuleOwner(id, userId);
    return this.prisma.trainingModule.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        weekendNumber: dto.weekendNumber,
        timezone: dto.timezone?.trim(),
        zoomTopic: dto.zoomTopic,
        zoomMeetingId: dto.zoomMeetingId,
        zoomPasscode: dto.zoomPasscode,
      },
      include: moduleInclude,
    });
  }

  async remove(id: string, userId: string) {
    await this.ownership.assertModuleOwner(id, userId);
    const module = await this.prisma.trainingModule.findUnique({
      where: { id },
      select: { trainingId: true },
    });
    if (!module) throw new NotFoundException(`Schedule ${id} not found`);
    await this.prisma.trainingModule.delete({ where: { id } });
    const leftover = await this.prisma.trainingModule.count({
      where: { trainingId: module.trainingId },
    });
    if (leftover === 0) {
      await this.prisma.training.delete({ where: { id: module.trainingId } }).catch(() => undefined);
    }
    return { ok: true };
  }

  async createShare(id: string, userId: string) {
    await this.ownership.assertModuleOwner(id, userId);
    const existing = await this.prisma.shareLink.findFirst({
      where: { moduleId: id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const link =
      existing ??
      (await this.prisma.shareLink.create({
        data: {
          token: randomShareToken(),
          moduleId: id,
          createdById: userId,
        },
      }));
    return { token: link.token, url: this.publicUrl(link.token) };
  }

  async revokeShare(id: string, userId: string) {
    await this.ownership.assertModuleOwner(id, userId);
    await this.prisma.shareLink.updateMany({
      where: { moduleId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  publicUrl(token: string) {
    const origin = (this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
    return `${origin}/v/${token}`;
  }
}

function randomShareToken() {
  return randomBytes(18).toString('base64url');
}
