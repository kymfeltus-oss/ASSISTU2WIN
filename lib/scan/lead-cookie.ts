/** HttpOnly-safe name: set from client after public intake; read on `/scan`. */
export const LEAD_ID_COOKIE = "lead_id" as const;

export const LEAD_ID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLeadIdUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

/** Server: read validated lead id from request cookies. */
export function readLeadIdCookie(cookieStore: CookieReader): string | null {
  const raw = cookieStore.get(LEAD_ID_COOKIE)?.value?.trim();
  if (!raw || !isLeadIdUuid(raw)) {
    return null;
  }
  return raw;
}
