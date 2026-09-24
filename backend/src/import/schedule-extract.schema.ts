import { z } from 'zod';

export const ACTIVITY_KINDS = [
  'STAFF',
  'LOGISTICS',
  'MEDITATION',
  'TALK',
  'EXERCISE',
  'BREAKOUT',
  'BREAK',
  'DEMO',
  'PRACTICE',
  'GAME',
  'SHARING',
  'CLOSING',
  'OTHER',
] as const;

export const extractedActivitySchema = z.object({
  title: z.string().min(1).max(200),
  startMinutes: z.number().int().min(0).max(24 * 60),
  endMinutes: z.number().int().min(0).max(24 * 60),
  kind: z.enum(ACTIVITY_KINDS).optional().default('OTHER'),
  room: z.string().max(120).optional().nullable(),
  facilitator: z.string().max(120).optional().nullable(),
  breakoutNotes: z.string().max(4000).optional().nullable(),
  notes: z.string().max(8000).optional().nullable(),
});

export const extractedDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  weekday: z.string().optional(),
  startMinutes: z.number().int().min(0).max(24 * 60).optional(),
  endMinutes: z.number().int().min(0).max(24 * 60).optional(),
  activities: z.array(extractedActivitySchema).default([]),
});

export const extractedScheduleSchema = z.object({
  trainingName: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  weekendNumber: z.number().int().min(1).max(99).optional().default(1),
  timezone: z.string().min(1).max(80).optional().default('America/Los_Angeles'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  zoomTopic: z.string().max(200).optional().nullable(),
  zoomMeetingId: z.string().max(80).optional().nullable(),
  zoomPasscode: z.string().max(80).optional().nullable(),
  days: z.array(extractedDaySchema).min(1),
});

export type ExtractedSchedule = z.infer<typeof extractedScheduleSchema>;
