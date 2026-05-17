import { getLocalDayBounds } from "@/lib/datetime/dayBoundaries";
import { safeJsonStringify } from "@/lib/supabase/errors";

export const DEFAULT_BUSINESS_TIMEZONE = "America/Chicago";

const PROFILE_TIMEZONE_KEYS = [
  "timezone",
  "business_timezone",
  "time_zone",
  "org_timezone",
] as const;

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function readProfileTimeZone(
  profile: Record<string, unknown>,
): string | null {
  for (const key of PROFILE_TIMEZONE_KEYS) {
    const value = profile[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0 && isValidIanaTimeZone(trimmed)) {
        return trimmed;
      }
    }
  }
  return null;
}

/** Client / env fallback when profile timezone is unavailable. */
export function resolveBusinessTimeZoneFromEnv(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_TIMEZONE?.trim();
  if (fromEnv && isValidIanaTimeZone(fromEnv)) {
    return fromEnv;
  }
  return DEFAULT_BUSINESS_TIMEZONE;
}

/** Priority: profile → NEXT_PUBLIC_APP_TIMEZONE → America/Chicago. */
export async function resolveBusinessTimeZone(
  supabase: unknown,
  userId: string | undefined,
): Promise<string> {
  if (userId && supabase !== null && typeof supabase === "object") {
    const client = supabase as {
      from(table: "profiles"): {
        select(columns: string): {
          eq(column: "id", value: string): {
            maybeSingle(): Promise<{
              data: Record<string, unknown> | null;
              error: { readonly message?: string } | null;
            }>;
          };
        };
      };
    };

    const { data: profile, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!error && profile) {
      const fromProfile = readProfileTimeZone(profile);
      if (fromProfile) {
        return fromProfile;
      }
    }
  }

  return resolveBusinessTimeZoneFromEnv();
}

/**
 * Local calendar day in business TZ — not UTC midnight.
 * Returns half-open UTC ISO bounds `[startIso, endIso)` for timestamptz filters.
 */
export function getBusinessDayBounds(
  timeZone: string,
  baseDate: Date = new Date(),
): { readonly startIso: string; readonly endIso: string } {
  try {
    return getLocalDayBounds(timeZone, baseDate);
  } catch {
    console.warn(
      "[BUSINESS_TIMEZONE] invalid_timezone",
      safeJsonStringify({
        requestedTimeZone: timeZone,
        fallbackTimeZone: DEFAULT_BUSINESS_TIMEZONE,
      }),
    );
    return getLocalDayBounds(DEFAULT_BUSINESS_TIMEZONE, baseDate);
  }
}
