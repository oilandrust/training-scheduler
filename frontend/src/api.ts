import type { Activity, ActivityKind, TrainingModule } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function listModules() {
  return request<TrainingModule[]>('/api/modules');
}

export function getModule(id: string) {
  return request<TrainingModule>(`/api/modules/${id}`);
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
