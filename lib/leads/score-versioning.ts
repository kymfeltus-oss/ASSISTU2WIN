import { parseLeadStatus, type LeadStatus } from "@/lib/leads/types";

export const SCORE_VERSION = "v1.0" as const;

export type ScoreVersion = typeof SCORE_VERSION;

export type ScoreFactor = {
  readonly key: string;
  readonly impact: number;
  readonly reason: string;
};

export type ScoreExplanation = {
  readonly version: ScoreVersion;
  readonly factors: readonly ScoreFactor[];
  readonly computedAt: string;
};

export type LeadScoreInput = {
  readonly target_budget: number | null;
  readonly motivation_urgency: string | null;
  readonly financing_type: string | null;
  readonly has_verified_pre_approval: boolean;
  readonly is_first_time_buyer: boolean;
  readonly buyer_engagement_count: number;
  readonly last_active_at: string | null;
  readonly updated_at: string | null;
  readonly current_status: LeadStatus;
};

export type ComputedLeadScore = {
  readonly score: number;
  readonly explanation: ScoreExplanation;
};

/** Base Potential Index before factor adjustments. */
export const SCORE_BASE = 35;

export const SCORE_VERIFIED_PRE_APPROVAL_IMPACT = 15;
export const SCORE_HIGH_URGENCY_IMPACT = 12;
export const SCORE_MED_URGENCY_IMPACT = 6;

export const SCORE_ENGAGEMENT_TIER_LOW_IMPACT = 4;
export const SCORE_ENGAGEMENT_TIER_MID_IMPACT = 8;
export const SCORE_ENGAGEMENT_TIER_HIGH_IMPACT = 12;
export const SCORE_ENGAGEMENT_HIGH_THRESHOLD = 5;
export const SCORE_ENGAGEMENT_MID_THRESHOLD = 3;

export const SCORE_FIRST_TIME_BUYER_IMPACT = 2;

export const SCORE_BUDGET_STRONG_IMPACT = 10;
export const SCORE_BUDGET_MODERATE_IMPACT = 6;
export const SCORE_BUDGET_ENTRY_IMPACT = 3;
export const SCORE_BUDGET_STRONG_MIN = 500_000;
export const SCORE_BUDGET_MODERATE_MIN = 300_000;
export const SCORE_BUDGET_ENTRY_MIN = 150_000;

export const SCORE_FINANCING_CASH_IMPACT = 5;
export const SCORE_FINANCING_CONV_IMPACT = 3;
export const SCORE_FINANCING_FHA_IMPACT = 2;

export const SCORE_STATUS_UNDER_CONTRACT_IMPACT = 8;
export const SCORE_STATUS_PRE_APPROVED_IMPACT = 6;
export const SCORE_STATUS_ACTIVE_SEARCHING_IMPACT = 4;

export const SCORE_STALE_SOFT_DAYS = 14;
export const SCORE_STALE_HARD_DAYS = 30;
export const SCORE_STALE_SOFT_PENALTY = -5;
export const SCORE_STALE_HARD_PENALTY = -10;

const UUID_V4ISH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidLeadId(value: string): boolean {
  return UUID_V4ISH.test(value.trim());
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toBudget(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toEngagementCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
}

function resolveActivityIso(input: LeadScoreInput): string | null {
  if (input.last_active_at) {
    return input.last_active_at;
  }
  if (input.updated_at) {
    return input.updated_at;
  }
  return null;
}

function daysSince(iso: string, nowMs: number): number | null {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) {
    return null;
  }
  return (nowMs - ms) / 86_400_000;
}

export function coerceLeadScoreInput(
  row: Record<string, unknown>,
): LeadScoreInput | null {
  const budgetRaw = row.target_budget;
  const budget =
    budgetRaw === null || budgetRaw === undefined
      ? null
      : toBudget(budgetRaw);

  return {
    target_budget: budget !== null && budget > 0 ? budget : null,
    motivation_urgency:
      typeof row.motivation_urgency === "string"
        ? row.motivation_urgency
        : null,
    financing_type:
      typeof row.financing_type === "string" ? row.financing_type : null,
    has_verified_pre_approval: row.has_verified_pre_approval === true,
    is_first_time_buyer: row.is_first_time_buyer === true,
    buyer_engagement_count: toEngagementCount(row.buyer_engagement_count),
    last_active_at:
      typeof row.last_active_at === "string" ? row.last_active_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
    current_status: parseLeadStatus(row.current_status),
  };
}

/**
 * Deterministic Potential Buyer Index (0–100) from existing lead fields only.
 */
