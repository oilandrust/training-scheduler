import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Activity, LaidOutActivity } from '../types';
import { KIND_META, layoutActivities } from '../lib/calendar';
import {
  DEFAULT_DURATION,
  PX_PER_MINUTE,
  SNAP_MINUTES,
  clamp,
  DEFAULT_TIMEZONE,
  formatDuration,
  formatTime,
  formatTimeShort,
  nowMinutes,
  snap,
  timezoneAbbreviation,
} from '../lib/time';

type Props = {
  timezone?: string;
  startMinutes: number;
  endMinutes: number;
  activities: Activity[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (startMinutes: number, endMinutes: number) => void;
  onMove: (id: string, startMinutes: number, endMinutes: number) => void;
};

type DragState =
  | {
      mode: 'move';
      id: string;
      offset: number;
      duration: number;
      grabOffset: number;
    }
  | {
      mode: 'resize';
      id: string;
      startMinutes: number;
      currentEnd: number;
    }
  | {
      mode: 'create';
      origin: number;
      current: number;
    };

export function DayCalendar({
  timezone = DEFAULT_TIMEZONE,
  startMinutes,
  endMinutes,
  activities,
  selectedId,
  onSelect,
  onCreate,
  onMove,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDragState] = useState<DragState | null>(null);
  const [, setNowTick] = useState(0);

  function setDrag(next: DragState | null) {
    dragRef.current = next;
    setDragState(next);
  }

  useEffect(() => {
    const id = window.setInterval(() => setNowTick((tick) => tick + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const now = nowMinutes(timezone);
  const tzLabel = timezoneAbbreviation(timezone);
  const showNow = now >= 0 && now < 24 * 60;

  const rangeStart = Math.floor(Math.min(startMinutes, now) / 60) * 60;
  const rangeEnd = Math.max(
    rangeStart + 60,
    Math.ceil(Math.max(endMinutes, now + 1) / 60) * 60,
  );
  const totalMinutes = rangeEnd - rangeStart;
  const hours = useMemo(() => {
    const values: number[] = [];
    for (let minute = rangeStart; minute < rangeEnd; minute += 60) values.push(minute);
    return values;
  }, [rangeStart, rangeEnd]);

  const preview = useMemo(() => {
    if (!drag || drag.mode === 'create') return activities;
    return activities.map((activity) => {
      if (activity.id !== drag.id) return activity;
      if (drag.mode === 'move') {
        return {
          ...activity,
          startMinutes: drag.offset,
          endMinutes: drag.offset + drag.duration,
        };
      }
      return {
        ...activity,
        endMinutes: Math.max(activity.startMinutes + SNAP_MINUTES, drag.currentEnd),
      };
    });
  }, [activities, drag]);

  const laidOut = useMemo(() => layoutActivities(preview), [preview]);

  const minutesFromClientY = useCallback(
    (clientY: number) => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return rangeStart;
      return snap(rangeStart + (clientY - rect.top) / PX_PER_MINUTE);
    },
    [rangeStart],
  );

  useEffect(() => {
    const onMovePointer = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const minutes = clamp(minutesFromClientY(event.clientY), rangeStart, rangeEnd);
      if (current.mode === 'create') {
        setDrag({ ...current, current: minutes });
      } else if (current.mode === 'move') {
        const nextStart = clamp(
          minutes - current.grabOffset,
          rangeStart,
          rangeEnd - current.duration,
        );
        setDrag({ ...current, offset: nextStart });
      } else {
        setDrag({
          ...current,
          currentEnd: Math.min(rangeEnd, Math.max(current.startMinutes + SNAP_MINUTES, minutes)),
        });
      }
    };

    const onUp = () => {
      const current = dragRef.current;
      if (!current) return;
      dragRef.current = null;
      setDrag(null);
      if (current.mode === 'create') {
        const start = Math.min(current.origin, current.current);
        const rawEnd = Math.max(current.origin, current.current);
        const end = rawEnd - start < SNAP_MINUTES ? start + DEFAULT_DURATION : rawEnd;
        onCreate(start, Math.min(end, rangeEnd));
      } else if (current.mode === 'move') {
        onMove(current.id, current.offset, current.offset + current.duration);
      } else {
        onMove(current.id, current.startMinutes, current.currentEnd);
      }
    };

    window.addEventListener('pointermove', onMovePointer);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMovePointer);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [minutesFromClientY, onCreate, onMove, rangeEnd, rangeStart]);

  function onGridPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (!target.dataset.grid) return;
    const origin = clamp(
      minutesFromClientY(event.clientY),
      rangeStart,
      rangeEnd - DEFAULT_DURATION,
    );
    setDrag({ mode: 'create', origin, current: origin + DEFAULT_DURATION });
    onSelect(null);
  }

  const ghost = (() => {
    if (drag?.mode !== 'create') return null;
    const start = Math.min(drag.origin, drag.current);
    const rawEnd = Math.max(drag.origin, drag.current);
    const end = rawEnd - start < SNAP_MINUTES ? start + DEFAULT_DURATION : rawEnd;
    return { start, end: Math.min(end, rangeEnd) };
  })();

  return (
    <div className="calendar">
      <div className="calendar-body" style={{ height: totalMinutes * PX_PER_MINUTE }}>
        <div className="time-gutter">
          {hours.map((hour) => (
            <div
              key={hour}
              className="time-label"
              style={{ top: (hour - rangeStart) * PX_PER_MINUTE }}
            >
              {formatTimeShort(hour)}
              <span>{Math.floor(hour / 60) >= 12 ? 'PM' : 'AM'}</span>
            </div>
          ))}
        </div>
        <div
          ref={gridRef}
          className="calendar-grid"
          data-grid="true"
          onPointerDown={onGridPointerDown}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              data-grid="true"
              className="hour-line"
              style={{ top: (hour - rangeStart) * PX_PER_MINUTE }}
            />
          ))}
          {hours.map((hour) => (
            <div
              key={`${hour}-half`}
              data-grid="true"
              className="half-line"
              style={{ top: (hour - rangeStart + 30) * PX_PER_MINUTE }}
            />
          ))}
          {showNow && now >= rangeStart && now <= rangeEnd && (
            <div className="now-line" style={{ top: (now - rangeStart) * PX_PER_MINUTE }}>
              <span />
              <em>
                {formatTime(now)} {tzLabel}
              </em>
            </div>
          )}
          {ghost && (
            <div
              className="activity-ghost"
              style={{
                top: (ghost.start - rangeStart) * PX_PER_MINUTE,
                height: Math.max(18, (ghost.end - ghost.start) * PX_PER_MINUTE),
              }}
            >
              New activity
            </div>
          )}
          {laidOut.map((activity) => (
            <ActivityBlock
              key={activity.id}
              activity={activity}
              rangeStart={rangeStart}
              selected={activity.id === selectedId}
              onMovePointerDown={(event, current) => {
                event.stopPropagation();
                const minutes = minutesFromClientY(event.clientY);
                setDrag({
                  mode: 'move',
                  id: current.id,
                  offset: current.startMinutes,
                  duration: current.endMinutes - current.startMinutes,
                  grabOffset: minutes - current.startMinutes,
                });
                onSelect(current.id);
              }}
              onResizePointerDown={(event, current) => {
                event.stopPropagation();
                setDrag({
                  mode: 'resize',
                  id: current.id,
                  startMinutes: current.startMinutes,
                  currentEnd: current.endMinutes,
                });
                onSelect(current.id);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type BlockProps = {
  activity: LaidOutActivity;
  rangeStart: number;
  selected: boolean;
  onMovePointerDown: (event: ReactPointerEvent<HTMLButtonElement>, activity: Activity) => void;
  onResizePointerDown: (event: ReactPointerEvent<HTMLSpanElement>, activity: Activity) => void;
};

function ActivityBlock({
  activity,
  rangeStart,
  selected,
  onMovePointerDown,
  onResizePointerDown,
}: BlockProps) {
  const colors = KIND_META[activity.kind];
  const durationMinutes = activity.endMinutes - activity.startMinutes;
  const height = Math.max(18, durationMinutes * PX_PER_MINUTE);
  const widthPct = 100 / activity.colCount;
  const showMeta = height > 36;
  const showRoom = height > 54 && Boolean(activity.room);

  return (
    <button
      type="button"
      className={`activity-block ${selected ? 'selected' : ''}`}
      style={{
        top: (activity.startMinutes - rangeStart) * PX_PER_MINUTE,
        height,
        left: `calc(${activity.col * widthPct}% + 4px)`,
        width: `calc(${widthPct}% - 8px)`,
        background: colors.background,
        color: colors.text,
        borderColor: selected ? '#2C1D18' : colors.border,
      }}
      onPointerDown={(event) => onMovePointerDown(event, activity)}
    >
      <span className="activity-top">
        <span className="activity-title">{activity.title}</span>
        <span className="activity-duration">{formatDuration(durationMinutes)}</span>
      </span>
      {showMeta && (
        <span className="activity-time">
          {formatTime(activity.startMinutes)} – {formatTime(activity.endMinutes)}
        </span>
      )}
      {showRoom && <span className="activity-room">{activity.room}</span>}
      <span
        className="resize-handle"
        onPointerDown={(event) => onResizePointerDown(event, activity)}
      />
    </button>
  );
}
