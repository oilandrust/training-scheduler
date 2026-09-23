import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivitySummary } from './ActivitySummary';
import { DayCalendar, type ClockMode } from './DayCalendar';
import { DaySidebar } from './DaySidebar';
import { DetailsPanel } from './DetailsPanel';
import {
  formatDateLabel,
  getBrowserTimeZone,
  timeZonesAreDifferent,
  timezoneAbbreviation,
} from '../lib/time';
import type { Activity, TrainingModule } from '../types';

export type ScheduleEditorProps = {
  module: TrainingModule;
  headerExtra?: ReactNode;
  eyebrow?: string;
  error?: string | null;
  readOnly?: boolean;
  onCreate?: (
    dayId: string,
    startMinutes: number,
    endMinutes: number,
  ) => string | void | Promise<string | void>;
  onMove?: (id: string, startMinutes: number, endMinutes: number) => void | Promise<void>;
  onChange?: (id: string, patch: Partial<Activity>) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
};

export function ScheduleEditor({
  module,
  headerExtra,
  eyebrow,
  error,
  readOnly = false,
  onCreate,
  onMove,
  onChange,
  onDelete,
}: ScheduleEditorProps) {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(module.days[0]?.id ?? null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const localTimezone = useMemo(() => getBrowserTimeZone(), []);
  const showTzToggle = timeZonesAreDifferent(module.timezone, localTimezone);
  const [clockMode, setClockMode] = useState<ClockMode>('training');

  useEffect(() => {
    if (!module.days.some((day) => day.id === selectedDayId)) {
      setSelectedDayId(module.days[0]?.id ?? null);
      setSelectedActivityId(null);
    }
  }, [module.days, selectedDayId]);

  const selectedDay = useMemo(
    () => module.days.find((day) => day.id === selectedDayId) ?? null,
    [module, selectedDayId],
  );

  const activities = selectedDay?.activities ?? [];
  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId) ?? null;

  const trainingLabel = timezoneAbbreviation(module.timezone);
  const localLabel = timezoneAbbreviation(localTimezone);

  const handleCreate = useCallback(
    async (startMinutes: number, endMinutes: number) => {
      if (readOnly || !selectedDay || !onCreate) return;
      const createdId = await onCreate(selectedDay.id, startMinutes, endMinutes);
      if (createdId) setSelectedActivityId(createdId);
    },
    [onCreate, readOnly, selectedDay],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (readOnly || !onDelete) return;
      const current = activities.find((activity) => activity.id === id);
      if (!current) return;
      if (!window.confirm(`Delete “${current.title}”?`)) return;
      setSelectedActivityId(null);
      void onDelete(id);
    },
    [activities, onDelete, readOnly],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      if (event.key === 'Escape') setSelectedActivityId(null);
      if (
        !readOnly &&
        !typing &&
        selectedActivityId &&
        (event.key === 'Backspace' || event.key === 'Delete')
      ) {
        event.preventDefault();
        handleDelete(selectedActivityId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDelete, readOnly, selectedActivityId]);

  if (!selectedDay) {
    return <div className="boot">No days in this schedule.</div>;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">{eyebrow ?? module.training.name}</p>
          <h1>
            {module.title}
            <span>Module {module.weekendNumber}</span>
          </h1>
        </div>
        {headerExtra}
      </header>

      <DaySidebar
        days={module.days}
        selectedDayId={selectedDay.id}
        onSelect={(id) => {
          setSelectedDayId(id);
          setSelectedActivityId(null);
        }}
      />

      <main className="main">
        <div className="main-header">
          <div>
            <h2>{selectedDay.weekday}</h2>
            <p>{formatDateLabel(selectedDay.date)}</p>
          </div>
          <div className="main-header-actions">
            {showTzToggle && (
              <div className="tz-toggle" role="group" aria-label="Clock timezone">
                <button
                  type="button"
                  className={clockMode === 'training' ? 'active' : ''}
                  onClick={() => setClockMode('training')}
                  title={`Training time (${module.timezone})`}
                >
                  {trainingLabel}
                </button>
                <button
                  type="button"
                  className={clockMode === 'local' ? 'active' : ''}
                  onClick={() => setClockMode('local')}
                  title={`Your local time (${localTimezone})`}
                >
                  {localLabel}
                </button>
              </div>
            )}
            {error && <p className="inline-error">{error}</p>}
          </div>
        </div>
        <DayCalendar
          timezone={module.timezone}
          localTimezone={localTimezone}
          date={selectedDay.date}
          clockMode={showTzToggle ? clockMode : 'training'}
          startMinutes={Math.min(
            selectedDay.startMinutes,
            ...activities.map((activity) => activity.startMinutes),
          )}
          endMinutes={
            Math.max(
              selectedDay.endMinutes,
              ...activities.map((activity) => activity.endMinutes),
            ) + 60
          }
          activities={activities}
          selectedId={selectedActivityId}
          onSelect={setSelectedActivityId}
          onCreate={readOnly ? undefined : handleCreate}
          onMove={readOnly ? undefined : onMove}
          readOnly={readOnly}
        />
      </main>

      {readOnly ? (
        <ActivitySummary activity={selectedActivity} />
      ) : (
        <DetailsPanel
          activity={selectedActivity}
          onChange={onChange ?? (() => undefined)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
