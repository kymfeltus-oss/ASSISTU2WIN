import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import { isMissingColumnError } from "@/lib/supabase/postgrest";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Visible rows in the prospecting funnel panel. */
export const DEFAULT_FUNNEL_VISIBLE_ROWS = 5;

/** Explainability thresholds (deterministic, field-driven). */
export const HIGH_ENGAGEMENT_THRESHOLD = 5;
export const STRONG_BUDGET_THRESHOLD = 500_000;
export const RECENT_ACTIVITY_DAYS = 14;

export type ScoreBand = "hot" | "warm" | "cool";

export const SCORE_BAND_HOT_MIN = 85;
export const SCORE_BAND_WARM_MIN = 70;

export type ProspectingLeadSourceRow = {
  readonly id: string;
  readonly lead_name: string;
  readonly target_budget: number | string | null;
  readonly buyer_index_score: number | string | null;
  readonly motivation_urgency: string | null;
  readonly financing_type: string | null;
  readonly last_active_at: string | null;
  readonly has_verified_pre_approval: boolean | null;
  readonly is_first_time_buyer: boolean | null;
  readonly buyer_engagement_count: number | string | null;
};

export type ProspectingFunnelRow = {
  readonly id: string;
  readonly lead_name: string;
  readonly buyer_index_score: number;
  readonly target_budget: number | null;
  readonly scoreBand: ScoreBand;
  readonly explainabilityChips: readonly string[];
};

const PROSPECTING_LEAD_SELECT_WITH_ACTIVITY = `
  id,
  lead_name,
  target_budget,
  buyer_index_score,
  motivation_urgency,
  financing_type,
  last_active_at,
  has_verified_pre_approval,
  is_first_time_buyer,
  buyer_engagement_count
`;

const PROSPECTING_LEAD_SELECT_WITHOUT_LAST_ACTIVE = `
  id,
  lead_name,
  target_budget,
  buyer_index_score,
  motivation_urgency,
  financing_type,
  has_verified_pre_approval,
  is_first_time_buyer,
  buyer_engagement_count
`;

function logProspectingFunnelFailure(
  event: string,
  context: Record<string, unknown>,
): void {
  console.error(`[LEADS_PROSPECTING_FUNNEL] ${event} ${safeJsonStringify(context)}`);
}

export function toBudgetNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function toBuyerIndexScore(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.floor(value)));
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(100, parsed));
    }
  }
  return 0;
}

export function toEngagementCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
}

export function getScoreBand(score: number): ScoreBand {
  if (score >= SCORE_BAND_HOT_MIN) {
    return "hot";
  }
  if (score >= SCORE_BAND_WARM_MIN) {
    return "warm";
  }
  return "cool";
}

export function isRecentActivity(
  lastActiveAt: string | null,
  nowMs: number = Date.now(),
): boolean {
  if (!lastActiveAt) {
    return false;
  }
  const activeMs = new Date(lastActiveAt).getTime();
  if (!Number.isFinite(activeMs)) {
    return false;
  }
  return nowMs - activeMs <= RECENT_ACTIVITY_DAYS * 86_400_000;
}

/**
 * Deterministic explainability chips from lead fields (no AI inference).
 */
export function buildExplainabilityChips(
  row: ProspectingLeadSourceRow,
): readonly string[] {
  const chips: string[] = [];
  const urgency =
    typeof row.motivation_urgency === "string"
      ? row.motivation_urgency.trim().toLowerCase()
      : "";

  if (urgency === "high") {
    chips.push("Urgent timeline");
  }
  if (row.has_verified_pre_approval === true) {
    chips.push("Verified pre-approval");
  }
  if (row.is_first_time_buyer === true) {
    chips.push("First-time buyer");
  }
  if (toEngagementCount(row.buyer_engagement_count) >= HIGH_ENGAGEMENT_THRESHOLD) {
    chips.push("High engagement");
  }
  if (toBudgetNumber(row.target_budget) >= STRONG_BUDGET_THRESHOLD) {
    chips.push("Strong budget");
  }
  if (isRecentActivity(row.last_active_at)) {
    chips.push("Recent activity");
  }

  if (chips.length === 0) {
    return ["Limited data"];
  }

  return chips;
}

