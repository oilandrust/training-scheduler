import { FormEvent, useState } from 'react';
import {
  getDriveAccessToken,
  getDrivePickerConfig,
  importDriveFile,
  importPdf,
} from '../api';
import { useAuth } from '../auth';
import { openDrivePicker } from '../drive/picker';

type Props = {
  hasDrive: boolean;
  onClose: () => void;
  onImported: (scheduleId: string) => void;
};

export function ImportDialog({ hasDrive, onClose, onImported }: Props) {
  const { refresh } = useAuth();
  const [tab, setTab] = useState<'pdf' | 'drive'>(hasDrive ? 'drive' : 'pdf');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);

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

  const onPickFromDrive = async () => {
    setPicking(true);
    setError(null);
    try {
      const [config, token] = await Promise.all([getDrivePickerConfig(), getDriveAccessToken()]);
      const picked = await openDrivePicker({
        accessToken: token.accessToken,
        config,
      });
      if (!picked) return;
      setPickedName(picked.name ?? picked.id);
      setBusy(true);
      const result = await importDriveFile(picked.id);
      await refresh();
      onImported(result.scheduleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setBusy(false);
    } finally {
      setPicking(false);
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
          <div className="import-drive">
            <p>Browse your Drive and pick a Google Doc or PDF lesson plan.</p>
            {pickedName && !busy && <p className="auth-hint">Selected: {pickedName}</p>}
            {busy && <p className="auth-hint">Importing{pickedName ? ` “${pickedName}”` : ''}…</p>}
            <button
              className="btn primary"
              type="button"
              disabled={busy || picking}
              onClick={() => void onPickFromDrive()}
            >
              {picking ? 'Opening Drive…' : busy ? 'Importing…' : 'Choose from Drive'}
            </button>
          </div>
        ) : (
          <div>
            <p>Connect Google Drive to browse Docs and PDFs.</p>
            <a className="btn primary" href="/api/auth/drive">
              Connect Google Drive
            </a>
          </div>
        )}

        {error && <p className="inline-error">{error}</p>}
        <button className="btn ghost" type="button" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
