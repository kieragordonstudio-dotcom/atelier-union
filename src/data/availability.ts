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

export const availability: AvailabilitySlot[] = [
  {
    date: '2026-08-22',
    dayLabel: 'SAT',
    display: '22 AUG',
    fullDisplay: 'Saturday 22 August',
    time: '16:15',
    group: 'Afternoon',
    artist: 'maya',
  },
  {
    date: '2026-08-24',
    dayLabel: 'MON',
    display: '24 AUG',
    fullDisplay: 'Monday 24 August',
    time: '09:30',
    group: 'Morning',
    artist: 'sophie',
  },
  {
    date: '2026-08-24',
    dayLabel: 'MON',
    display: '24 AUG',
    fullDisplay: 'Monday 24 August',
    time: '12:45',
    group: 'Afternoon',
    artist: 'sophie',
  },
  {
    date: '2026-08-24',
    dayLabel: 'MON',
    display: '24 AUG',
    fullDisplay: 'Monday 24 August',
    time: '17:15',
    group: 'Evening',
    artist: 'maya',
  },
  {
    date: '2026-08-25',
    dayLabel: 'TUE',
    display: '25 AUG',
    fullDisplay: 'Tuesday 25 August',
    time: '10:45',
    group: 'Morning',
    artist: 'isla',
  },
  {
    date: '2026-08-25',
    dayLabel: 'TUE',
    display: '25 AUG',
    fullDisplay: 'Tuesday 25 August',
    time: '15:30',
    group: 'Afternoon',
    artist: 'isla',
  },
  {
    date: '2026-08-25',
    dayLabel: 'TUE',
    display: '25 AUG',
    fullDisplay: 'Tuesday 25 August',
    time: '18:00',
    group: 'Evening',
    artist: 'sophie',
  },
  {
    date: '2026-08-27',
    dayLabel: 'THU',
    display: '27 AUG',
    fullDisplay: 'Thursday 27 August',
    time: '09:30',
    group: 'Morning',
    artist: 'maya',
  },
  {
    date: '2026-08-27',
    dayLabel: 'THU',
    display: '27 AUG',
    fullDisplay: 'Thursday 27 August',
    time: '13:15',
    group: 'Afternoon',
    artist: 'sophie',
  },
  {
    date: '2026-08-27',
    dayLabel: 'THU',
    display: '27 AUG',
    fullDisplay: 'Thursday 27 August',
    time: '18:30',
    group: 'Evening',
    artist: 'isla',
  },
  {
    date: '2026-08-28',
    dayLabel: 'FRI',
    display: '28 AUG',
    fullDisplay: 'Friday 28 August',
    time: '10:15',
    group: 'Morning',
    artist: 'maya',
  },
  {
    date: '2026-08-28',
    dayLabel: 'FRI',
    display: '28 AUG',
    fullDisplay: 'Friday 28 August',
    time: '14:30',
    group: 'Afternoon',
    artist: 'sophie',
  },
  {
    date: '2026-08-29',
    dayLabel: 'SAT',
    display: '29 AUG',
    fullDisplay: 'Saturday 29 August',
    time: '11:00',
    group: 'Morning',
    artist: 'isla',
  },
  {
    date: '2026-08-29',
    dayLabel: 'SAT',
    display: '29 AUG',
    fullDisplay: 'Saturday 29 August',
    time: '14:30',
    group: 'Afternoon',
    artist: 'maya',
  },
];

export const bookableDates = [
  {
    date: '2026-08-22',
    dayLabel: 'SAT',
    display: '22 AUG',
    fullDisplay: 'Saturday 22 August',
  },
  {
    date: '2026-08-24',
    dayLabel: 'MON',
    display: '24 AUG',
    fullDisplay: 'Monday 24 August',
  },
  {
    date: '2026-08-25',
    dayLabel: 'TUE',
    display: '25 AUG',
    fullDisplay: 'Tuesday 25 August',
  },
  {
    date: '2026-08-26',
    dayLabel: 'WED',
    display: '26 AUG',
    fullDisplay: 'Wednesday 26 August',
  },
  {
    date: '2026-08-27',
    dayLabel: 'THU',
    display: '27 AUG',
    fullDisplay: 'Thursday 27 August',
  },
  {
    date: '2026-08-28',
    dayLabel: 'FRI',
    display: '28 AUG',
    fullDisplay: 'Friday 28 August',
  },
  {
    date: '2026-08-29',
    dayLabel: 'SAT',
    display: '29 AUG',
    fullDisplay: 'Saturday 29 August',
  },
];

export function slotsFor(date: string, artistId: string, group: TimeGroup) {
  return availability.filter((slot) => {
    const artistMatches = artistId === 'any' || slot.artist === artistId;
    return slot.date === date && artistMatches && slot.group === group;
  });
}

export function nextAvailable(artistId: string) {
  return availability.find((slot) => artistId === 'any' || slot.artist === artistId);
}
