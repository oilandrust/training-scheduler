import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createSchedule, deleteSchedule, listSchedules, type ScheduleSummary } from '../api';
import { useAuth } from '../auth';
import { ImportDialog } from '../components/ImportDialog';
import { formatDateLabel } from '../lib/time';

function dateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const defaults = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setUTCDate(start.getUTCDate() + 2);
    return { start: dateInputValue(start), end: dateInputValue(end) };
  }, []);
  const [title, setTitle] = useState('New weekend');
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listSchedules();
        if (!cancelled) setSchedules(rows);
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

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const created = await createSchedule({ title, startDate, endDate });
      navigate(`/schedules/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create schedule');
      setCreating(false);
    }
  };

  const onDelete = async (schedule: ScheduleSummary) => {
    if (!window.confirm(`Delete “${schedule.title}”?`)) return;
    try {
      await deleteSchedule(schedule.id);
      setSchedules((rows) => rows.filter((row) => row.id !== schedule.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    }
  };

  return (
    <div className="dash">
      <header className="dash-top">
        <div>
          <p className="eyebrow">Training Scheduler</p>
          <h1>Your weekends</h1>
        </div>
        <div className="dash-user">
          <span>{user?.email}</span>
          <button className="btn ghost" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>

      <section className="dash-create">
        <form onSubmit={onCreate}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label>
            Starts
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
          </label>
          <label>
            Ends
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
          </label>
          <button className="btn primary" type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create schedule'}
          </button>
          <button className="btn" type="button" onClick={() => setImportOpen(true)}>
            Import
          </button>
        </form>
      </section>

      {error && <p className="inline-error">{error}</p>}

      {loading ? (
        <p className="dash-empty">Loading schedules…</p>
      ) : schedules.length === 0 ? (
        <p className="dash-empty">No weekends yet. Create one or import a PDF / Google Doc.</p>
      ) : (
        <ul className="dash-list">
          {schedules.map((schedule) => (
            <li key={schedule.id}>
              <Link to={`/schedules/${schedule.id}`}>
                <strong>{schedule.title}</strong>
                <span>
                  {formatDateLabel(schedule.startDate)} – {formatDateLabel(schedule.endDate)}
                </span>
                <em>
                  {schedule.dayCount} days · {schedule.activityCount} activities
                </em>
              </Link>
              <button className="btn ghost" type="button" onClick={() => void onDelete(schedule)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {importOpen && (
        <ImportDialog
          hasDrive={Boolean(user?.hasDrive)}
          onClose={() => setImportOpen(false)}
          onImported={(id) => navigate(`/schedules/${id}`)}
        />
      )}
    </div>
  );
}
