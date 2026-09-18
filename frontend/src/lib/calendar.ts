import type { Activity, ActivityKind, LaidOutActivity } from '../types';

export const KIND_META: Record<
  ActivityKind,
  { label: string; background: string; border: string; text: string }
> = {
  STAFF: { label: 'Staff', background: '#9C3B28', border: '#7A2C1E', text: '#FFF6F0' },
  LOGISTICS: { label: 'Logistics', background: '#C4924A', border: '#A07438', text: '#2C1D18' },
  MEDITATION: { label: 'Meditation', background: '#D4782E', border: '#B45F1C', text: '#FFF8F1' },
  TALK: { label: 'Talk', background: '#C45C3A', border: '#A34628', text: '#FFF7F2' },
  EXERCISE: { label: 'Exercise', background: '#E09A3C', border: '#C07E24', text: '#2C1D18' },
  BREAKOUT: { label: 'Breakout', background: '#C46A4A', border: '#A35236', text: '#FFF7F2' },
  BREAK: { label: 'Break', background: '#E6D0B2', border: '#CDB08C', text: '#5A463C' },
  DEMO: { label: 'Demo', background: '#A84B3A', border: '#8A372A', text: '#FFF6F1' },
  PRACTICE: { label: 'Practice', background: '#C17A3A', border: '#A06028', text: '#FFF8F0' },
  GAME: { label: 'Game', background: '#E07A4A', border: '#C25E32', text: '#2C1D18' },
  SHARING: { label: 'Sharing', background: '#D46A6A', border: '#B44E4E', text: '#FFF6F4' },
  CLOSING: { label: 'Closing', background: '#8B4A6A', border: '#6E3552', text: '#FFF5F8' },
  OTHER: { label: 'Activity', background: '#C97848', border: '#A85C32', text: '#FFF7F1' },
};

export const ACTIVITY_KINDS = Object.keys(KIND_META) as ActivityKind[];

export function layoutActivities(activities: Activity[]): LaidOutActivity[] {
  const sorted = [...activities].sort(
    (a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes,
  );

  const assigned = new Map<string, { col: number; colCount: number }>();
  let cluster: Activity[] = [];
  let clusterEnd = -1;

  const finalize = () => {
    if (!cluster.length) return;
    const colEnds: number[] = [];
    const colOf = new Map<string, number>();
    for (const event of cluster) {
      let col = colEnds.findIndex((end) => end <= event.startMinutes);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(event.endMinutes);
      } else {
        colEnds[col] = event.endMinutes;
      }
      colOf.set(event.id, col);
    }
    const colCount = colEnds.length;
    for (const event of cluster) {
      assigned.set(event.id, { col: colOf.get(event.id) ?? 0, colCount });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const event of sorted) {
    if (cluster.length && event.startMinutes >= clusterEnd) finalize();
    cluster.push(event);
    clusterEnd = Math.max(clusterEnd, event.endMinutes);
  }
  finalize();

  return activities.map((event) => ({
    ...event,
    ...(assigned.get(event.id) ?? { col: 0, colCount: 1 }),
  }));
}
