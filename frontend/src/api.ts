import type { Activity, ActivityKind, TrainingModule } from './types';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  hasDrive: boolean;
};

export type ScheduleSummary = {
  id: string;
  title: string;
  weekendNumber: number;
  startDate: string;
  endDate: string;
  timezone: string;
  training: { id: string; name: string };
  dayCount: number;
  activityCount: number;
  shareUrl: string | null;
};

export type DriveFile = {
  id: string;
  name: string;
  modifiedTime?: string;
  mimeType?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  if (!isForm && !headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers,
  });
  if (response.status === 401 && !path.startsWith('/api/auth/')) {
    throw new Error('Sign in required');
  }
  if (!response.ok) {
    const body = await response.text();
    try {
      const json = JSON.parse(body) as { message?: string | string[] };
      const message = Array.isArray(json.message) ? json.message.join(', ') : json.message;
      throw new Error(message || body || `Request failed: ${response.status}`);
    } catch (err) {
      if (err instanceof Error && err.message !== body) throw err;
      throw new Error(body || `Request failed: ${response.status}`);
    }
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getMe() {
  return request<AuthUser | null>('/api/auth/me');
}

export function requestMagicLink(email: string) {
  return request<{ ok: boolean; debugCode?: string }>('/api/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyMagicLink(email: string, code: string) {
  return request<AuthUser>('/api/auth/magic-link/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function logout() {
  return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
}

export function deleteAccount() {
  return request<{ ok: boolean }>('/api/auth/account', { method: 'DELETE' });
}

export function listSchedules() {
  return request<ScheduleSummary[]>('/api/schedules');
}

export function getSchedule(id: string) {
  return request<TrainingModule & { shareUrl: string | null }>(`/api/schedules/${id}`);
}

export function listModules() {
  return request<TrainingModule[]>('/api/modules');
}

export function getModule(id: string) {
  return getSchedule(id);
}

export function createSchedule(input: {
  title: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  weekendNumber?: number;
  trainingName?: string;
}) {
  return request<TrainingModule>('/api/schedules', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteSchedule(id: string) {
  return request<{ ok: boolean }>(`/api/schedules/${id}`, { method: 'DELETE' });
}

export function createShareLink(id: string) {
  return request<{ token: string; url: string }>(`/api/schedules/${id}/share`, {
    method: 'POST',
  });
}

export function revokeShareLink(id: string) {
  return request<{ ok: boolean }>(`/api/schedules/${id}/share`, { method: 'DELETE' });
}

export function getSharedSchedule(token: string) {
  return request<TrainingModule>(`/api/share/${token}`);
}

export function importPdf(file: File) {
  const body = new FormData();
  body.append('file', file);
  return request<{ scheduleId: string }>('/api/import/pdf', { method: 'POST', body });
}

export function listDriveFiles() {
  return request<DriveFile[]>('/api/import/drive/files');
}

export function getDrivePickerConfig() {
  return request<{ apiKey: string; appId: string; clientId: string }>('/api/import/drive/picker-config');
}

export function getDriveAccessToken() {
  return request<{ accessToken: string }>('/api/import/drive/token');
}

export function importDriveFile(fileId: string) {
  return request<{ scheduleId: string }>('/api/import/drive', {
    method: 'POST',
    body: JSON.stringify({ fileId }),
  });
}

export type ActivityInput = {
  title: string;
  startMinutes: number;
  endMinutes: number;
  kind?: ActivityKind;
  room?: string | null;
  facilitator?: string | null;
  breakoutNotes?: string | null;
  notes?: string | null;
};

export function createActivity(dayId: string, input: ActivityInput) {
  return request<Activity>(`/api/days/${dayId}/activities`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateActivity(id: string, input: Partial<ActivityInput>) {
  return request<Activity>(`/api/activities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteActivity(id: string) {
  return request<{ ok: boolean }>(`/api/activities/${id}`, { method: 'DELETE' });
}
