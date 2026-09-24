import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/public.decorator';

@Controller('share')
export class ShareController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':token')
  async get(@Param('token') token: string) {
    const link = await this.prisma.shareLink.findUnique({
      where: { token },
      include: {
        module: {
          include: {
            training: true,
            days: {
              orderBy: { date: 'asc' },
              include: { activities: { orderBy: { startMinutes: 'asc' } } },
            },
          },
        },
      },
    });
    if (!link || link.revokedAt) {
      throw new NotFoundException('This view link is invalid or has been revoked');
    }
    return link.module;
  }
}