export function coerceProspectingLeadRow(
  row: unknown,
): ProspectingLeadSourceRow | null {
  if (row === null || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const leadName = typeof record.lead_name === "string" ? record.lead_name : null;

  if (!id || !leadName) {
    return null;
  }

  return {
    id,
    lead_name: leadName,
    target_budget:
      record.target_budget === null || record.target_budget === undefined
        ? null
        : (record.target_budget as number | string),
    buyer_index_score:
      record.buyer_index_score === null ||
      record.buyer_index_score === undefined
        ? 0
        : (record.buyer_index_score as number | string),
    motivation_urgency:
      typeof record.motivation_urgency === "string"
        ? record.motivation_urgency
        : record.motivation_urgency === null
          ? null
          : null,
    financing_type:
      typeof record.financing_type === "string"
        ? record.financing_type
        : record.financing_type === null
          ? null
          : null,
    last_active_at:
      typeof record.last_active_at === "string"
        ? record.last_active_at
        : record.last_active_at === null
          ? null
          : null,
    has_verified_pre_approval:
      typeof record.has_verified_pre_approval === "boolean"
        ? record.has_verified_pre_approval
        : null,
    is_first_time_buyer:
      typeof record.is_first_time_buyer === "boolean"
        ? record.is_first_time_buyer
        : null,
    buyer_engagement_count:
      record.buyer_engagement_count === null ||
      record.buyer_engagement_count === undefined
        ? 0
        : (record.buyer_engagement_count as number | string),
  };
}

export function rankProspectingFunnelRows(
  rows: readonly ProspectingLeadSourceRow[],
  visibleCount: number = DEFAULT_FUNNEL_VISIBLE_ROWS,
): ProspectingFunnelRow[] {
  return [...rows]
    .map((row) => {
      const score = toBuyerIndexScore(row.buyer_index_score);
      const budget = toBudgetNumber(row.target_budget);

      return {
        id: row.id,
        lead_name: row.lead_name.trim() || "Active buyer",
        buyer_index_score: score,
        target_budget: budget > 0 ? budget : null,
        scoreBand: getScoreBand(score),
        explainabilityChips: buildExplainabilityChips(row),
      };
    })
    .sort((a, b) => {
      if (b.buyer_index_score !== a.buyer_index_score) {
        return b.buyer_index_score - a.buyer_index_score;
      }
      return a.lead_name.localeCompare(b.lead_name);
    })
    .slice(0, visibleCount);
}

export function formatProspectBudget(value: number | null): string | null {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function getScoreBandClassName(band: ScoreBand): string {
  switch (band) {
    case "hot":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "warm":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "cool":
      return "border-slate-600/60 bg-slate-800/60 text-slate-400";
  }
}

async function queryProspectingLeads(
  supabase: SupabaseServerClient,
  select: string,
  fetchLimit: number,
) {
  return supabase
    .from("leads")
    .select(select)
    .order("buyer_index_score", { ascending: false })
    .limit(fetchLimit);
}

/**
 * Top leads by `buyer_index_score` for the prospecting funnel (server-side).
 */
export async function fetchProspectingFunnelLeads(
  supabase: SupabaseServerClient,
  visibleCount: number = DEFAULT_FUNNEL_VISIBLE_ROWS,
): Promise<ProspectingFunnelRow[]> {
  const fetchLimit = Math.max(visibleCount * 4, 20);

  try {
    let result = await queryProspectingLeads(
      supabase,
      PROSPECTING_LEAD_SELECT_WITH_ACTIVITY,
      fetchLimit,
    );

    if (
      result.error &&
      isMissingColumnError(result.error, "last_active_at")
    ) {
      logProspectingFunnelFailure("last_active_at_unavailable", {
        ...serializeSupabaseError(result.error),
      });
      result = await queryProspectingLeads(
        supabase,
        PROSPECTING_LEAD_SELECT_WITHOUT_LAST_ACTIVE,
        fetchLimit,
      );
    }

    if (result.error) {
      logProspectingFunnelFailure("query_failed", {
        visibleCount,
        fetchLimit,
        ...serializeSupabaseError(result.error),
      });
      return [];
    }

    const sourceRows = (result.data ?? [])
      .map((row) => coerceProspectingLeadRow(row))
      .filter((row): row is ProspectingLeadSourceRow => row !== null);

    return rankProspectingFunnelRows(sourceRows, visibleCount);
  } catch (caught: unknown) {
    logProspectingFunnelFailure("unexpected_exception", {
      visibleCount,
      ...serializeSupabaseError(caught),
    });
    return [];
  }
}
