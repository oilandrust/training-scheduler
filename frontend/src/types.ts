export type ActivityKind =
  | 'STAFF'
  | 'LOGISTICS'
  | 'MEDITATION'
  | 'TALK'
  | 'EXERCISE'
  | 'BREAKOUT'
  | 'BREAK'
  | 'DEMO'
  | 'PRACTICE'
  | 'GAME'
  | 'SHARING'
  | 'CLOSING'
  | 'OTHER';

export type Activity = {
  id: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  kind: ActivityKind;
  room: string | null;
  facilitator: string | null;
  breakoutNotes: string | null;
  notes: string | null;
  dayId: string;
};

export type Day = {
  id: string;
  date: string;
  weekday: string;
  startMinutes: number;
  endMinutes: number;
  moduleId: string;
  activities?: Activity[];
};

export type TrainingModule = {
  id: string;
  title: string;
  weekendNumber: number;
  startDate: string;
  endDate: string;
  timezone: string;
  zoomTopic: string | null;
  zoomMeetingId: string | null;
  zoomPasscode: string | null;
  training: { id: string; name: string };
  days: Day[];
};

export type LaidOutActivity = Activity & {
  col: number;
  colCount: number;
};