export function computeLeadScore(
  input: LeadScoreInput,
  now: Date = new Date(),
): ComputedLeadScore {
  const factors: ScoreFactor[] = [];
  const nowMs = now.getTime();

  factors.push({
    key: "base",
    impact: SCORE_BASE,
    reason: "Baseline readiness index",
  });

  if (input.has_verified_pre_approval) {
    factors.push({
      key: "verified_pre_approval",
      impact: SCORE_VERIFIED_PRE_APPROVAL_IMPACT,
      reason: "Verified pre-approval on file",
    });
  }

  const urgency = input.motivation_urgency?.trim().toLowerCase() ?? "";
  if (urgency === "high") {
    factors.push({
      key: "motivation_urgency_high",
      impact: SCORE_HIGH_URGENCY_IMPACT,
      reason: "High purchase motivation",
    });
  } else if (urgency === "med") {
    factors.push({
      key: "motivation_urgency_med",
      impact: SCORE_MED_URGENCY_IMPACT,
      reason: "Moderate purchase motivation",
    });
  }

  const engagement = input.buyer_engagement_count;
  if (engagement >= SCORE_ENGAGEMENT_HIGH_THRESHOLD) {
    factors.push({
      key: "engagement_high",
      impact: SCORE_ENGAGEMENT_TIER_HIGH_IMPACT,
      reason: `Engagement count ${engagement} (high tier)`,
    });
  } else if (engagement >= SCORE_ENGAGEMENT_MID_THRESHOLD) {
    factors.push({
      key: "engagement_mid",
      impact: SCORE_ENGAGEMENT_TIER_MID_IMPACT,
      reason: `Engagement count ${engagement} (mid tier)`,
    });
  } else if (engagement > 0) {
    factors.push({
      key: "engagement_low",
      impact: SCORE_ENGAGEMENT_TIER_LOW_IMPACT,
      reason: `Engagement count ${engagement} (early tier)`,
    });
  }

  if (input.is_first_time_buyer) {
    factors.push({
      key: "first_time_buyer",
      impact: SCORE_FIRST_TIME_BUYER_IMPACT,
      reason: "First-time buyer profile (neutral-positive coaching signal)",
    });
  }

  const budget = input.target_budget ?? 0;
  if (budget >= SCORE_BUDGET_STRONG_MIN) {
    factors.push({
      key: "budget_strong",
      impact: SCORE_BUDGET_STRONG_IMPACT,
      reason: `Target budget at or above $${SCORE_BUDGET_STRONG_MIN.toLocaleString("en-US")}`,
    });
  } else if (budget >= SCORE_BUDGET_MODERATE_MIN) {
    factors.push({
      key: "budget_moderate",
      impact: SCORE_BUDGET_MODERATE_IMPACT,
      reason: `Target budget at or above $${SCORE_BUDGET_MODERATE_MIN.toLocaleString("en-US")}`,
    });
  } else if (budget >= SCORE_BUDGET_ENTRY_MIN) {
    factors.push({
      key: "budget_entry",
      impact: SCORE_BUDGET_ENTRY_IMPACT,
      reason: `Target budget at or above $${SCORE_BUDGET_ENTRY_MIN.toLocaleString("en-US")}`,
    });
  }

  const financing = input.financing_type?.trim().toLowerCase() ?? "";
  if (financing === "cash") {
    factors.push({
      key: "financing_cash",
      impact: SCORE_FINANCING_CASH_IMPACT,
      reason: "Cash financing route",
    });
  } else if (financing === "conv") {
    factors.push({
      key: "financing_conv",
      impact: SCORE_FINANCING_CONV_IMPACT,
      reason: "Conventional financing route",
    });
  } else if (financing === "fha") {
    factors.push({
      key: "financing_fha",
      impact: SCORE_FINANCING_FHA_IMPACT,
      reason: "FHA financing route",
    });
  }

  switch (input.current_status) {
    case "Under Contract":
      factors.push({
        key: "status_under_contract",
        impact: SCORE_STATUS_UNDER_CONTRACT_IMPACT,
        reason: "Under contract milestone",
      });
      break;
    case "Pre-Approved":
      factors.push({
        key: "status_pre_approved",
        impact: SCORE_STATUS_PRE_APPROVED_IMPACT,
        reason: "Pre-approved milestone",
      });
      break;
    case "Active Searching":
      factors.push({
        key: "status_active_searching",
        impact: SCORE_STATUS_ACTIVE_SEARCHING_IMPACT,
        reason: "Active searching milestone",
      });
      break;
    default:
      break;
  }

  const activityIso = resolveActivityIso(input);
  if (activityIso) {
    const inactiveDays = daysSince(activityIso, nowMs);
    if (inactiveDays !== null) {
      if (inactiveDays >= SCORE_STALE_HARD_DAYS) {
        factors.push({
          key: "stale_inactivity_hard",
          impact: SCORE_STALE_HARD_PENALTY,
          reason: `No recent activity in ${Math.floor(inactiveDays)} days`,
        });
      } else if (inactiveDays >= SCORE_STALE_SOFT_DAYS) {
        factors.push({
          key: "stale_inactivity_soft",
          impact: SCORE_STALE_SOFT_PENALTY,
          reason: `Limited recent activity (${Math.floor(inactiveDays)} days)`,
        });
      }
    }
  }

  const rawScore = factors.reduce((sum, factor) => sum + factor.impact, 0);
  const score = clampScore(rawScore);

  return {
    score,
    explanation: {
      version: SCORE_VERSION,
      factors,
      computedAt: now.toISOString(),
    },
  };
}
