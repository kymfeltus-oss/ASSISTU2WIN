import { LEAD_ID_COOKIE, LEAD_ID_COOKIE_MAX_AGE_SECONDS, isLeadIdUuid } from "@/lib/scan/lead-cookie";

/** Browser: persist lead id after successful QR / public intake. */
export function setLeadIdCookieClient(leadId: string): void {
  if (typeof document === "undefined") return;
  const trimmed = leadId.trim();
  if (!isLeadIdUuid(trimmed)) return;

  document.cookie = [
    `${LEAD_ID_COOKIE}=${encodeURIComponent(trimmed)}`,
    "path=/",
    `max-age=${LEAD_ID_COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
  ].join("; ");
}
