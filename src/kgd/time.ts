import { DateTime } from 'luxon';

export const SALON_TIMEZONE = 'Europe/London';

export function salonDateTime(value?: string | Date) {
  if (!value) return DateTime.now().setZone(SALON_TIMEZONE);
  return value instanceof Date
    ? DateTime.fromJSDate(value).setZone(SALON_TIMEZONE)
    : DateTime.fromISO(value).setZone(SALON_TIMEZONE);
}

export function salonDateKey(value: string | Date | DateTime) {
  const date = DateTime.isDateTime(value) ? value.setZone(SALON_TIMEZONE) : salonDateTime(value);
  return date.toISODate()!;
}

export function toSalonInput(value?: string) {
  if (!value) return '';
  return salonDateTime(value).toFormat("yyyy-MM-dd'T'HH:mm");
}

export function fromSalonInput(value: string) {
  return DateTime.fromFormat(value, "yyyy-MM-dd'T'HH:mm", {
    zone: SALON_TIMEZONE,
  }).toUTC().toISO();
}
