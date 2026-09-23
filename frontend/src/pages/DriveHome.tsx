import { useCallback, useEffect, useState } from 'react';
import { createFile, listSchedules } from '../drive/api';
import { isGisReady, isSignedIn, preloadGis, signIn, signOut } from '../drive/auth';
import { createBlankWeekendDocument, createHakomiWeekend1Document } from '../drive/sample';
import type { DriveFileMeta } from '../drive/types';

export default function DriveHome() {
  const [gisReady, setGisReady] = useState(isGisReady());
  const [signedIn, setSignedIn] = useState(isSignedIn());
  const [files, setFiles] = useState<DriveFileMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void preloadGis()
      .then(() => {
        setGisReady(true);
        if (isSignedIn()) setSignedIn(true);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not load Google sign-in'),
      );
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listSchedules();
      setFiles(list);
      setSignedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not list schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) void refresh();
  }, [refresh, signedIn]);

  const handleSignIn = () => {
    setError(null);
    // Open popup in the same turn as the click (no await before signIn).
    void signIn({ prompt: 'consent' })
      .then(async () => {
        setSignedIn(true);
        await refresh();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      });
  };

  const handleSignOut = () => {
    signOut();
    setSignedIn(false);
    setFiles([]);
  };

  const openFile = (fileId: string) => {
    window.location.assign(`/edit?fileId=${encodeURIComponent(fileId)}`);
  };

  const createBlank = () => {
    if (!isSignedIn()) {
      setError('Sign in first, then create a schedule.');
      return;
    }
    setBusy('blank');
    setError(null);
    void createFile('Untitled schedule', createBlankWeekendDocument())
      .then((created) => openFile(created.id))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not create schedule');
        setBusy(null);
      });
  };

  const createSample = () => {
    if (!isSignedIn()) {
      setError('Sign in first, then create the sample.');
      return;
    }
    setBusy('sample');
    setError(null);
    void createFile('Hakomi Zoom Weekend #1', createHakomiWeekend1Document())
      .then(async (created) => {
        await refresh();
        openFile(created.id);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not upload sample');
        setBusy(null);
      });
  };

  return (
    <div className="drive-home">
      <header className="drive-hero">
        <p className="eyebrow">Google Drive</p>
        <h1>Training Scheduler</h1>
        <p className="drive-lede">
          Open and edit <code>.schedule</code> weekend documents stored in your Drive.
        </p>
        <div className="drive-actions">
          {!signedIn ? (
            <button
              type="button"
              className="btn primary"
              disabled={!gisReady}
              onClick={handleSignIn}
            >
              {gisReady ? 'Sign in with Google' : 'Loading Google…'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn primary"
                disabled={busy !== null}
                onClick={createBlank}
              >
                {busy === 'blank' ? 'Creating…' : 'New schedule'}
              </button>
              <button
                type="button"
                className="btn"
                disabled={busy !== null}
                onClick={createSample}
              >
                {busy === 'sample' ? 'Uploading…' : 'Create sample schedules'}
              </button>
              <button type="button" className="btn ghost" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          )}
        </div>
        {error && <p className="inline-error">{error}</p>}
      </header>

      <section className="drive-list">
        <div className="drive-list-head">
          <h2>Your schedules</h2>
          {signedIn && (
            <button type="button" className="btn ghost" disabled={loading} onClick={() => void refresh()}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>
        {!signedIn && <p className="drive-empty">Sign in to list schedules this app can open.</p>}
        {signedIn && !loading && files.length === 0 && (
          <p className="drive-empty">
            No <code>.schedule</code> files yet. Create a blank weekend or upload the Hakomi sample.
          </p>
        )}
        <ul>
          {files.map((file) => (
            <li key={file.id}>
              <button type="button" className="drive-file" onClick={() => openFile(file.id)}>
                <span className="drive-file-name">{file.name}</span>
                {file.modifiedTime && (
                  <span className="drive-file-meta">
                    {new Date(file.modifiedTime).toLocaleString()}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <footer className="drive-footer">
        <a href="/db">Open database demo</a>
        <span>·</span>
        <a
          href="https://github.com/oilandrust/training-scheduler/blob/main/GOOGLE_DRIVE_SETUP.md"
          target="_blank"
          rel="noreferrer"
        >
          Setup notes
        </a>
      </footer>
    </div>
  );
}
