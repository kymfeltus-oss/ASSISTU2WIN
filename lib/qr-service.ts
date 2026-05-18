/** Query keys on `/intake` URLs produced by `generateLeadQRUrl`. */
export const QR_INTAKE_PARAM_KEYS = {
  source: "source",
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

/** Query keys on client portal invite URLs (`/auth/signup`). */
export const CLIENT_INVITE_PARAM_KEYS = {
  type: "type",
  ref: "ref",
  target: "target",
} as const;

export const CLIENT_INVITE_TYPE = "client_invite" as const;
export const CLIENT_INVITE_TARGET_SANCTUARY = "my-sanctuary" as const;

export type ClientInviteUrlParams = {
  readonly type: string | null;
  readonly leadId: string | null;
  readonly target: string | null;
};

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

/**
 * Base URL encoded into QR codes (marketing intake + client invite).
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_APP_URL` — set in Vercel / `.env` to your live domain (required for SSR)
 * 2. `window.location.origin` — browser fallback when the admin UI runs on the live site
 * 3. `NEXT_PUBLIC_DEV_APP_URL` — optional LAN/tunnel override in local development only
 */
export function getPublicAppBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return normalizeBaseUrl(appUrl);
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return normalizeBaseUrl(window.location.origin);
  }

  const devUrl = process.env.NEXT_PUBLIC_DEV_APP_URL?.trim();
  if (devUrl && process.env.NODE_ENV === "development") {
    return normalizeBaseUrl(devUrl);
  }

  return normalizeBaseUrl(undefined);
}

function parseBooleanParam(value: string | null, defaultValue: boolean): boolean {
  if (value === null || value.trim().length === 0) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return defaultValue;
}

/** Read QR campaign params from the intake landing URL. */
export function parseQrIntakeSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): QrIntakeUrlParams {
  return {
    source: searchParams.get(QR_INTAKE_PARAM_KEYS.source)?.trim() || null,
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

/** Prefill notes for the communication plan / conversation log. */
export function buildQrIntakePrefillNotes(params: QrIntakeUrlParams): string {
  const { source, location } = params;
  if (source && location) {
    return `Lead acquired via QR scan at: ${location} (Campaign: ${source})`;
  }
  if (source) {
    return `Lead acquired via QR scan (Campaign: ${source})`;
  }
  if (location) {
    return `Lead acquired via QR scan at: ${location}`;
  }
  return "";
}

/**
 * Build the intake URL to encode as a QR code.
 * Example: https://yourapp.com/intake?source=open-house&loc=frisco&auto_welcome=true&market_update=true
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

/** Read client portal invite params from the signup URL. */
export function parseClientInviteSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): ClientInviteUrlParams {
  return {
    type: searchParams.get(CLIENT_INVITE_PARAM_KEYS.type)?.trim() || null,
    leadId: searchParams.get(CLIENT_INVITE_PARAM_KEYS.ref)?.trim() || null,
    target: searchParams.get(CLIENT_INVITE_PARAM_KEYS.target)?.trim() || null,
  };
}

export function isClientPortalInvite(params: ClientInviteUrlParams): boolean {
  return params.type === CLIENT_INVITE_TYPE && params.leadId !== null && isUuid(params.leadId);
}

/**
 * Build the signup URL for a buyer portal invite QR code.
 * Example: /auth/signup?type=client_invite&ref={leadId}&target=my-sanctuary
 */
export function generateClientInviteUrl(leadId: string): string {
  const trimmedLeadId = leadId.trim();
  if (!isUuid(trimmedLeadId)) {
    throw new Error("generateClientInviteUrl requires a valid lead UUID.");
  }

  const baseUrl = getPublicAppBaseUrl();
  const params = new URLSearchParams({
    [CLIENT_INVITE_PARAM_KEYS.type]: CLIENT_INVITE_TYPE,
    [CLIENT_INVITE_PARAM_KEYS.ref]: trimmedLeadId,
    [CLIENT_INVITE_PARAM_KEYS.target]: CLIENT_INVITE_TARGET_SANCTUARY,
  });

  return `${baseUrl}/auth/signup?${params.toString()}`;
}
