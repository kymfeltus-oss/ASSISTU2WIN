/** Format up to 10 US digits as XXX-XXX-XXXX while the user types. */
export function formatUsPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Digits-only phone for storage/API (max 10 US digits). */
export function usPhoneDigitsOnly(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}
