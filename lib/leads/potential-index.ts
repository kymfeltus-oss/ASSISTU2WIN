import type { LeadStatus } from "@/lib/leads/types";

export const PURCHASE_TIMELINES = [
  "Immediate (Under 30 Days)",
  "1-3 Months",
  "3-6 Months",
  "Just Browsing",
] as const;

export type PurchaseTimeline = (typeof PURCHASE_TIMELINES)[number];

export type LeadOperationalHurdles = {
  readonly hurdleLender: boolean;
  readonly hurdleHomeSale: boolean;
  readonly hurdleDownPayment: boolean;
};

export type PotentialHudTier = {
  readonly label: string;
  readonly className: string;
};

const EMPTY_HURDLES: LeadOperationalHurdles = {
  hurdleLender: false,
  hurdleHomeSale: false,
  hurdleDownPayment: false,
};

export function parsePurchaseTimeline(value: unknown): PurchaseTimeline {
  if (typeof value !== "string") return "1-3 Months";
  const trimmed = value.trim();
  if (trimmed === "Immediate") return "Immediate (Under 30 Days)";
  if ((PURCHASE_TIMELINES as readonly string[]).includes(trimmed)) {
    return trimmed as PurchaseTimeline;
  }
  return "1-3 Months";
}

export function parseYesNoBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "Yes";
}

export function parseLeadHurdles(raw: unknown): LeadOperationalHurdles {
  if (typeof raw !== "object" || raw === null) return EMPTY_HURDLES;
  const record = raw as Record<string, unknown>;
  return {
    hurdleLender: record.hurdle_lender === true,
    hurdleHomeSale: record.hurdle_home_sale === true,
    hurdleDownPayment: record.hurdle_down_payment === true,
  };
}

function isImmediateTimeline(timeline: PurchaseTimeline): boolean {
  return timeline === "Immediate (Under 30 Days)";
}

/**
 * Potential Buyer Index (stored as market_readiness_score), clamped 10–99.
 */
export function computePotentialBuyerIndex(
  status: LeadStatus,
  purchaseTimeline: PurchaseTimeline | string,
  hasVerifiedPreApproval: boolean,
  options?: {
    readonly notesText?: string;
    readonly hurdles?: LeadOperationalHurdles;
  },
): number {
  const timeline = parsePurchaseTimeline(purchaseTimeline);
  const hurdles = options?.hurdles ?? EMPTY_HURDLES;
  const notesText = options?.notesText ?? "";

  let score = 50;

  if (status === "Pre-Approved" && isImmediateTimeline(timeline)) {
    score = 95;
  } else if (status === "Active Searching" || timeline === "1-3 Months") {
    score = 75;
  } else if (status === "New Lead" || timeline === "Just Browsing") {
    score = 50;
  }

  if (!hasVerifiedPreApproval) score -= 25;
  if (hurdles.hurdleLender) score -= 15;
  if (hurdles.hurdleHomeSale) score -= 20;
  if (hurdles.hurdleDownPayment) score -= 15;

  const lowerNotes = notesText.toLowerCase();
  if (
    lowerNotes.includes("lease ending") ||
    lowerNotes.includes("expiring") ||
    lowerNotes.includes("relocating")
  ) {
    score += 10;
  }
  if (
    lowerNotes.includes("credit challenge") ||
    lowerNotes.includes("low score") ||
    lowerNotes.includes("bad credit")
  ) {
    score -= 15;
  }

  return Math.max(10, Math.min(99, score));
}

export function getPotentialHudTier(score: number): PotentialHudTier {
  if (score >= 90) {
    return {
      label: "Hot Buyer · Immediate Velocity",
      className:
        "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]",
    };
  }
  if (score >= 70) {
    return {
      label: "Active Buyer · 30–60 Days",
      className:
        "border-[#06B6D4]/30 bg-[#06B6D4]/10 text-[#22D3EE]",
    };
  }
  if (score >= 50) {
    return {
      label: "Nurture Track · Financing Guidance",
      className:
        "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#FBBF24]",
    };
  }
  return {
    label: "Early Stage · Long-Term Tracking",
    className: "border-[#64748B]/30 bg-[#64748B]/10 text-[#94A3B8]",
  };
}
