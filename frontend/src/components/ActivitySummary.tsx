import type { Activity } from '../types';
import { KIND_META } from '../lib/calendar';
import { formatDuration, formatTime } from '../lib/time';

type Props = {
  activity: Activity | null;
};

export function ActivitySummary({ activity }: Props) {
  if (!activity) {
    return (
      <aside className="details">
        <div className="details-empty">
          <div className="details-empty-mark" />
          <h2>Select an activity</h2>
          <p>Click a block on the schedule to see its time, room, and notes.</p>
        </div>
      </aside>
    );
  }

  const colors = KIND_META[activity.kind];
  const duration = formatDuration(activity.endMinutes - activity.startMinutes);

  return (
    <aside className="details">
      <div className="details-header">
        <span className="kind-pill" style={{ background: colors.background, color: colors.text }}>
          {colors.label}
        </span>
        <span className="details-duration">{duration}</span>
      </div>
      <h2 className="details-title-static">{activity.title}</h2>
      <p className="details-range">
        {formatTime(activity.startMinutes)} – {formatTime(activity.endMinutes)}
      </p>
      {activity.room && (
        <p className="summary-field">
          <span>Room</span>
          {activity.room}
        </p>
      )}
      {activity.facilitator && (
        <p className="summary-field">
          <span>Facilitator</span>
          {activity.facilitator}
        </p>
      )}
      {activity.breakoutNotes && (
        <p className="summary-field">
          <span>Breakout notes</span>
          {activity.breakoutNotes}
        </p>
      )}
      {activity.notes && (
        <p className="summary-field">
          <span>Notes</span>
          {activity.notes}
        </p>
      )}
    </aside>
  );
}
