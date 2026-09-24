import { useCallback, useEffect, useState } from 'react';
import { createActivity, deleteActivity, getSchedule, updateActivity } from '../api';
import { AppShare } from '../components/AppShare';
import { ScheduleEditor } from '../components/ScheduleEditor';
import type { Activity, TrainingModule } from '../types';

type Props = {
  moduleId: string;
};

export function OwnedSchedule({ moduleId }: Props) {
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const full = await getSchedule(moduleId);
        if (!cancelled) setModule(full);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

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
    async (dayId: string, startMinutes: number, endMinutes: number) => {
      const created = await createActivity(dayId, {
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
            day.id === dayId ? { ...day, activities: [...(day.activities ?? []), created] } : day,
          ),
        };
      });
      return created.id;
    },
    [],
  );

  const handleMove = useCallback(
    async (id: string, startMinutes: number, endMinutes: number) => {
      if (!module) return;
      const current = module.days.flatMap((d) => d.activities ?? []).find((a) => a.id === id);
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
    [module, replaceActivity],
  );

  const handleChange = useCallback(
    async (id: string, patch: Partial<Activity>) => {
      if (!module) return;
      const current = module.days.flatMap((d) => d.activities ?? []).find((a) => a.id === id);
      if (!current) return;
      replaceActivity({ ...current, ...patch });
      try {
        const saved = await updateActivity(id, patch);
        replaceActivity(saved);
      } catch (err) {
        replaceActivity(current);
        setError(err instanceof Error ? err.message : 'Could not update activity');
      }
    },
    [module, replaceActivity],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!module) return;
      const day = module.days.find((d) => (d.activities ?? []).some((a) => a.id === id));
      const current = day?.activities?.find((a) => a.id === id);
      if (!day || !current) return;
      setModule((mod) => {
        if (!mod) return mod;
        return {
          ...mod,
          days: mod.days.map((d) =>
            d.id === day.id
              ? { ...d, activities: (d.activities ?? []).filter((activity) => activity.id !== id) }
              : d,
          ),
        };
      });
      try {
        await deleteActivity(id);
      } catch (err) {
        setModule((mod) => {
          if (!mod) return mod;
          return {
            ...mod,
            days: mod.days.map((d) =>
              d.id === day.id ? { ...d, activities: [...(d.activities ?? []), current] } : d,
            ),
          };
        });
        setError(err instanceof Error ? err.message : 'Could not delete activity');
      }
    },
    [module],
  );

  if (loading) return <div className="boot">Opening the weekend…</div>;
  if (error && !module) return <div className="boot error">{error}</div>;
  if (!module) return <div className="boot">No days in this module.</div>;

  return (
    <ScheduleEditor
      module={module}
      error={error}
      onCreate={async (dayId, start, end) => {
        try {
          return await handleCreate(dayId, start, end);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not create activity');
        }
      }}
      onMove={handleMove}
      onChange={handleChange}
      onDelete={handleDelete}
      headerExtra={
        <div className="drive-actions">
          <a className="topbar-link" href="/">
            All weekends
          </a>
          <AppShare scheduleId={module.id} />
        </div>
      }
    />
  );
}
