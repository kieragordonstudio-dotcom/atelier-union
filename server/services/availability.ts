import { and, eq, gt, inArray, lt } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { z } from 'zod';
import type { Database } from '../db/database.js';
import {
  appointments,
  artists,
  artistServices,
  businesses,
  businessSettings,
  timeOff,
  workingHours,
} from '../db/schema.js';
import { AppError } from '../errors.js';
import {
  bookingSelectionSchema,
  resolveBookingSelection,
} from './selection.js';

export const availabilityQuerySchema = bookingSelectionSchema.extend({
  artistSlug: z.string().min(1).max(120).default('any'),
  from: z.string().date(),
  to: z.string().date(),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

type BusyRange = { artistId: string; startsAt: Date; endsAt: Date };

function overlaps(start: DateTime, end: DateTime, busy: BusyRange, bufferMinutes = 0) {
  const busyStart = DateTime.fromJSDate(busy.startsAt);
  const busyEnd = DateTime.fromJSDate(busy.endsAt).plus({ minutes: bufferMinutes });
  return start < busyEnd && end.plus({ minutes: bufferMinutes }) > busyStart;
}

function timeGroup(time: string) {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return 'Morning' as const;
  if (hour < 17) return 'Afternoon' as const;
  return 'Evening' as const;
}

function displayDate(date: DateTime) {
  return {
    dayLabel: date.toFormat('ccc').toUpperCase(),
    display: date.toFormat('d LLL').toUpperCase(),
    fullDisplay: date.toFormat('cccc d LLLL'),
  };
}

export async function calculateAvailability(
  db: Database,
  businessId: string,
  rawInput: AvailabilityQuery,
) {
  const input = availabilityQuerySchema.parse(rawInput);
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  const [settings] = await db
    .select()
    .from(businessSettings)
    .where(eq(businessSettings.businessId, businessId))
    .limit(1);
  if (!business || !settings) throw new AppError(404, 'BUSINESS_NOT_FOUND', 'Salon not found.');

  const selection = await resolveBookingSelection(db, businessId, input);
  const from = DateTime.fromISO(input.from, { zone: business.timezone }).startOf('day');
  const to = DateTime.fromISO(input.to, { zone: business.timezone }).startOf('day');
  if (!from.isValid || !to.isValid || to < from || to.diff(from, 'days').days > 62) {
    throw new AppError(400, 'INVALID_DATE_RANGE', 'Choose a valid date range of 63 days or fewer.');
  }

  const eligibleRows = await db
    .select({ artist: artists })
    .from(artists)
    .innerJoin(
      artistServices,
      and(
        eq(artistServices.artistId, artists.id),
        eq(artistServices.serviceId, selection.base.id),
      ),
    )
    .where(
      and(
        eq(artists.businessId, businessId),
        eq(artists.active, true),
        input.artistSlug === 'any' ? undefined : eq(artists.slug, input.artistSlug),
      ),
    );
  const eligibleArtists = eligibleRows.map((row) => row.artist);
  if (!eligibleArtists.length) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', 'No eligible Nail Artist was found.');
  }

  const artistIds = eligibleArtists.map((artist) => artist.id);
  const rangeStart = from.toUTC().toJSDate();
  const rangeEnd = to.endOf('day').toUTC().toJSDate();
  const [hours, blocks, bookings] = await Promise.all([
    db
      .select()
      .from(workingHours)
      .where(
        and(
          eq(workingHours.businessId, businessId),
          eq(workingHours.active, true),
          inArray(workingHours.artistId, artistIds),
        ),
      ),
    db
      .select()
      .from(timeOff)
      .where(
        and(
          eq(timeOff.businessId, businessId),
          inArray(timeOff.artistId, artistIds),
          lt(timeOff.startsAt, rangeEnd),
          gt(timeOff.endsAt, rangeStart),
        ),
      ),
    db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.businessId, businessId),
          inArray(appointments.artistId, artistIds),
          inArray(appointments.status, ['confirmed', 'completed']),
          lt(appointments.startsAt, rangeEnd),
          gt(appointments.endsAt, rangeStart),
        ),
      ),
  ]);

  const now = DateTime.now().setZone(business.timezone);
  const earliest = now.plus({ hours: settings.minimumNoticeHours });
  const latest = now.plus({ days: settings.maximumAdvanceDays }).endOf('day');
  const slots: Array<{
    date: string;
    startsAt: string;
    time: string;
    group: 'Morning' | 'Afternoon' | 'Evening';
    artist: string;
    artistId: string;
    artistName: string;
    dayLabel: string;
    display: string;
    fullDisplay: string;
  }> = [];
  const dayWorking = new Map<string, boolean>();

  for (let date = from; date <= to; date = date.plus({ days: 1 })) {
    const dateKey = date.toISODate()!;
    let working = false;

    for (const artist of eligibleArtists) {
      const artistHours = hours.find(
        (item) => item.artistId === artist.id && item.dayOfWeek === date.weekday,
      );
      if (!artistHours) continue;
      working = true;

      const start = DateTime.fromISO(`${dateKey}T${artistHours.startTime}`, {
        zone: business.timezone,
      });
      const close = DateTime.fromISO(`${dateKey}T${artistHours.endTime}`, {
        zone: business.timezone,
      });
      const artistBusy: BusyRange[] = [
        ...blocks
          .filter((item) => item.artistId === artist.id)
          .map((item) => ({ artistId: artist.id, startsAt: item.startsAt, endsAt: item.endsAt })),
        ...bookings
          .filter((item) => item.artistId === artist.id)
          .map((item) => ({ artistId: artist.id, startsAt: item.startsAt, endsAt: item.endsAt })),
      ];

      for (
        let candidate = start;
        candidate.plus({ minutes: selection.durationMinutes }) <= close;
        candidate = candidate.plus({ minutes: 15 })
      ) {
        const candidateEnd = candidate.plus({ minutes: selection.durationMinutes });
        if (candidate < earliest || candidate > latest) continue;
        if (
          artistBusy.some((busy) =>
            overlaps(candidate, candidateEnd, busy, settings.bufferMinutes),
          )
        ) {
          continue;
        }
        const formatted = displayDate(date);
        const time = candidate.toFormat('HH:mm');
        slots.push({
          date: dateKey,
          startsAt: candidate.toUTC().toISO()!,
          time,
          group: timeGroup(time),
          artist: artist.slug,
          artistId: artist.id,
          artistName: artist.name,
          ...formatted,
        });
      }
    }

    dayWorking.set(dateKey, working);
  }

  const days = [];
  for (let date = from; date <= to; date = date.plus({ days: 1 })) {
    const dateKey = date.toISODate()!;
    const count = slots.filter((slot) => slot.date === dateKey).length;
    const working = dayWorking.get(dateKey) ?? false;
    days.push({
      date: dateKey,
      slotCount: count,
      status: !working ? 'closed' : count >= 3 ? 'good' : count > 0 ? 'limited' : 'full',
      ...displayDate(date),
    });
  }

  return {
    timezone: business.timezone,
    durationMinutes: selection.durationMinutes,
    totalPence: selection.totalPence,
    days,
    slots,
  };
}
