import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityKind } from '@prisma/client';
import pdfParse from 'pdf-parse';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateOnly, weekdayName } from '../schedules/dates';
import { LlmExtractService } from './llm-extract.service';
import type { ExtractedSchedule } from './schedule-extract.schema';

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmExtractService,
    private readonly config: ConfigService,
  ) {}

  async importPdf(userId: string, file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Upload a PDF file');
    if (file.mimetype && file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }
    const parsed = await pdfParse(file.buffer);
    const text = parsed.text?.trim();
    if (!text) throw new BadRequestException('Could not read text from that PDF');
    return this.persistFromText(userId, text);
  }

  async listDriveDocs(userId: string) {
    const accessToken = await this.driveAccessToken(userId);
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set(
      'q',
      "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf')",
    );
    url.searchParams.set('pageSize', '50');
    url.searchParams.set('orderBy', 'modifiedTime desc');
    url.searchParams.set('fields', 'files(id,name,modifiedTime,mimeType)');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new BadGatewayException('Could not list Google Drive files');
    }
    const body = (await response.json()) as {
      files?: { id: string; name: string; modifiedTime?: string; mimeType?: string }[];
    };
    return body.files ?? [];
  }

  async importDrive(userId: string, fileId: string) {
    if (!fileId?.trim()) throw new BadRequestException('fileId is required');
    const accessToken = await this.driveAccessToken(userId);
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!metaRes.ok) throw new BadGatewayException('Could not read that Drive file');
    const meta = (await metaRes.json()) as { mimeType?: string; name?: string };

    let text = '';
    if (meta.mimeType === 'application/vnd.google-apps.document') {
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/plain`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!exportRes.ok) throw new BadGatewayException('Could not export that Google Doc');
      text = (await exportRes.text()).trim();
    } else if (meta.mimeType === 'application/pdf') {
      const download = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!download.ok) throw new BadGatewayException('Could not download that PDF');
      const buffer = Buffer.from(await download.arrayBuffer());
      text = (await pdfParse(buffer)).text?.trim() ?? '';
    } else {
      throw new BadRequestException('Pick a Google Doc or a PDF');
    }

    if (!text) throw new BadRequestException('That file had no readable text');
    return this.persistFromText(userId, text);
  }

  private async persistFromText(userId: string, text: string) {
    const extracted = await this.llm.extractSchedule(text);
    const module = await this.createFromExtract(userId, extracted);
    return { scheduleId: module.id };
  }

  async createFromExtract(userId: string, extracted: ExtractedSchedule) {
    const start = parseDateOnly(extracted.startDate);
    const end = parseDateOnly(extracted.endDate);
    if (end < start) throw new BadRequestException('Extracted end date is before start date');

    return this.prisma.trainingModule.create({
      data: {
        title: extracted.title.trim(),
        weekendNumber: extracted.weekendNumber,
        startDate: start,
        endDate: end,
        timezone: extracted.timezone,
        zoomTopic: extracted.zoomTopic,
        zoomMeetingId: extracted.zoomMeetingId,
        zoomPasscode: extracted.zoomPasscode,
        owner: { connect: { id: userId } },
        training: { create: { name: extracted.trainingName.trim() } },
        days: {
          create: extracted.days.map((day) => {
            const date = parseDateOnly(day.date);
            const activities = day.activities.filter((activity) => activity.endMinutes > activity.startMinutes);
            const startMinutes =
              day.startMinutes ??
              Math.min(9 * 60, ...activities.map((activity) => activity.startMinutes), 9 * 60);
            const endMinutes =
              day.endMinutes ??
              Math.max(18 * 60, ...activities.map((activity) => activity.endMinutes), 18 * 60);
            return {
              date,
              weekday: day.weekday || weekdayName(date),
              startMinutes,
              endMinutes,
              activities: {
                create: activities.map((activity) => ({
                  title: activity.title.trim(),
                  startMinutes: activity.startMinutes,
                  endMinutes: activity.endMinutes,
                  kind: (activity.kind ?? 'OTHER') as ActivityKind,
                  room: activity.room,
                  facilitator: activity.facilitator,
                  breakoutNotes: activity.breakoutNotes,
                  notes: activity.notes,
                })),
              },
            };
          }),
        },
      },
    });
  }

  private async driveAccessToken(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.googleRefreshToken) {
      throw new ConflictException('Connect Google Drive first');
    }
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth is not configured');
    }
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: user.googleRefreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!response.ok) {
      throw new ConflictException('Google Drive access expired. Connect Drive again.');
    }
    const tokens = (await response.json()) as { access_token?: string };
    if (!tokens.access_token) {
      throw new BadGatewayException('Google did not return an access token');
    }
    return tokens.access_token;
  }
}
