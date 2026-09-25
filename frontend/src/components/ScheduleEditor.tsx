import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
  const [sheetArmed, setSheetArmed] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const [sheetDragging, setSheetDragging] = useState(false);
  const sheetDragRef = useRef<{ pointerId: number; startY: number } | null>(null);
  const localTimezone = useMemo(() => getBrowserTimeZone(), []);
  const showTzToggle = timeZonesAreDifferent(module.timezone, localTimezone);
  const [clockMode, setClockMode] = useState<ClockMode>('training');

  useEffect(() => {
    if (!module.days.some((day) => day.id === selectedDayId)) {
      setSelectedDayId(module.days[0]?.id ?? null);
      setSelectedActivityId(null);
    }
  }, [module.days, selectedDayId]);

  useEffect(() => {
    if (!selectedActivityId) {
      setSheetArmed(false);
      setSheetOffset(0);
      setSheetDragging(false);
      sheetDragRef.current = null;
      return;
    }
    setSheetArmed(false);
    setSheetOffset(0);
    const timer = window.setTimeout(() => setSheetArmed(true), 400);
    return () => window.clearTimeout(timer);
  }, [selectedActivityId]);

  useEffect(() => {
    if (!selectedActivityId) return;
    const html = document.documentElement;
    const { overflow, overscrollBehaviorY } = document.body.style;
    const htmlOverscroll = html.style.overscrollBehaviorY;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehaviorY = 'none';
    html.style.overscrollBehaviorY = 'none';
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.overscrollBehaviorY = overscrollBehaviorY;
      html.style.overscrollBehaviorY = htmlOverscroll;
    };
  }, [selectedActivityId]);

  const closeSheet = useCallback(() => {
    setSelectedActivityId(null);
    setSheetOffset(0);
    setSheetDragging(false);
    sheetDragRef.current = null;
  }, []);

  const onSheetChromePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!sheetArmed) return;
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    sheetDragRef.current = { pointerId: event.pointerId, startY: event.clientY };
    setSheetDragging(true);
  };

  const onSheetChromePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    setSheetOffset(Math.max(0, event.clientY - drag.startY));
  };

  const onSheetChromePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dy = Math.max(0, event.clientY - drag.startY);
    sheetDragRef.current = null;
    setSheetDragging(false);
    if (dy > 72) {
      closeSheet();
      return;
    }
    setSheetOffset(0);
  };

  const swallowOpeningGesture = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    if (sheetArmed) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const selectedDay = useMemo(
    () => module.days.find((day) => day.id === selectedDayId) ?? null,
    [module, selectedDayId],
  );

  const selectedDayIndex = useMemo(
    () => module.days.findIndex((day) => day.id === selectedDayId),
    [module.days, selectedDayId],
  );

  const selectDayAt = useCallback(
    (index: number) => {
      const day = module.days[index];
      if (!day) return;
      setSelectedDayId(day.id);
      setSelectedActivityId(null);
    },
    [module.days],
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
          <div className="main-header-day">
            <button
              type="button"
              className="day-nav-btn"
              aria-label="Previous day"
              disabled={selectedDayIndex <= 0}
              onClick={() => selectDayAt(selectedDayIndex - 1)}
            >
              ‹
            </button>
            <div>
              <h2>{selectedDay.weekday}</h2>
              <p>{formatDateLabel(selectedDay.date)}</p>
            </div>
            <button
              type="button"
              className="day-nav-btn"
              aria-label="Next day"
              disabled={selectedDayIndex < 0 || selectedDayIndex >= module.days.length - 1}
              onClick={() => selectDayAt(selectedDayIndex + 1)}
            >
              ›
            </button>
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

      <aside className="details-desktop">
        {readOnly ? (
          <ActivitySummary activity={selectedActivity} />
        ) : (
          <DetailsPanel
            activity={selectedActivity}
            onChange={onChange ?? (() => undefined)}
            onDelete={handleDelete}
          />
        )}
      </aside>

      {createPortal(
        <div
          className={`details-mobile-layer ${selectedActivity ? 'is-open' : ''} ${sheetArmed ? 'is-armed' : ''}`}
          aria-hidden={!selectedActivity}
          onPointerDownCapture={swallowOpeningGesture}
          onPointerUpCapture={swallowOpeningGesture}
          onClickCapture={swallowOpeningGesture}
        >
          {selectedActivity && (
            <>
              <button
                type="button"
                className="details-backdrop"
                aria-label="Close details"
                onClick={() => {
                  if (sheetArmed) closeSheet();
                }}
              />
              <div
                className={`details-sheet ${sheetDragging ? 'is-dragging' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label="Activity details"
                style={sheetOffset ? { transform: `translateY(${sheetOffset}px)` } : undefined}
              >
                <div
                  className="details-sheet-chrome"
                  onPointerDown={onSheetChromePointerDown}
                  onPointerMove={onSheetChromePointerMove}
                  onPointerUp={onSheetChromePointerEnd}
                  onPointerCancel={onSheetChromePointerEnd}
                >
                  <span className="details-sheet-handle" aria-hidden />
                  <button
                    type="button"
                    className="details-sheet-close"
                    onClick={closeSheet}
                  >
                    Close
                  </button>
                </div>
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
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
