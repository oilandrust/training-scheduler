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
import { resolveFileId } from '../drive/open';
import { ScheduleEditor } from '../components/ScheduleEditor';
import { ShareControl } from '../components/ShareControl';
import { locateInDriveUrl, type DriveFileMeta, type ScheduleDocument } from '../drive/types';

export default function DriveEditor() {
  const fileId = useMemo(() => resolveFileId(), []);
  const [doc, setDoc] = useState<ScheduleDocument | null>(null);
  const [meta, setMeta] = useState<DriveFileMeta | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [gisReady, setGisReady] = useState(isGisReady());

  const fileName = meta?.name ?? 'schedule.schedule';
  const locateLink = meta ? locateInDriveUrl(meta) : null;

  const load = useCallback(async () => {
    if (!fileId) {
      const rawState = new URLSearchParams(window.location.search).get('state');
      const hint =
        rawState === '{state}'
          ? 'Drive sent a literal “{state}”. In Cloud Console → Drive UI integration, set Open URL to https://training-scheduler.lefolio.fr/edit (no ?state={state}). Drive appends state automatically.'
          : 'Missing fileId. Open a schedule from Drive or the home page.';
      setError(hint);
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
      const [nextMeta, raw] = await Promise.all([getFileMeta(fileId), getFileContent(fileId)]);
      if (nextMeta.capabilities?.canEdit === false) {
        window.location.replace(`/view?fileId=${encodeURIComponent(fileId)}`);
        return;
      }
      setMeta(nextMeta);
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
      const nextMeta = await updateFileContent(fileId, doc);
      setMeta((current) => ({ ...current, ...nextMeta }));
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

  if (!doc || !module || !fileId) {
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
          <ShareControl
            fileId={fileId}
            fileName={fileName}
            canShare={meta?.capabilities?.canShare !== false}
          />
          {locateLink && (
            <a className="topbar-link" href={locateLink} target="_blank" rel="noreferrer">
              Locate in Drive
            </a>
          )}
          <a className="topbar-link" href={`/view?fileId=${encodeURIComponent(fileId)}`}>
            View
          </a>
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
