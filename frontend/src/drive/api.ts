import { requireAccessToken } from './auth';
import { SCHEDULE_MIME } from './types';
import type { DriveFileMeta, DrivePermission, ScheduleDocument } from './types';
import { serializeDocument } from './document';

const DRIVE = 'https://www.googleapis.com/drive/v3';

async function driveFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = requireAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${DRIVE}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Drive API ${response.status}: ${body.slice(0, 300)}`);
  }
  return response;
}

export async function listSchedules(): Promise<DriveFileMeta[]> {
  const q = encodeURIComponent(
    `mimeType='${SCHEDULE_MIME}' and trashed=false`,
  );
  const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
  const response = await driveFetch(
    `/files?q=${q}&fields=${fields}&orderBy=modifiedTime desc&pageSize=50&spaces=drive`,
  );
  const data = (await response.json()) as { files?: DriveFileMeta[] };
  return data.files ?? [];
}

export async function getFileMeta(fileId: string): Promise<DriveFileMeta> {
  const fields = encodeURIComponent(
    'id,name,modifiedTime,webViewLink,parents,capabilities(canEdit,canShare)',
  );
  const response = await driveFetch(`/files/${encodeURIComponent(fileId)}?fields=${fields}`);
  return (await response.json()) as DriveFileMeta;
}

const PERMISSION_FIELDS = 'permissions(id,type,role,emailAddress,displayName)';

export async function listPermissions(fileId: string): Promise<DrivePermission[]> {
  const response = await driveFetch(
    `/files/${encodeURIComponent(fileId)}/permissions?fields=${encodeURIComponent(PERMISSION_FIELDS)}`,
  );
  const data = (await response.json()) as { permissions?: DrivePermission[] };
  return data.permissions ?? [];
}

export async function createPermission(
  fileId: string,
  body: { type: 'user' | 'anyone'; role: 'reader' | 'writer'; emailAddress?: string },
  notify = false,
): Promise<DrivePermission> {
  const params = new URLSearchParams({
    fields: 'id,type,role,emailAddress,displayName',
    sendNotificationEmail: notify ? 'true' : 'false',
  });
  const response = await driveFetch(
    `/files/${encodeURIComponent(fileId)}/permissions?${params.toString()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  return (await response.json()) as DrivePermission;
}

export async function deletePermission(fileId: string, permissionId: string): Promise<void> {
  await driveFetch(
    `/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(permissionId)}`,
    { method: 'DELETE' },
  );
}

export async function getFileContent(fileId: string): Promise<string> {
  const response = await driveFetch(`/files/${encodeURIComponent(fileId)}?alt=media`);
  return response.text();
}

export async function createFile(
  name: string,
  document: ScheduleDocument,
): Promise<DriveFileMeta> {
  const token = requireAccessToken();
  const metadata = {
    name: name.endsWith('.schedule') ? name : `${name}.schedule`,
    mimeType: SCHEDULE_MIME,
  };

  const createResponse = await fetch(`${DRIVE}/files?fields=id,name,modifiedTime,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });
  if (!createResponse.ok) {
    const body = await createResponse.text();
    throw new Error(`Drive create failed (${createResponse.status}): ${body.slice(0, 300)}`);
  }
  const created = (await createResponse.json()) as DriveFileMeta;
  return updateFileContent(created.id, document);
}

export async function updateFileContent(
  fileId: string,
  document: ScheduleDocument,
): Promise<DriveFileMeta> {
  const token = requireAccessToken();
  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,modifiedTime,webViewLink,parents`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': SCHEDULE_MIME,
      },
      body: serializeDocument(document),
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Drive update failed (${response.status}): ${body.slice(0, 300)}`);
  }
  return (await response.json()) as DriveFileMeta;
}
