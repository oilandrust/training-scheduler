import { useEffect, useRef, useState } from 'react';
import { createShareLink, revokeShareLink } from '../api';

type Props = {
  scheduleId: string;
  initialShareUrl?: string | null;
  onShareUrlChange?: (url: string | null) => void;
};

export function AppShare({
  scheduleId,
  initialShareUrl = null,
  onShareUrlChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(initialShareUrl);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setShareUrl(initialShareUrl);
  }, [initialShareUrl, scheduleId]);

  const setActiveUrl = (url: string | null) => {
    setShareUrl(url);
    onShareUrlChange?.(url);
  };

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const flashCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const share = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await createShareLink(scheduleId);
      setActiveUrl(url);
      await navigator.clipboard.writeText(url);
      flashCopied();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create link');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    setMenuOpen(false);
    setBusy(true);
    setError(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      flashCopied();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not copy link');
    } finally {
      setBusy(false);
    }
  };

  const unshare = async () => {
    setMenuOpen(false);
    if (!window.confirm('Stop sharing this schedule? The current link will stop working.')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await revokeShareLink(scheduleId);
      setActiveUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unshare');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="share-control" ref={rootRef}>
      {!shareUrl ? (
        <button className="btn" type="button" disabled={busy} onClick={() => void share()}>
          Share
        </button>
      ) : (
        <div className="share-split">
          <button
            className="btn share-main"
            type="button"
            disabled={busy}
            onClick={() => void copyLink()}
          >
            {copied ? 'Copied' : 'Copy Link'}
          </button>
          <button
            className="btn share-arrow"
            type="button"
            disabled={busy}
            aria-label="Share options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ▾
          </button>
        </div>
      )}
      {menuOpen && shareUrl && (
        <div className="share-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => void unshare()}>
            Unshare
          </button>
        </div>
      )}
      {error && <span className="inline-error">{error}</span>}
    </div>
  );
}
