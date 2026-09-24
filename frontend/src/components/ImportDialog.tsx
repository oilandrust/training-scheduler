import { FormEvent, useEffect, useState } from 'react';
import { importDriveFile, importPdf, listDriveFiles, type DriveFile } from '../api';
import { useAuth } from '../auth';

type Props = {
  hasDrive: boolean;
  onClose: () => void;
  onImported: (scheduleId: string) => void;
};

export function ImportDialog({ hasDrive, onClose, onImported }: Props) {
  const { refresh } = useAuth();
  const [tab, setTab] = useState<'pdf' | 'drive'>(hasDrive ? 'drive' : 'pdf');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [fileId, setFileId] = useState('');

  useEffect(() => {
    if (tab !== 'drive' || !hasDrive) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listDriveFiles();
        if (!cancelled) setFiles(rows);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not list Drive files');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, hasDrive]);

  const onPdf = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem('pdf') as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await importPdf(file);
      onImported(result.scheduleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setBusy(false);
    }
  };

  const onDrive = async (event: FormEvent) => {
    event.preventDefault();
    if (!fileId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await importDriveFile(fileId);
      await refresh();
      onImported(result.scheduleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setBusy(false);
    }
  };

  return (
    <div className="modal-layer">
      <button type="button" className="details-backdrop" aria-label="Close import" onClick={onClose} />
      <div className="import-dialog" role="dialog" aria-label="Import schedule">
        <div className="import-tabs">
          <button type="button" className={tab === 'pdf' ? 'active' : ''} onClick={() => setTab('pdf')}>
            PDF
          </button>
          <button type="button" className={tab === 'drive' ? 'active' : ''} onClick={() => setTab('drive')}>
            Google Drive
          </button>
        </div>

        {tab === 'pdf' ? (
          <form onSubmit={onPdf}>
            <p>Upload a lesson-plan PDF. We will extract days and activities with the LLM.</p>
            <input name="pdf" type="file" accept="application/pdf" required />
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Importing…' : 'Import PDF'}
            </button>
          </form>
        ) : hasDrive ? (
          <form onSubmit={onDrive}>
            <p>Choose a Google Doc or PDF from Drive.</p>
            <select value={fileId} onChange={(event) => setFileId(event.target.value)} required>
              <option value="">Select a file…</option>
              {files.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </select>
            <button className="btn primary" type="submit" disabled={busy || !fileId}>
              {busy ? 'Importing…' : 'Import from Drive'}
            </button>
          </form>
        ) : (
          <div>
            <p>Connect Google Drive to browse Docs and PDFs.</p>
            <a className="btn primary" href="/api/auth/drive">
              Connect Google Drive
            </a>
          </div>
        )}

        {error && <p className="inline-error">{error}</p>}
        <button className="btn ghost" type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
