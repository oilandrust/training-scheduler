import { useEffect, useMemo, useState } from 'react';
import type { Activity, ActivityKind } from '../types';
import { ACTIVITY_KINDS, KIND_META } from '../lib/calendar';
import { formatTime, fromTimeInput, toTimeInput } from '../lib/time';

type Props = {
  activity: Activity | null;
  onChange: (id: string, patch: Partial<Activity>) => void;
  onDelete: (id: string) => void;
};

export function DetailsPanel({ activity, onChange, onDelete }: Props) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [breakoutNotes, setBreakoutNotes] = useState('');
  const [room, setRoom] = useState('');
  const [facilitator, setFacilitator] = useState('');

  useEffect(() => {
    setTitle(activity?.title ?? '');
    setNotes(activity?.notes ?? '');
    setBreakoutNotes(activity?.breakoutNotes ?? '');
    setRoom(activity?.room ?? '');
    setFacilitator(activity?.facilitator ?? '');
  }, [activity]);

  const duration = useMemo(() => {
    if (!activity) return '';
    const minutes = activity.endMinutes - activity.startMinutes;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
  }, [activity]);

  if (!activity) {
    return (
      <aside className="details">
        <div className="details-empty">
          <div className="details-empty-mark" />
          <h2>Select an activity</h2>
          <p>
            Click a block on the schedule to edit its title, time, room, and notes. Or click an
            empty time to create one.
          </p>
        </div>
      </aside>
    );
  }

  const colors = KIND_META[activity.kind];

  return (
    <aside className="details">
      <div className="details-header">
        <span className="kind-pill" style={{ background: colors.background, color: colors.text }}>
          {colors.label}
        </span>
        <span className="details-duration">{duration}</span>
      </div>

      <input
        className="details-title"
        aria-label="Activity title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => {
          const next = title.trim() || 'Untitled activity';
          setTitle(next);
          if (next !== activity.title) onChange(activity.id, { title: next });
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
        }}
      />

      <div className="field-row">
        <label className="field">
          <span>Starts</span>
          <input
            type="time"
            step={300}
            value={toTimeInput(activity.startMinutes)}
            onChange={(event) => {
              const startMinutes = fromTimeInput(event.target.value);
              const durationMinutes = activity.endMinutes - activity.startMinutes;
              onChange(activity.id, {
                startMinutes,
                endMinutes: startMinutes + Math.max(5, durationMinutes),
              });
            }}
          />
        </label>
        <label className="field">
          <span>Ends</span>
          <input
            type="time"
            step={300}
            value={toTimeInput(activity.endMinutes)}
            onChange={(event) => {
              const endMinutes = fromTimeInput(event.target.value);
              if (endMinutes > activity.startMinutes) {
                onChange(activity.id, { endMinutes });
              }
            }}
          />
        </label>
      </div>
      <p className="details-range">
        {formatTime(activity.startMinutes)} – {formatTime(activity.endMinutes)}
      </p>

      <label className="field">
        <span>Type</span>
        <select
          value={activity.kind}
          onChange={(event) =>
            onChange(activity.id, { kind: event.target.value as ActivityKind })
          }
        >
          {ACTIVITY_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_META[kind].label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Room</span>
        <input
          value={room}
          placeholder="Main Room, Breakout…"
          onChange={(event) => setRoom(event.target.value)}
          onBlur={() => {
            if (room !== (activity.room ?? '')) onChange(activity.id, { room: room || null });
          }}
        />
      </label>

      <label className="field">
        <span>Facilitator</span>
        <input
          value={facilitator}
          placeholder="Rob, Tara…"
          onChange={(event) => setFacilitator(event.target.value)}
          onBlur={() => {
            if (facilitator !== (activity.facilitator ?? '')) {
              onChange(activity.id, { facilitator: facilitator || null });
            }
          }}
        />
      </label>

      <label className="field">
        <span>Breakout notes</span>
        <textarea
          rows={3}
          value={breakoutNotes}
          placeholder="Groups of 4, dyads, tech notes…"
          onChange={(event) => setBreakoutNotes(event.target.value)}
          onBlur={() => {
            if (breakoutNotes !== (activity.breakoutNotes ?? '')) {
              onChange(activity.id, { breakoutNotes: breakoutNotes || null });
            }
          }}
        />
      </label>

      <label className="field">
        <span>Notes</span>
        <textarea
          rows={6}
          value={notes}
          placeholder="What happens in this block…"
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => {
            if (notes !== (activity.notes ?? '')) {
              onChange(activity.id, { notes: notes || null });
            }
          }}
        />
      </label>

      <button className="delete-btn" type="button" onClick={() => onDelete(activity.id)}>
        Delete activity
      </button>
    </aside>
  );
}
