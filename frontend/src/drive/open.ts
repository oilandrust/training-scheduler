import type { DriveOpenState } from './types';

function parseDriveState(raw: string | null): DriveOpenState | null {
  if (!raw || raw === '{state}') return null;
  try {
    return JSON.parse(raw) as DriveOpenState;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw)) as DriveOpenState;
    } catch {
      return null;
    }
  }
}

export function resolveFileId(search = window.location.search): string | null {
  const params = new URLSearchParams(search);
  const direct = params.get('fileId');
  if (direct) return direct;
  const state = parseDriveState(params.get('state'));
  if (!state) return null;
  const ids = state.ids;
  if (typeof ids === 'string' && ids.length > 0) {
    return ids.split(',')[0]?.trim() || null;
  }
  if (Array.isArray(ids) && ids[0]) return ids[0];
  const exportIds = state.exportIds;
  if (typeof exportIds === 'string' && exportIds.length > 0) {
    return exportIds.split(',')[0]?.trim() || null;
  }
  if (Array.isArray(exportIds) && exportIds[0]) return exportIds[0];
  return null;
}

export function appOrigin(): string {
  return window.location.origin;
}

export function viewUrl(fileId: string): string {
  return `${appOrigin()}/view?fileId=${encodeURIComponent(fileId)}`;
}

export function editUrl(fileId: string): string {
  return `${appOrigin()}/edit?fileId=${encodeURIComponent(fileId)}`;
}
