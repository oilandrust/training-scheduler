import { useEffect, useState } from 'react';
import { createFile } from '../drive/api';
import { isGisReady, isSignedIn, preloadGis, signIn } from '../drive/auth';
import { createBlankWeekendDocument } from '../drive/sample';

/** Drive “New → Training Schedule” and in-app /new create a file then open the editor. */
export default function DriveNew() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gisReady, setGisReady] = useState(isGisReady());

  useEffect(() => {
    void preloadGis()
      .then(() => setGisReady(true))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not load Google sign-in'),
      );
  }, []);

  const create = () => {
    setError(null);
    setBusy(true);

    const run = async () => {
      const created = await createFile('Untitled schedule', createBlankWeekendDocument());
      window.location.replace(`/drive/edit?fileId=${encodeURIComponent(created.id)}`);
    };

    if (!isSignedIn()) {
      // Popup must open in the same click turn — call signIn before any await.
      void signIn({ prompt: 'consent' })
        .then(() => run())
        .catch((err) => {
          setBusy(false);
          setError(err instanceof Error ? err.message : 'Could not create schedule in Drive');
        });
      return;
    }

    void run().catch((err) => {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'Could not create schedule in Drive');
    });
  };

  if (error) {
    return (
      <div className="boot error">
        <div className="boot-panel">
          <p>{error}</p>
          <button type="button" className="btn primary" disabled={!gisReady || busy} onClick={create}>
            Try again
          </button>
          <p>
            <a href="/">Back to home</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="boot">
      <div className="boot-panel">
        <p>{busy ? 'Creating schedule in Drive…' : 'Create a new schedule in your Drive.'}</p>
        {!busy && (
          <button type="button" className="btn primary" disabled={!gisReady} onClick={create}>
            {gisReady
              ? isSignedIn()
                ? 'Create schedule'
                : 'Sign in and create'
              : 'Loading Google…'}
          </button>
        )}
      </div>
    </div>
  );
}
