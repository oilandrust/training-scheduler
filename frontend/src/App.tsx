import { useCallback, useEffect, useMemo, useState } from 'react';
import { createActivity, deleteActivity, getModule, listModules, updateActivity } from './api';
import { DayCalendar } from './components/DayCalendar';
import { DaySidebar } from './components/DaySidebar';
import { DetailsPanel } from './components/DetailsPanel';
import { formatDateLabel } from './lib/time';
import type { Activity, TrainingModule } from './types';

export default function App() {
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const modules = await listModules();
        const first = modules[0];
        if (!first) throw new Error('No training modules found. Did you run the seed?');
        const full = await getModule(first.id);
        if (cancelled) return;
        setModule(full);
        setSelectedDayId(full.days[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedDay = useMemo(
    () => module?.days.find((day) => day.id === selectedDayId) ?? null,
    [module, selectedDayId],
  );

  const activities = selectedDay?.activities ?? [];
  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId) ?? null;

  const replaceActivity = useCallback((next: Activity) => {
    setModule((current) => {
      if (!current) return current;
      return {
        ...current,
        days: current.days.map((day) =>
          day.id === next.dayId
            ? {
                ...day,
                activities: (day.activities ?? []).map((activity) =>
                  activity.id === next.id ? next : activity,
                ),
              }
            : day,
        ),
      };
    });
  }, []);

  const handleCreate = useCallback(
    async (startMinutes: number, endMinutes: number) => {
      if (!selectedDay) return;
      try {
        const created = await createActivity(selectedDay.id, {
          title: 'New activity',
          startMinutes,
          endMinutes,
          kind: 'OTHER',
          room: 'Main Room',
        });
        setModule((current) => {
          if (!current) return current;
          return {
            ...current,
            days: current.days.map((day) =>
              day.id === selectedDay.id
                ? { ...day, activities: [...(day.activities ?? []), created] }
                : day,
            ),
          };
        });
        setSelectedActivityId(created.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create activity');
      }
    },
    [selectedDay],
  );

  const handleMove = useCallback(
    async (id: string, startMinutes: number, endMinutes: number) => {
      const current = activities.find((activity) => activity.id === id);
      if (!current || (current.startMinutes === startMinutes && current.endMinutes === endMinutes)) {
        return;
      }
      replaceActivity({ ...current, startMinutes, endMinutes });
      try {
        const saved = await updateActivity(id, { startMinutes, endMinutes });
        replaceActivity(saved);
      } catch (err) {
        replaceActivity(current);
        setError(err instanceof Error ? err.message : 'Could not move activity');
      }
    },
    [activities, replaceActivity],
  );

  const handleChange = useCallback(
    async (id: string, patch: Partial<Activity>) => {
      const current = activities.find((activity) => activity.id === id);
      if (!current) return;
      const optimistic = { ...current, ...patch };
      replaceActivity(optimistic);
      try {
        const saved = await updateActivity(id, patch);
        replaceActivity(saved);
      } catch (err) {
        replaceActivity(current);
        setError(err instanceof Error ? err.message : 'Could not update activity');
      }
    },
    [activities, replaceActivity],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!selectedDay) return;
      const current = activities.find((activity) => activity.id === id);
      if (!current) return;
      if (!window.confirm(`Delete “${current.title}”?`)) return;
      setModule((mod) => {
        if (!mod) return mod;
        return {
          ...mod,
          days: mod.days.map((day) =>
            day.id === selectedDay.id
              ? { ...day, activities: (day.activities ?? []).filter((activity) => activity.id !== id) }
              : day,
          ),
        };
      });
      setSelectedActivityId(null);
      try {
        await deleteActivity(id);
      } catch (err) {
        setModule((mod) => {
          if (!mod) return mod;
          return {
            ...mod,
            days: mod.days.map((day) =>
              day.id === selectedDay.id
                ? { ...day, activities: [...(day.activities ?? []), current] }
                : day,
            ),
          };
        });
        setError(err instanceof Error ? err.message : 'Could not delete activity');
      }
    },
    [activities, selectedDay],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      if (event.key === 'Escape') setSelectedActivityId(null);
      if (!typing && selectedActivityId && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault();
        void handleDelete(selectedActivityId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDelete, selectedActivityId]);

  if (loading) {
    return <div className="boot">Opening the weekend…</div>;
  }

  if (error && !module) {
    return <div className="boot error">{error}</div>;
  }

  if (!module || !selectedDay) {
    return <div className="boot">No days in this module.</div>;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">{module.training.name}</p>
          <h1>
            {module.title}
            <span>Module {module.weekendNumber}</span>
          </h1>
        </div>
        {module.zoomMeetingId && (
          <div className="zoom-chip">
            <strong>{module.zoomTopic ?? 'Zoom'}</strong>
            <span>ID {module.zoomMeetingId}</span>
            {module.zoomPasscode && <span>Passcode {module.zoomPasscode}</span>}
          </div>
        )}
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
          {error && <p className="inline-error">{error}</p>}
        </div>
        <DayCalendar
          date={selectedDay.date}
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
          onCreate={handleCreate}
          onMove={handleMove}
        />
      </main>

      <DetailsPanel activity={selectedActivity} onChange={handleChange} onDelete={handleDelete} />
    </div>
  );
}
