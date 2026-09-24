import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createActivity, deleteActivity, getModule, listModules, updateActivity } from '../api';
import { ScheduleEditor } from '../components/ScheduleEditor';
import type { Activity, TrainingModule } from '../types';

type DbScheduleProps = {
  readOnly?: boolean;
  headerExtra?: ReactNode;
};

/** Load the seeded Prisma module and render the schedule editor or viewer. */
export function useDbModule() {
  const [module, setModule] = useState<TrainingModule | null>(null);
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

  return { module, setModule, error, setError, loading };
}

export function DbSchedule({ readOnly = false, headerExtra }: DbScheduleProps) {
  const { module, setModule, error, setError, loading } = useDbModule();

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
  }, [setModule]);

  const handleCreate = useCallback(async (dayId: string, startMinutes: number, endMinutes: number) => {
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
  }, [setModule]);

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
    [module, replaceActivity, setError],
  );

  const handleChange = useCallback(
    async (id: string, patch: Partial<Activity>) => {
      if (!module) return;
      const current = module.days.flatMap((d) => d.activities ?? []).find((a) => a.id === id);
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
    [module, replaceActivity, setError],
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
    [module, setModule, setError],
  );

  if (loading) {
    return <div className="boot">Opening the weekend…</div>;
  }

  if (error && !module) {
    return <div className="boot error">{error}</div>;
  }

  if (!module) {
    return <div className="boot">No days in this module.</div>;
  }

  if (readOnly) {
    return (
      <ScheduleEditor
        module={module}
        error={error}
        readOnly
        headerExtra={headerExtra}
      />
    );
  }

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
      headerExtra={headerExtra}
    />
  );
}
