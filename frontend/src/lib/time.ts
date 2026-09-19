export const SNAP_MINUTES = 5;
export const PX_PER_MINUTE = 2.4;
export const DEFAULT_DURATION = 15;

export function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatTime(minutes: number) {
  const clamped = Math.max(0, Math.min(24 * 60, minutes));
  const hour24 = Math.floor(clamped / 60) % 24;
  const mins = clamped % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return mins === 0 ? `${hour12} ${suffix}` : `${hour12}:${pad(mins)} ${suffix}`;
}

export function formatTimeShort(minutes: number) {
  const hour24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
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
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
  })
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value;
  return label ?? 'PT';
}
