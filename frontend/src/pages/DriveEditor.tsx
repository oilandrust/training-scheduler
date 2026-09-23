import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFileContent, getFileMeta, updateFileContent } from '../drive/api';
import {
  AuthRequiredError,
  isGisReady,
  isSignedIn,
  preloadGis,
  signIn,
} from '../drive/auth';
import {
  createActivityInDocument,
  deleteActivityInDocument,
  documentToModule,
  parseDocument,
  updateActivityInDocument,
} from '../drive/document';
import { ScheduleEditor } from '../components/ScheduleEditor';
import { locateInDriveUrl, type DriveOpenState, type ScheduleDocument } from '../drive/types';

function parseDriveState(raw: string | null): DriveOpenState | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DriveOpenState;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw)) as DriveOpenState;
    } catch {
      return null;
    }
  }
}

function resolveFileId(): string | null {
  const params = new URLSearchParams(window.location.search);
  const direct = params.get('fileId');
  if (direct) return direct;
  const state = parseDriveState(params.get('state'));
  const fromIds = state?.ids?.[0] ?? state?.exportIds?.[0];
  return fromIds ?? null;
}

export default function DriveEditor() {
  const fileId = useMemo(() => resolveFileId(), []);
  const [doc, setDoc] = useState<ScheduleDocument | null>(null);
  const [fileName, setFileName] = useState('schedule.schedule');
  const [locateLink, setLocateLink] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [gisReady, setGisReady] = useState(isGisReady());

  const load = useCallback(async () => {
    if (!fileId) {
      setError('Missing fileId. Open a schedule from Drive or the home page.');
      setLoading(false);
      return;
    }
    if (!isSignedIn()) {
      setNeedsAuth(true);
      setLoading(false);
      return;
    }
    setNeedsAuth(false);
    setLoading(true);
    setError(null);
    try {
      const [meta, raw] = await Promise.all([getFileMeta(fileId), getFileContent(fileId)]);
      setFileName(meta.name);
      setLocateLink(locateInDriveUrl(meta));
      setDoc(parseDocument(raw));
      setDirty(false);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setNeedsAuth(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load schedule from Drive');
      }
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    void preloadGis()
      .then(() => {
        setGisReady(true);
        void load();
      })
      .catch(() => {
        setGisReady(false);
        void load();
      });
  }, [load]);

  const handleSignIn = () => {
    setError(null);
    void signIn({ prompt: 'consent' })
      .then(() => load())
      .catch((err) => setError(err instanceof Error ? err.message : 'Sign-in failed'));
  };

  const module = useMemo(() => (doc ? documentToModule(doc) : null), [doc]);

  const mark = useCallback((next: ScheduleDocument) => {
    setDoc(next);
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!fileId || !doc) return;
    setSaving(true);
    setError(null);
    try {
      const meta = await updateFileContent(fileId, doc);
      setFileName(meta.name);
      if (meta.parents) setLocateLink(locateInDriveUrl(meta));
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [doc, fileId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  if (needsAuth) {
    return (
      <div className="boot">
        <div className="boot-panel">
          <p>Sign in to open this schedule from Drive.</p>
          {error && <p className="inline-error">{error}</p>}
          <button type="button" className="btn primary" disabled={!gisReady} onClick={handleSignIn}>
            {gisReady ? 'Sign in with Google' : 'Loading Google…'}
          </button>
          <p>
            <a href="/">Back to home</a>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="boot">Loading schedule from Drive…</div>;
  }

  if (error && !doc) {
    return (
      <div className="boot error">
        <p>{error}</p>
        <p>
          <button type="button" className="btn" onClick={() => void load()}>
            Retry
          </button>{' '}
          <a href="/">Back to home</a>
        </p>
      </div>
    );
  }

  if (!doc || !module) {
    return <div className="boot">No schedule loaded.</div>;
  }

  return (
    <ScheduleEditor
      module={module}
      eyebrow={fileName}
      error={error}
      headerExtra={
        <div className="drive-actions">
          {dirty && <span className="dirty-pill">Unsaved</span>}
          <button type="button" className="btn" disabled={saving || !dirty} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {locateLink && (
            <a className="topbar-link" href={locateLink} target="_blank" rel="noreferrer">
              Locate in Drive
            </a>
          )}
          <a className="topbar-link" href="/">
            All schedules
          </a>
        </div>
      }
      onCreate={(dayId, startMinutes, endMinutes) => {
        const { doc: next, activityId } = createActivityInDocument(doc, dayId, startMinutes, endMinutes);
        mark(next);
        return activityId;
      }}
      onMove={(id, startMinutes, endMinutes) => {
        mark(updateActivityInDocument(doc, id, { startMinutes, endMinutes }));
      }}
      onChange={(id, patch) => {
        mark(updateActivityInDocument(doc, id, patch));
      }}
      onDelete={(id) => {
        const day = doc.days.find((d) => d.activities.some((a) => a.id === id));
        if (!day) return;
        mark(deleteActivityInDocument(doc, day.id, id));
      }}
    />
  );
}
