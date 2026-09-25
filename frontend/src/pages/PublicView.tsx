import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedSchedule } from '../api';
import { ScheduleEditor } from '../components/ScheduleEditor';
import type { TrainingModule } from '../types';

export default function PublicView() {
  const { token } = useParams();
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const full = await getSharedSchedule(token);
        if (!cancelled) setModule(full);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'This link is not available');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) return <div className="boot">Opening the weekend…</div>;
  if (error || !module) return <div className="boot error">{error ?? 'Not found'}</div>;

  return <ScheduleEditor module={module} readOnly />;
}
