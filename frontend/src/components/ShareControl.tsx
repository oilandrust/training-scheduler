import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  createPermission,
  deletePermission,
  listPermissions,
} from '../drive/api';
import { viewUrl } from '../drive/open';
import type { DrivePermission } from '../drive/types';

type Props = {
  fileId: string;
  fileName: string;
  canShare?: boolean;
};

function roleLabel(role: DrivePermission['role']): string {
  if (role === 'owner') return 'Owner';
  if (role === 'writer' || role === 'organizer' || role === 'fileOrganizer') return 'Editor';
  if (role === 'commenter') return 'Commenter';
  return 'Viewer';
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ShareControl({ fileId, fileName, canShare = true }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissions, setPermissions] = useState<DrivePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'reader' | 'writer'>('reader');
  const [copied, setCopied] = useState(false);

  const link = viewUrl(fileId);
  const anyone = permissions.find((p) => p.type === 'anyone');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPermissions(await listPermissions(fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sharing');
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    if (dialogOpen) void refresh();
  }, [dialogOpen, refresh]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleCopy = async () => {
    setMenuOpen(false);
    const ok = await copyText(link);
    setCopied(ok);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      await createPermission(
        fileId,
        { type: 'user', role: inviteRole, emailAddress: address },
        true,
      );
      setEmail('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share with that person');
    } finally {
      setBusy(false);
    }
  };

  const setLinkAccess = async (open: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (open && !anyone) {
        await createPermission(fileId, { type: 'anyone', role: 'reader' });
      } else if (!open && anyone) {
        await deletePermission(fileId, anyone.id);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update link access');
    } finally {
      setBusy(false);
    }
  };

  const people = permissions.filter((p) => p.type === 'user' || p.type === 'group');

  return (
    <div className="share-control" ref={rootRef}>
      <div className="share-split">
        <button
          type="button"
          className="btn primary share-main"
          disabled={!canShare}
          onClick={() => {
            setMenuOpen(false);
            setDialogOpen(true);
          }}
        >
          Share
        </button>
        <button
          type="button"
          className="btn primary share-arrow"
          aria-label="Share options"
          aria-expanded={menuOpen}
          disabled={!canShare}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ▾
        </button>
      </div>
      {copied && <span className="share-copied">Link copied</span>}
      {menuOpen && (
        <div className="share-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => void handleCopy()}>
            Copy link
          </button>
        </div>
      )}

      {dialogOpen && (
        <div className="share-backdrop" role="presentation" onClick={() => setDialogOpen(false)}>
          <div
            className="share-dialog"
            role="dialog"
            aria-labelledby="share-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="share-dialog-title">Share “{fileName}”</h2>

            <form className="share-invite" onSubmit={(event) => void handleInvite(event)}>
              <input
                type="email"
                placeholder="Add people"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
              />
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as 'reader' | 'writer')}
                disabled={busy}
                aria-label="Access level"
              >
                <option value="reader">Viewer</option>
                <option value="writer">Editor</option>
              </select>
              <button type="submit" className="btn" disabled={busy || !email.trim()}>
                Send
              </button>
            </form>

            <section className="share-section">
              <h3>People with access</h3>
              {loading ? (
                <p className="share-hint">Loading…</p>
              ) : (
                <ul className="share-people">
                  {people.map((person) => (
                    <li key={person.id}>
                      <span>
                        <strong>{person.displayName || person.emailAddress || 'Unknown'}</strong>
                        {person.displayName && person.emailAddress && (
                          <em>{person.emailAddress}</em>
                        )}
                      </span>
                      <span className="share-role">{roleLabel(person.role)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="share-section">
              <h3>General access</h3>
              <label className="share-access">
                <select
                  value={anyone ? 'anyone' : 'restricted'}
                  disabled={busy}
                  onChange={(event) => void setLinkAccess(event.target.value === 'anyone')}
                >
                  <option value="restricted">Restricted</option>
                  <option value="anyone">Anyone with the link</option>
                </select>
                <p className="share-hint">
                  {anyone
                    ? 'Anyone on the internet with the link can view this schedule in the app.'
                    : 'Only people with access can open this schedule.'}
                </p>
              </label>
            </section>

            {error && <p className="inline-error">{error}</p>}

            <p className="share-hint">
              The link opens a read-only view. Recipients still sign in with Google to load the
              file.
            </p>
            <div className="share-footer">
              <button type="button" className="btn ghost" onClick={() => void handleCopy()}>
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <button type="button" className="btn primary" onClick={() => setDialogOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
