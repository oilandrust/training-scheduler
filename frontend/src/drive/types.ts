import type { ActivityKind } from '../types';

export const SCHEDULE_MIME = 'application/vnd.lefolio.schedule+json';
export const SCHEDULE_EXTENSION = 'schedule';

export type ScheduleActivity = {
  id: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  kind: ActivityKind;
  room: string | null;
  facilitator: string | null;
  breakoutNotes: string | null;
  notes: string | null;
};

export type ScheduleDay = {
  id: string;
  date: string;
  weekday: string;
  startMinutes: number;
  endMinutes: number;
  activities: ScheduleActivity[];
};

export type ScheduleDocument = {
  version: 1;
  title: string;
  timezone: string;
  weekendNumber: number;
  startDate: string;
  endDate: string;
  days: ScheduleDay[];
};

export type DriveFileMeta = {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
};

/** Open Drive UI on the file’s parent folder (or My Drive root). */
export function locateInDriveUrl(meta: Pick<DriveFileMeta, 'id' | 'parents'>): string {
  const parentId = meta.parents?.[0];
  if (parentId) {
    return `https://drive.google.com/drive/folders/${encodeURIComponent(parentId)}`;
  }
  return 'https://drive.google.com/drive/my-drive';
}

/** Payload Google Drive passes via `?state=` on Open with / New. */
export type DriveOpenState = {
  ids?: string[] | string;
  action?: string;
  userId?: string;
  exportIds?: string[] | string;
};
