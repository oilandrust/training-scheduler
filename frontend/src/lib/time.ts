export const SNAP_MINUTES = 5;
export const PX_PER_MINUTE = 2.4;
export const DEFAULT_DURATION = 15;

export function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatTime(minutes: number) {
  const tod = ((Math.round(minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(tod / 60);
  const mins = tod % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return mins === 0 ? `${hour12} ${suffix}` : `${hour12}:${pad(mins)} ${suffix}`;
}

export function formatTimeShort(minutes: number) {
  const tod = ((Math.round(minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(tod / 60);
  const mins = tod % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return mins === 0 ? `${hour12}` : `${hour12}:${pad(mins)}`;
}

export function toTimeInput(minutes: number) {
  const hour24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${pad(hour24)}:${pad(mins)}`;
}

export function fromTimeInput(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

export function snap(minutes: number, step = SNAP_MINUTES) {
  return Math.round(minutes / step) * step;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatDateLabel(isoDate: string) {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(isoDate: string) {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDuration(minutes: number) {
  const total = Math.max(0, minutes);
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

export const DEFAULT_TIMEZONE = 'America/Los_Angeles';

function zonedParts(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** True when the two IANA zones show a different offset (right now). */
export function timeZonesAreDifferent(a: string, b: string): boolean {
  if (a === b) return false;
  return nowMinutes(a) !== nowMinutes(b) || timezoneAbbreviation(a) !== timezoneAbbreviation(b);
}

/** Interpret wall-clock minutes on `dateYmd` in `timeZone` as a UTC instant. */
function wallClockToUtc(dateYmd: string, minutes: number, timeZone: string): Date {
  const [y, mo, d] = dateYmd.slice(0, 10).split('-').map(Number);
  const dayOffset = Math.floor(minutes / (24 * 60));
  const tod = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(tod / 60);
  const mi = tod % 60;
  const base = new Date(Date.UTC(y, mo - 1, d + dayOffset, h, mi, 0));

  let utcMs = base.getTime();
  for (let i = 0; i < 3; i++) {
    const parts = zonedParts(new Date(utcMs), timeZone);
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const want = Date.UTC(y, mo - 1, d + dayOffset, h, mi);
    utcMs += want - asUtc;
  }
  return new Date(utcMs);
}

function utcToWallMinutes(utc: Date, timeZone: string, anchorYmd: string): number {
  const parts = zonedParts(utc, timeZone);
  const [ay, am, ad] = anchorYmd.slice(0, 10).split('-').map(Number);
  const anchorUtc = Date.UTC(ay, am - 1, ad);
  const wallUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const dayDelta = Math.round((wallUtc - anchorUtc) / 86_400_000);
  return dayDelta * 24 * 60 + parts.hour * 60 + parts.minute;
}

/**
 * Convert wall-clock minutes from one IANA zone to another on a training calendar date.
 * Result may be outside 0–1440 when the local day differs.
 */
export function convertWallMinutes(
  dateYmd: string,
  minutes: number,
  fromTz: string,
  toTz: string,
): number {
  if (fromTz === toTz) return minutes;
  const utc = wallClockToUtc(dateYmd, minutes, fromTz);
  return utcToWallMinutes(utc, toTz, dateYmd);
}

export function nowMinutes(timeZone = DEFAULT_TIMEZONE) {
  const { hour, minute } = zonedParts(new Date(), timeZone);
  return hour * 60 + minute;
}

export function isSameCalendarDay(isoDate: string, timeZone = DEFAULT_TIMEZONE) {
  const { year, month, day } = zonedParts(new Date(), timeZone);
  const [isoYear, isoMonth, isoDay] = isoDate.slice(0, 10).split('-').map(Number);
  return isoYear === year && isoMonth === month && isoDay === day;
}

export function timezoneAbbreviation(timeZone = DEFAULT_TIMEZONE) {
  const now = new Date();
  const candidates = ['en-US', 'en-GB', 'de-DE', 'fr-FR'].map(
    (locale) =>
      new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' })
        .formatToParts(now)
        .find((part) => part.type === 'timeZoneName')?.value,
  );
  const named = candidates.find(
    (label) => label && !/^(GMT|UTC)/i.test(label),
  );
  return named ?? candidates.find(Boolean) ?? 'TZ';
}
