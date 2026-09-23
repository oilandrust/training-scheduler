import { SCHEDULE_MIME } from './types';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  // Required for the app to appear in Drive “Open with” / “New” menus.
  'https://www.googleapis.com/auth/drive.install',
].join(' ');
const STORAGE_KEY = 'training-scheduler.drive.token';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type TokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

type StoredToken = {
  accessToken: string;
  expiresAt: number;
};

let accessToken: string | null = null;
let tokenExpiresAt = 0;
let gisReady: Promise<void> | null = null;
let tokenClient: TokenClient | null = null;

export class AuthRequiredError extends Error {
  override name = 'AuthRequiredError';
}

function getClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!id) {
    throw new Error(
      'Missing VITE_GOOGLE_CLIENT_ID. See GOOGLE_DRIVE_SETUP.md to create an OAuth client.',
    );
  }
  return id;
}

function persistToken(): void {
  if (!accessToken || !tokenExpiresAt) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const payload: StoredToken = { accessToken, expiresAt: tokenExpiresAt };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clearPersistedToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function restoreTokenFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw) as StoredToken;
    if (
      typeof stored.accessToken === 'string' &&
      typeof stored.expiresAt === 'number' &&
      Date.now() < stored.expiresAt - 30_000
    ) {
      accessToken = stored.accessToken;
      tokenExpiresAt = stored.expiresAt;
    } else {
      clearPersistedToken();
    }
  } catch {
    clearPersistedToken();
  }
}

restoreTokenFromStorage();

function applyToken(token: string, expiresInSeconds: number): void {
  accessToken = token;
  tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
  persistToken();
}

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisReady) return gisReady;
  gisReady = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gis]');
    if (existing) {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google Identity Services')),
      );
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.gis = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return gisReady;
}

/** Call on app mount so Sign in can open the popup synchronously on click. */
export async function preloadGis(): Promise<void> {
  await loadGisScript();
  if (!isSignedIn()) {
    await trySilentRefresh().catch(() => {
      /* user must click Sign in */
    });
  }
}

export function isGisReady(): boolean {
  return Boolean(window.google?.accounts?.oauth2);
}

export function isSignedIn(): boolean {
  if (accessToken && Date.now() < tokenExpiresAt - 30_000) return true;
  if (accessToken) {
    accessToken = null;
    tokenExpiresAt = 0;
    clearPersistedToken();
  }
  return false;
}

export function getAccessToken(): string | null {
  if (!isSignedIn()) return null;
  return accessToken;
}

export function signOut(): void {
  accessToken = null;
  tokenExpiresAt = 0;
  clearPersistedToken();
}

/**
 * Try to get a token without UI (prior consent). Safe to call on page load.
 * Resolves false if Google requires an interactive sign-in.
 */
export function trySilentRefresh(): Promise<boolean> {
  if (isSignedIn()) return Promise.resolve(true);
  if (!window.google?.accounts?.oauth2) return Promise.resolve(false);

  return new Promise((resolve) => {
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: SCOPES,
      callback: (response) => {
        if (response.error || !response.access_token) {
          resolve(false);
          return;
        }
        applyToken(response.access_token, Number(response.expires_in ?? 3600));
        resolve(true);
      },
      error_callback: () => resolve(false),
    });

    try {
      tokenClient.requestAccessToken({ prompt: 'none' });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Open the Google OAuth popup. Must be called directly from a user click
 * (no await beforehand), or the browser will block the popup.
 */
export function signIn(options?: { prompt?: string }): Promise<string> {
  if (isSignedIn() && !options?.prompt) {
    return Promise.resolve(accessToken!);
  }

  if (!window.google?.accounts?.oauth2) {
    return Promise.reject(
      new Error('Google sign-in is still loading. Wait a second and click Sign in again.'),
    );
  }

  return new Promise((resolve, reject) => {
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: SCOPES,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(response.error_description || response.error || 'Google sign-in failed'),
          );
          return;
        }
        applyToken(response.access_token, Number(response.expires_in ?? 3600));
        resolve(accessToken!);
      },
      error_callback: (error) => {
        reject(new Error(error.message || error.type || 'Google sign-in cancelled'));
      },
    });

    // After first grant, prefer a quiet refresh; only force consent when asked.
    const prompt =
      options?.prompt ?? (localStorage.getItem(STORAGE_KEY) || accessToken ? '' : 'consent');

    tokenClient.requestAccessToken({ prompt });
  });
}

/** Returns a token if already signed in; does not open a popup. */
export function requireAccessToken(): string {
  const existing = getAccessToken();
  if (existing) return existing;
  throw new AuthRequiredError('Sign in with Google to continue');
}

export { SCOPES, SCHEDULE_MIME };
