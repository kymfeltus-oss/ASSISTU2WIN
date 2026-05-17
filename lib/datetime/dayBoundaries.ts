/**
 * Timezone-aware local calendar day boundaries for server-side queries.
 * Uses `Intl` only (no extra deps); safe for Next.js Node runtime.
 */

export type LocalDayBounds = {
  readonly startIso: string;
  readonly endIso: string;
};

type ZonedParts = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
};

function assertValidTimeZone(timeZone: string): void {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch {
    throw new RangeError(`Invalid IANA time zone: ${timeZone}`);
  }
}

function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value ?? "0";
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const hour = read("hour");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: hour === 24 ? 0 : hour,
    minute: read("minute"),
    second: read("second"),
  };
}

/** Offset (ms) from UTC for `instant` interpreted in `timeZone` (DST-aware at that instant). */
function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = getZonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - instant.getTime();
}

/**
 * Maps a wall-clock time in `timeZone` to the corresponding UTC `Date`.
 * Recomputes offset once to handle DST transition edges.
 */
function zonedLocalTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let resultMs = utcGuess - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(new Date(resultMs), timeZone);
  if (secondOffset !== firstOffset) {
    resultMs = utcGuess - secondOffset;
  }
  return new Date(resultMs);
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { readonly year: number; readonly month: number; readonly day: number } {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/**
 * Returns UTC ISO bounds `[startIso, endIso)` for the local calendar day of `date`
 * in `timeZone`. Use with SQL `>= startIso AND < endIso` on timestamptz columns.
 */
export function getLocalDayBounds(
  timeZone: string,
  date: Date = new Date(),
): LocalDayBounds {
  assertValidTimeZone(timeZone);

  const today = getZonedParts(date, timeZone);
  const tomorrow = addCalendarDays(today.year, today.month, today.day, 1);

  const startOfDay = zonedLocalTimeToUtc(
    today.year,
    today.month,
    today.day,
    0,
    0,
    0,
    timeZone,
  );
  const startOfNextDay = zonedLocalTimeToUtc(
    tomorrow.year,
    tomorrow.month,
    tomorrow.day,
    0,
    0,
    0,
    timeZone,
  );

  return {
    startIso: startOfDay.toISOString(),
    endIso: startOfNextDay.toISOString(),
  };
}
