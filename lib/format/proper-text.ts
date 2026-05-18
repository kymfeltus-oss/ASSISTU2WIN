import { formatUsPhoneInput } from "@/lib/format/us-phone";

/** Title-case each word (handles spaces, hyphens, apostrophes, and "&"). */
export function formatProperWordsInput(raw: string): string {
  return raw.replace(/[a-zA-Z]+(?:'[a-zA-Z]+)?/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

/** Capitalize the first letter and the letter after sentence-ending punctuation. */
export function formatSentenceCaseInput(raw: string): string {
  if (raw.length === 0) return raw;
  const withFirst = raw.charAt(0).toUpperCase() + raw.slice(1);
  return withFirst.replace(/([.!?]\s+)([a-z])/g, (_match, punct: string, letter: string) => {
    return `${punct}${letter.toUpperCase()}`;
  });
}

/** US state abbreviation (letters only, max 2, uppercase). */
export function formatUsStateInput(raw: string): string {
  return raw.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
}

/** Normalize email while typing. */
export function formatEmailInput(raw: string): string {
  return raw.toLowerCase();
}

export type IntakeWordFormat = "proper-words" | "sentence" | "state" | "email" | "phone";

export function applyIntakeWordFormat(
  value: string,
  format: IntakeWordFormat | undefined,
): string {
  if (!format) return value;
  switch (format) {
    case "proper-words":
      return formatProperWordsInput(value);
    case "sentence":
      return formatSentenceCaseInput(value);
    case "state":
      return formatUsStateInput(value);
    case "email":
      return formatEmailInput(value);
    case "phone":
      return formatUsPhoneInput(value);
    default: {
      const _exhaustive: never = format;
      return _exhaustive;
    }
  }
}
