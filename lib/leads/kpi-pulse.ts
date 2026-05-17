import { getBusinessDayBounds } from "@/lib/datetime/businessTimezone";
import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import {
  isMissingColumnError,
  type PostgrestErrorLike,
} from "@/lib/supabase/postgrest";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Commission assumption for projected GCI from pipeline velocity. */
export const PROJECTED_GCI_RATE = 0.03;

export const MEETINGS_TODAY_STATUSES = [
  "scheduled",
  "starting",
  "live",
] as const;

export type KpiPulseMetrics = {
  readonly pipelineVelocity: number;
  readonly projectedGci: number;
  readonly hotLeads: number;
  readonly meetingsToday: number;
};

export const EMPTY_KPI_PULSE_METRICS: KpiPulseMetrics = {
  pipelineVelocity: 0,
  projectedGci: 0,
  hotLeads: 0,
  meetingsToday: 0,
};

export type LeadKpiRow = {
  readonly target_budget: number | string | null;
  readonly buyer_index_score: number | string | null;
};

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
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Pipeline velocity, projected GCI, and hot-lead count from lead rows.
 * Null `target_budget` is treated as 0.
 */
export function computeLeadKpiMetrics(
  rows: readonly LeadKpiRow[],
): Pick<KpiPulseMetrics, "pipelineVelocity" | "projectedGci" | "hotLeads"> {
  let pipelineVelocity = 0;
  let hotLeads = 0;

  for (const row of rows) {
    const score = toBuyerIndexScore(row.buyer_index_score);
    const budget = toBudgetNumber(row.target_budget);

    if (score > 70) {
      pipelineVelocity += budget;
    }
    if (score > 85) {
      hotLeads += 1;
    }
  }

  return {
    pipelineVelocity,
    projectedGci: pipelineVelocity * PROJECTED_GCI_RATE,
    hotLeads,
  };
}

function logKpiFailure(
  event: string,
  context: Record<string, unknown>,
): void {
  console.error(`[LEADS_KPI_PULSE] ${event} ${safeJsonStringify(context)}`);
}

async function countMeetingsToday(
  supabase: SupabaseServerClient,
  startIso: string,
  endIso: string,
): Promise<{ readonly count: number; readonly error: PostgrestErrorLike | null }> {
  const primary = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .gte("scheduled_at", startIso)
    .lt("scheduled_at", endIso)
    .in("status", [...MEETINGS_TODAY_STATUSES]);

  if (primary.error && isMissingColumnError(primary.error, "scheduled_at")) {
    const legacy = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("start_time", startIso)
      .lt("start_time", endIso)
      .in("status", [...MEETINGS_TODAY_STATUSES]);

    return {
      count: legacy.count ?? 0,
      error: legacy.error,
    };
  }

  return {
    count: primary.count ?? 0,
    error: primary.error,
  };
}

/**
 * Loads KPI metrics for the leads dashboard.
 * Day window: half-open `[startIso, endIso)` in the resolved business timezone.
 */
export async function fetchKpiPulseMetrics(
  supabase: SupabaseServerClient,
  timeZone: string,
): Promise<KpiPulseMetrics> {
  const { startIso, endIso } = getBusinessDayBounds(timeZone);

  try {
    const [leadsResult, meetingsResult] = await Promise.all([
      supabase.from("leads").select("target_budget, buyer_index_score"),
      countMeetingsToday(supabase, startIso, endIso),
    ]);

    if (leadsResult.error) {
      logKpiFailure("leads_query_failed", {
        timeZone,
        dayStartIso: startIso,
        dayEndIso: endIso,
        ...serializeSupabaseError(leadsResult.error),
      });
      return EMPTY_KPI_PULSE_METRICS;
    }

    if (meetingsResult.error) {
      logKpiFailure("meetings_query_failed", {
        timeZone,
        dayStartIso: startIso,
        dayEndIso: endIso,
        statuses: MEETINGS_TODAY_STATUSES,
        ...serializeSupabaseError(meetingsResult.error),
      });
      const leadRows = (leadsResult.data ?? []) as LeadKpiRow[];
    const leadMetrics = computeLeadKpiMetrics(leadRows);
      return {
        ...leadMetrics,
        meetingsToday: 0,
      };
    }

    const leadRows = (leadsResult.data ?? []) as LeadKpiRow[];
    const leadMetrics = computeLeadKpiMetrics(leadRows);

    return {
      ...leadMetrics,
      meetingsToday: meetingsResult.count,
    };
  } catch (caught: unknown) {
    logKpiFailure("unexpected_exception", {
      timeZone,
      dayStartIso: startIso,
      dayEndIso: endIso,
      ...serializeSupabaseError(caught),
    });
    return EMPTY_KPI_PULSE_METRICS;
  }
}

export function formatKpiCurrency(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "—";
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatKpiCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "—";
  }
  return String(value);
}
