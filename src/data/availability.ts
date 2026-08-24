export type TimeGroup = 'Morning' | 'Afternoon' | 'Evening';

export type AvailabilitySlot = {
  date: string;
  dayLabel: string;
  display: string;
  fullDisplay: string;
  time: string;
  group: TimeGroup;
  artist: 'maya' | 'sophie' | 'isla';
};

type ArtistId = AvailabilitySlot['artist'];

const artistIds: ArtistId[] = ['maya', 'sophie', 'isla'];
const workingDays: Record<ArtistId, number[]> = {
  maya: [1, 2, 4, 5, 6],
  sophie: [1, 3, 4, 5, 6],
  isla: [2, 3, 4, 5, 6],
};
const artistTimes: Record<ArtistId, string[]> = {
  maya: ['09:30', '12:15', '15:30', '17:15'],
  sophie: ['10:00', '13:15', '16:15', '18:30'],
  isla: ['10:30', '14:00', '16:45', '19:00'],
};

const dayFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const shortFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});
const fullFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateFromKey(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function groupForTime(time: string): TimeGroup {
  const hour = Number(time.split(':')[0]);
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

function slotCountFor(date: Date, artistIndex: number) {
  const pattern = [3, 2, 4, 1, 0];
  const seed = date.getDate() + date.getMonth() * 3 + artistIndex * 2;
  return pattern[seed % pattern.length];
}

export const availabilityStart = startOfToday();

function buildAvailability() {
  const slots: AvailabilitySlot[] = [];

  for (let offset = 0; offset < 124; offset += 1) {
    const date = addDays(availabilityStart, offset);
    const day = date.getDay();
    const dateKey = toDateKey(date);

    artistIds.forEach((artist, artistIndex) => {
      if (!workingDays[artist].includes(day)) return;

      const count = slotCountFor(date, artistIndex);
      artistTimes[artist].slice(0, count).forEach((time) => {
        slots.push({
          date: dateKey,
          dayLabel: dayFormatter.format(date).toUpperCase(),
          display: shortFormatter.format(date).toUpperCase(),
          fullDisplay: fullFormatter.format(date),
          time,
          group: groupForTime(time),
          artist,
        });
      });
    });
  }

  return slots;
}

export const availabilityEnd = addDays(availabilityStart, 123);
export const availability: AvailabilitySlot[] = buildAvailability();

export const bookableDates = Array.from(
  new Map(
    availability.map((slot) => [
      slot.date,
      {
        date: slot.date,
        dayLabel: slot.dayLabel,
        display: slot.display,
        fullDisplay: slot.fullDisplay,
      },
    ]),
  ).values(),
);

export function isWorkingDate(date: string, artistId: string) {
  const day = dateFromKey(date).getDay();
  if (day === 0) return false;
  if (artistId === 'any') return true;
  return workingDays[artistId as ArtistId]?.includes(day) ?? false;
}

export function slotsForDate(date: string, artistId: string) {
  return availability.filter(
    (slot) =>
      slot.date === date && (artistId === 'any' || slot.artist === artistId),
  );
}

export function slotsFor(date: string, artistId: string, group: TimeGroup) {
  return slotsForDate(date, artistId).filter((slot) => slot.group === group);
}

export function nextAvailable(artistId: string, fromDate = toDateKey(availabilityStart)) {
  return availability.find(
    (slot) =>
      slot.date >= fromDate && (artistId === 'any' || slot.artist === artistId),
  );
}
