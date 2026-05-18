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

function normalizeBaseUrl(raw: string | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) return "http://localhost:3000";
  return trimmed.replace(/\/$/, "");
}

/** Server or build-time base URL for QR links. */
export function getPublicAppBaseUrl(): string {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
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
