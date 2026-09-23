import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFileContent, getFileMeta } from '../drive/api';
import {
  AuthRequiredError,
  isGisReady,
  isSignedIn,
  preloadGis,
  signIn,
} from '../drive/auth';
import { documentToModule, parseDocument } from '../drive/document';
import { editUrl, resolveFileId } from '../drive/open';
import { ScheduleEditor } from '../components/ScheduleEditor';
import { ShareControl } from '../components/ShareControl';
import type { DriveFileMeta, ScheduleDocument } from '../drive/types';

export default function DriveViewer() {
  const fileId = useMemo(() => resolveFileId(), []);
  const [doc, setDoc] = useState<ScheduleDocument | null>(null);
  const [meta, setMeta] = useState<DriveFileMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [gisReady, setGisReady] = useState(isGisReady());

  const canEdit = meta?.capabilities?.canEdit === true;
  const fileName = meta?.name ?? 'schedule.schedule';

  const load = useCallback(async () => {
    if (!fileId) {
      setError('Missing fileId. Open a shared schedule link or pick a file from the home page.');
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
      setMeta(nextMeta);
      setDoc(parseDocument(raw));
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

  if (needsAuth) {
    return (
      <div className="boot">
        <div className="boot-panel">
          <p>Sign in to view this schedule.</p>
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
    return <div className="boot">Loading schedule…</div>;
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
      readOnly
      headerExtra={
        <div className="drive-actions">
          {canEdit && (
            <a className="btn primary" href={editUrl(fileId)}>
              Open Editor
            </a>
          )}
          {meta?.capabilities?.canShare && (
            <ShareControl fileId={fileId} fileName={fileName} />
          )}
          <a className="topbar-link" href="/">
            All schedules
          </a>
        </div>
      }
    />
  );
}
