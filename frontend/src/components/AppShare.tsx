import { useState } from 'react';
import { createShareLink, revokeShareLink } from '../api';

type Props = {
  scheduleId: string;
};

export function AppShare({ scheduleId }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copyLink = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await createShareLink(scheduleId);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create link');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!window.confirm('Revoke the public view link?')) return;
    setBusy(true);
    try {
      await revokeShareLink(scheduleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="drive-actions">
      <button className="btn" type="button" disabled={busy} onClick={() => void copyLink()}>
        {copied ? 'Copied' : 'Copy view link'}
      </button>
      <button className="btn ghost" type="button" disabled={busy} onClick={() => void revoke()}>
        Revoke
      </button>
      {error && <span className="inline-error">{error}</span>}
    </div>
  );
}
