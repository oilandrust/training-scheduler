import type { Day } from '../types';
import { formatShortDate, formatTime } from '../lib/time';

type Props = {
  days: Day[];
  selectedDayId: string | null;
  onSelect: (dayId: string) => void;
};

export function DaySidebar({ days, selectedDayId, onSelect }: Props) {
  return (
    <aside className="sidebar">
      <p className="sidebar-kicker">Weekend days</p>
      <nav className="day-list">
        {days.map((day) => {
          const selected = day.id === selectedDayId;
          const count = day.activities?.length ?? 0;
          return (
            <button
              key={day.id}
              className={`day-card ${selected ? 'selected' : ''}`}
              onClick={() => onSelect(day.id)}
              type="button"
            >
              <span className="day-card-weekday">{day.weekday}</span>
              <span className="day-card-date">{formatShortDate(day.date)}</span>
              <span className="day-card-meta">
                {formatTime(day.startMinutes)} – {formatTime(day.endMinutes)}
                {count ? ` · ${count}` : ''}
              </span>
            </button>
          );
        })}
      </nav>
      <p className="sidebar-hint">
        Click an empty slot to add an activity. Drag to move, pull the edge to resize.
      </p>
    </aside>
  );
}
