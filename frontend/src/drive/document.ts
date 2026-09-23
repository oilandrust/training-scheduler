import type { Activity, Day, TrainingModule } from '../types';
import type { ScheduleActivity, ScheduleDay, ScheduleDocument } from './types';

function newId(): string {
  return crypto.randomUUID();
}

export function createEmptyDocument(overrides?: Partial<ScheduleDocument>): ScheduleDocument {
  const startDate = overrides?.startDate ?? '2026-09-18';
  const endDate = overrides?.endDate ?? '2026-09-20';
  return {
    version: 1,
    title: overrides?.title ?? 'Untitled schedule',
    timezone: overrides?.timezone ?? 'America/Los_Angeles',
    weekendNumber: overrides?.weekendNumber ?? 1,
    startDate,
    endDate,
    days:
      overrides?.days ??
      [
        {
          id: newId(),
          date: startDate,
          weekday: 'Friday',
          startMinutes: 11 * 60 + 30,
          endMinutes: 18 * 60,
          activities: [],
        },
        {
          id: newId(),
          date: '2026-09-19',
          weekday: 'Saturday',
          startMinutes: 9 * 60,
          endMinutes: 14 * 60 + 30,
          activities: [],
        },
        {
          id: newId(),
          date: endDate,
          weekday: 'Sunday',
          startMinutes: 9 * 60,
          endMinutes: 13 * 60 + 30,
          activities: [],
        },
      ],
  };
}

export function parseDocument(raw: string): ScheduleDocument {
  const data = JSON.parse(raw) as ScheduleDocument;
  if (data.version !== 1 || !Array.isArray(data.days)) {
    throw new Error('Unsupported or invalid .schedule document');
  }
  return data;
}

export function serializeDocument(doc: ScheduleDocument): string {
  return JSON.stringify(doc, null, 2);
}

/** Map ScheduleDocument → TrainingModule-shaped view model used by the calendar UI. */
export function documentToModule(doc: ScheduleDocument): TrainingModule {
  return {
    id: 'drive-local',
    title: doc.title,
    weekendNumber: doc.weekendNumber,
    startDate: doc.startDate,
    endDate: doc.endDate,
    timezone: doc.timezone,
    zoomTopic: null,
    zoomMeetingId: null,
    zoomPasscode: null,
    training: { id: 'drive-local', name: 'Google Drive schedule' },
    days: doc.days.map(
      (day): Day => ({
        id: day.id,
        moduleId: 'drive-local',
        date: day.date,
        weekday: day.weekday,
        startMinutes: day.startMinutes,
        endMinutes: day.endMinutes,
        activities: day.activities.map(
          (activity): Activity => ({
            id: activity.id,
            dayId: day.id,
            title: activity.title,
            startMinutes: activity.startMinutes,
            endMinutes: activity.endMinutes,
            kind: activity.kind,
            room: activity.room,
            facilitator: activity.facilitator,
            breakoutNotes: activity.breakoutNotes,
            notes: activity.notes,
          }),
        ),
      }),
    ),
  };
}

export function moduleToDocument(module: TrainingModule): ScheduleDocument {
  return {
    version: 1,
    title: module.title,
    timezone: module.timezone,
    weekendNumber: module.weekendNumber,
    startDate: module.startDate.slice(0, 10),
    endDate: module.endDate.slice(0, 10),
    days: module.days.map(
      (day): ScheduleDay => ({
        id: day.id,
        date: day.date.slice(0, 10),
        weekday: day.weekday,
        startMinutes: day.startMinutes,
        endMinutes: day.endMinutes,
        activities: (day.activities ?? []).map(
          (activity): ScheduleActivity => ({
            id: activity.id,
            title: activity.title,
            startMinutes: activity.startMinutes,
            endMinutes: activity.endMinutes,
            kind: activity.kind,
            room: activity.room,
            facilitator: activity.facilitator,
            breakoutNotes: activity.breakoutNotes,
            notes: activity.notes,
          }),
        ),
      }),
    ),
  };
}

export function createActivityInDocument(
  doc: ScheduleDocument,
  dayId: string,
  startMinutes: number,
  endMinutes: number,
): { doc: ScheduleDocument; activityId: string } {
  const activity: ScheduleActivity = {
    id: newId(),
    title: 'New activity',
    startMinutes,
    endMinutes,
    kind: 'OTHER',
    room: 'Main Room',
    facilitator: null,
    breakoutNotes: null,
    notes: null,
  };
  return {
    activityId: activity.id,
    doc: {
      ...doc,
      days: doc.days.map((day) =>
        day.id === dayId ? { ...day, activities: [...day.activities, activity] } : day,
      ),
    },
  };
}

export function updateActivityInDocument(
  doc: ScheduleDocument,
  activityId: string,
  patch: Partial<ScheduleActivity>,
): ScheduleDocument {
  return {
    ...doc,
    days: doc.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity) =>
        activity.id === activityId ? { ...activity, ...patch } : activity,
      ),
    })),
  };
}

export function deleteActivityInDocument(
  doc: ScheduleDocument,
  dayId: string,
  activityId: string,
): ScheduleDocument {
  return {
    ...doc,
    days: doc.days.map((day) =>
      day.id === dayId
        ? { ...day, activities: day.activities.filter((activity) => activity.id !== activityId) }
        : day,
    ),
  };
}
