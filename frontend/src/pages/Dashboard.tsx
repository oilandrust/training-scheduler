import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createSchedule,
  createShareLink,
  deleteSchedule,
  listSchedules,
  type ScheduleSummary,
} from '../api';
import { useAuth } from '../auth';
import { AppShare } from '../components/AppShare';
import { ImportDialog } from '../components/ImportDialog';
import { formatDateLabel, getBrowserTimeZone } from '../lib/time';

function dateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function sharePath(shareUrl: string) {
  try {
    return new URL(shareUrl, window.location.origin).pathname;
  } catch {
    return shareUrl;
  }
}

function listTimeZones(preferred: string): string[] {
  let zones: string[] = [];
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      zones = (
        Intl as typeof Intl & { supportedValuesOf(key: 'timeZone'): string[] }
      ).supportedValuesOf('timeZone');
    }
  } catch {
    zones = [];
  }
  if (zones.length === 0) {
    zones = [
      'UTC',
      'America/Los_Angeles',
      'America/Denver',
      'America/Chicago',
      'America/New_York',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Australia/Sydney',
    ];
  }
  if (!zones.includes(preferred)) zones = [preferred, ...zones];
  return zones;
}

export default function Dashboard() {
  const { user, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const defaults = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setUTCDate(start.getUTCDate() + 2);
    const timezone = getBrowserTimeZone();
    return {
      start: dateInputValue(start),
      end: dateInputValue(end),
      timezone,
      timeZones: listTimeZones(timezone),
    };
  }, []);
  const [title, setTitle] = useState('New weekend');
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [timezone, setTimezone] = useState(defaults.timezone);

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

  const setShareUrl = (id: string, shareUrl: string | null) => {
    setSchedules((rows) => rows.map((row) => (row.id === id ? { ...row, shareUrl } : row)));
  };

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const created = await createSchedule({ title, startDate, endDate, timezone });
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

  const onView = async (schedule: ScheduleSummary) => {
    setViewingId(schedule.id);
    setError(null);
    try {
      let url = schedule.shareUrl;
      if (!url) {
        const created = await createShareLink(schedule.id);
        url = created.url;
        setShareUrl(schedule.id, url);
      }
      navigate(sharePath(url));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open view');
    } finally {
      setViewingId(null);
    }
  };

  const onDeleteAccount = async () => {
    const ok = window.confirm(
      'Delete your account? This will permanently remove your account and all of your schedules. This cannot be undone.',
    );
    if (!ok) return;
    setDeletingAccount(true);
    setError(null);
    try {
      await deleteAccount();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete account');
      setDeletingAccount(false);
    }
  };

  return (
    <div className="dash">
      <header className="dash-top">
        <div>
          <p className="eyebrow">Training Scheduler</p>
          <h1>Your trainings</h1>
        </div>
        <div className="dash-user">
          <span>{user?.email}</span>
          <button className="btn ghost" type="button" onClick={() => void logout()}>
            Sign out
          </button>
          <button
            className="btn ghost"
            type="button"
            disabled={deletingAccount}
            onClick={() => void onDeleteAccount()}
          >
            {deletingAccount ? 'Deleting…' : 'Delete Account'}
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
          <label>
            Timezone
            <select value={timezone} onChange={(event) => setTimezone(event.target.value)} required>
              {defaults.timeZones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
          <div className="dash-create-submit">
            <button className="btn primary" type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create schedule'}
            </button>
          </div>
        </form>
      </section>

      <div className="dash-import">
        <button className="btn primary" type="button" onClick={() => setImportOpen(true)}>
          Import schedule
        </button>
      </div>

      {error && <p className="inline-error">{error}</p>}

      {loading ? (
        <p className="dash-empty">Loading schedules…</p>
      ) : schedules.length === 0 ? (
        <p className="dash-empty">No weekends yet. Create one or import a PDF / Google Doc.</p>
      ) : (
        <ul className="dash-list">
          {schedules.map((schedule) => (
            <li key={schedule.id}>
              <div className="dash-item-meta">
                <strong>{schedule.title}</strong>
                <span>
                  {formatDateLabel(schedule.startDate)} – {formatDateLabel(schedule.endDate)}
                </span>
                <em>{schedule.timezone}</em>
              </div>
              <div className="dash-item-actions">
                <AppShare
                  scheduleId={schedule.id}
                  initialShareUrl={schedule.shareUrl}
                  onShareUrlChange={(url) => setShareUrl(schedule.id, url)}
                />
                <Link className="btn" to={`/schedules/${schedule.id}`}>
                  Edit
                </Link>
                <button
                  className="btn"
                  type="button"
                  disabled={viewingId === schedule.id}
                  onClick={() => void onView(schedule)}
                >
                  {viewingId === schedule.id ? 'Opening…' : 'View'}
                </button>
                <button className="btn ghost" type="button" onClick={() => void onDelete(schedule)}>
                  Delete
                </button>
              </div>
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
