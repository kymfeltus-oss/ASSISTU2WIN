/** Query keys on `/intake` URLs produced by `generateLeadQRUrl`. */
export const QR_INTAKE_PARAM_KEYS = {
  /** Campaign / event source (`src` preferred; `source` supported for legacy links). */
  source: "src",
  sourceLegacy: "source",
  location: "loc",
  autoWelcome: "auto_welcome",
  marketUpdate: "market_update",
} as const;

export type QrIntakeUrlParams = {
  readonly source: string | null;
  readonly location: string | null;
  readonly autoWelcome: boolean;
  readonly marketUpdate: boolean;
};

export type GenerateLeadQROptions = {
  readonly autoWelcome?: boolean;
  readonly marketUpdate?: boolean;
};

/** Query keys on athlete portal invite URLs (`/auth/signup`). */
export const CLIENT_INVITE_PARAM_KEYS = {
  ref: "ref",
  /** Legacy invite links may include type + target. */
  type: "type",
  target: "target",
} as const;

export const CLIENT_INVITE_TYPE = "client_invite" as const;
export const CLIENT_INVITE_TARGET_PORTAL = "my-sanctuary" as const;

/** @deprecated Use CLIENT_INVITE_TARGET_PORTAL */
export const CLIENT_INVITE_TARGET_SANCTUARY = CLIENT_INVITE_TARGET_PORTAL;

export type ClientInviteUrlParams = {
  readonly type: string | null;
  readonly leadId: string | null;
  readonly target: string | null;
};

const PLACEHOLDER_HOST_FRAGMENTS = [
  "your-domain.com",
  "yourdomain.com",
  "example.com",
  "placeholder.com",
  "changeme.com",
] as const;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeBaseUrl(raw: string | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) return "http://localhost:3000";
  return trimmed.replace(/\/$/, "");
}

function isPlaceholderHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return PLACEHOLDER_HOST_FRAGMENTS.some((fragment) => host.includes(fragment));
}

/**
 * Base URL encoded into QR codes (marketing intake + athlete portal invite).
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_APP_URL` — required for production QR generation
 * 2. `window.location.origin` — browser fallback when admin UI runs on the live site
 * 3. `NEXT_PUBLIC_DEV_APP_URL` — optional LAN/tunnel override in local development only
 */
export function getPublicAppBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return assertSafePublicBaseUrl(normalizeBaseUrl(appUrl));
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return assertSafePublicBaseUrl(normalizeBaseUrl(window.location.origin));
  }

  const devUrl = process.env.NEXT_PUBLIC_DEV_APP_URL?.trim();
  if (devUrl && process.env.NODE_ENV === "development") {
    return normalizeBaseUrl(devUrl);
  }

  return normalizeBaseUrl(undefined);
}

/**
 * Rejects placeholder marketing domains in production so QR codes never encode
 * `your-domain.com` style URLs.
 */
export function assertSafePublicBaseUrl(baseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("Invalid NEXT_PUBLIC_APP_URL — must be a full https URL.");
  }

  if (process.env.NODE_ENV === "production" && isPlaceholderHost(parsed.hostname)) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is set to a placeholder domain. Configure your live AssistU2Win URL before generating QR codes.",
    );
  }

  return `${parsed.origin}`;
}

function parseBooleanParam(value: string | null, defaultValue: boolean): boolean {
  if (value === null || value.trim().length === 0) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return defaultValue;
}

function readCampaignSource(searchParams: Pick<URLSearchParams, "get">): string | null {
  return (
    searchParams.get(QR_INTAKE_PARAM_KEYS.source)?.trim() ||
    searchParams.get(QR_INTAKE_PARAM_KEYS.sourceLegacy)?.trim() ||
    null
  );
}

/** Read QR campaign params from the intake landing URL (`src` + `loc`). */
export function parseQrIntakeSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): QrIntakeUrlParams {
  return {
    source: readCampaignSource(searchParams),
    location: searchParams.get(QR_INTAKE_PARAM_KEYS.location)?.trim() || null,
    autoWelcome: parseBooleanParam(
      searchParams.get(QR_INTAKE_PARAM_KEYS.autoWelcome),
      true,
    ),
    marketUpdate: parseBooleanParam(
      searchParams.get(QR_INTAKE_PARAM_KEYS.marketUpdate),
      true,
    ),
  };
}

/** Prefill communication notes for event / showcase QR scans. */
export function buildQrIntakePrefillNotes(params: QrIntakeUrlParams): string {
  const { source, location } = params;
  if (location && source) {
    return `Lead captured at: ${location} (${source})`;
  }
  if (location) {
    return `Lead captured at: ${location}`;
  }
  if (source) {
    return `Lead captured at: ${source}`;
  }
  return "";
}

/**
 * Marketing intake QR — new leads at events.
 * Example: https://yourapp.com/intake?src=dallas-showcase&loc=Dallas+Showcase&auto_welcome=true
 */
export function generateLeadQRUrl(
  campaignId: string,
  location: string,
  options?: GenerateLeadQROptions,
): string {
  const baseUrl = getPublicAppBaseUrl();
  const autoWelcome = options?.autoWelcome !== false;
  const marketUpdate = options?.marketUpdate !== false;

  const params = new URLSearchParams({
    [QR_INTAKE_PARAM_KEYS.source]: campaignId.trim(),
    [QR_INTAKE_PARAM_KEYS.location]: location.trim(),
    [QR_INTAKE_PARAM_KEYS.autoWelcome]: autoWelcome ? "true" : "false",
    [QR_INTAKE_PARAM_KEYS.marketUpdate]: marketUpdate ? "true" : "false",
  });

  return `${baseUrl}/intake?${params.toString()}`;
}

/** @alias generateLeadQRUrl */
export const generateMarketingIntakeUrl = generateLeadQRUrl;

/**
 * Master physical QR — smart gate at `/scan` (new lead → intake, returning → download).
 * Encode this URL on the printed AssistU2Win master QR.
 */
export function generateMasterScanUrl(): string {
  return `${getPublicAppBaseUrl()}/scan`;
}

/** Read athlete portal invite params from the signup URL. */
export function parseClientInviteSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): ClientInviteUrlParams {
  return {
    type: searchParams.get(CLIENT_INVITE_PARAM_KEYS.type)?.trim() || null,
    leadId: searchParams.get(CLIENT_INVITE_PARAM_KEYS.ref)?.trim() || null,
    target: searchParams.get(CLIENT_INVITE_PARAM_KEYS.target)?.trim() || null,
  };
}

/** Fast Track invite when `ref` is a valid lead UUID (legacy `type=client_invite` also accepted). */
export function isClientPortalInvite(params: ClientInviteUrlParams): boolean {
  if (params.leadId === null || !isUuid(params.leadId)) {
    return false;
  }
  if (params.type === null) {
    return true;
  }
  return params.type === CLIENT_INVITE_TYPE;
}

/**
 * Athlete portal Fast Track QR — links a lead to a new AssistU2Win account.
 * Example: /auth/signup?ref={leadId}
 */
export function generateClientInviteUrl(leadId: string): string {
  const trimmedLeadId = leadId.trim();
  if (!isUuid(trimmedLeadId)) {
    throw new Error("generateClientInviteUrl requires a valid lead UUID.");
  }

  const baseUrl = getPublicAppBaseUrl();
  const params = new URLSearchParams({
    [CLIENT_INVITE_PARAM_KEYS.ref]: trimmedLeadId,
  });

  return `${baseUrl}/auth/signup?${params.toString()}`;
}

/** @alias generateClientInviteUrl */
export const generateAthletePortalInviteUrl = generateClientInviteUrl;
