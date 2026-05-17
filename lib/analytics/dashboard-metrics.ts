import { PROJECTED_GCI_RATE } from "@/lib/leads/kpi-pulse";
import { parseLeadStatus, type LeadStatus } from "@/lib/leads/types";
import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import type { createClient } from "@/lib/supabase/server";
import type {
  ConversionVelocitySuccessResponse,
  SourceRoiRow,
  VelocityStageKey,
} from "@/lib/analytics/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export const HOT_LEAD_SCORE_MIN = 85;
export const PIPELINE_SCORE_MIN = 70;
export const DEFAULT_SOURCE_ROI_LIMIT = 10;
export const MAX_SOURCE_ROI_LIMIT = 50;

const LEAD_ANALYTICS_SELECT = `
  id,
  lead_source,
  created_at,
  current_status,
  target_budget,
  buyer_index_score
`;

const APPOINTMENT_ANALYTICS_SELECT = `
  id,
  lead_id,
  status,
  scheduled_at
`;

const APPOINTMENT_SCHEDULED_STATUSES = new Set(["scheduled", "starting"]);
const APPOINTMENT_LIVE_STATUSES = new Set(["live", "completed"]);

export type DateRange = {
  readonly fromIso: string;
  readonly toIso: string;
};

export type AnalyticsLeadRow = {
  readonly id: string;
  readonly lead_source: string;
  readonly created_at: string;
  readonly current_status: LeadStatus;
  readonly target_budget: number | null;
  readonly buyer_index_score: number;
};

export type AnalyticsAppointmentRow = {
  readonly id: string;
  readonly lead_id: string;
  readonly status: string;
  readonly scheduled_at: string;
};

export type ParseDateRangeResult =
  | { readonly ok: true; readonly range: DateRange }
  | { readonly ok: false; readonly message: string };

export type ParseLimitResult =
  | { readonly ok: true; readonly limit: number }
  | { readonly ok: false; readonly message: string };

function logAnalyticsFailure(
  route: string,
  event: string,
  context: Record<string, unknown>,
): void {
  console.error(
    `[ANALYTICS_${route}] ${event} ${safeJsonStringify(context)}`,
  );
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

export function normalizeLeadSource(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "Unknown";
}

export function parseIsoDateRange(
  fromParam: string | null,
  toParam: string | null,
): ParseDateRangeResult {
  if (!fromParam?.trim() || !toParam?.trim()) {
    return {
      ok: false,
      message: "Query params `from` and `to` (ISO timestamps) are required.",
    };
  }

  const fromMs = Date.parse(fromParam);
  const toMs = Date.parse(toParam);

  if (!Number.isFinite(fromMs)) {
    return { ok: false, message: "`from` must be a valid ISO timestamp." };
  }
  if (!Number.isFinite(toMs)) {
    return { ok: false, message: "`to` must be a valid ISO timestamp." };
  }
  if (fromMs >= toMs) {
    return { ok: false, message: "`from` must be earlier than `to`." };
  }

  return {
    ok: true,
    range: {
      fromIso: new Date(fromMs).toISOString(),
      toIso: new Date(toMs).toISOString(),
    },
  };
}

export function parseSourceRoiLimit(
  limitParam: string | null,
): ParseLimitResult {
  if (limitParam === null || limitParam.trim() === "") {
    return { ok: true, limit: DEFAULT_SOURCE_ROI_LIMIT };
  }

  const parsed = Number.parseInt(limitParam, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return { ok: false, message: "`limit` must be a positive integer." };
  }

  return {
    ok: true,
    limit: Math.min(parsed, MAX_SOURCE_ROI_LIMIT),
  };
}

export function coerceAnalyticsLeadRow(row: unknown): AnalyticsLeadRow | null {
  if (row === null || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const createdAt =
    typeof record.created_at === "string" ? record.created_at : null;

  if (!id || !createdAt) {
    return null;
  }

  const budgetRaw = record.target_budget;
  const budgetValue =
    budgetRaw === null || budgetRaw === undefined
      ? 0
      : toBudgetNumber(budgetRaw);

  return {
    id,
    lead_source: normalizeLeadSource(record.lead_source),
    created_at: createdAt,
    current_status: parseLeadStatus(record.current_status),
    target_budget: budgetValue > 0 ? budgetValue : null,
    buyer_index_score: toBuyerIndexScore(record.buyer_index_score),
  };
}

export function coerceAnalyticsAppointmentRow(
  row: unknown,
): AnalyticsAppointmentRow | null {
  if (row === null || typeof row !== "object") {
    return null;
  }

  const record = row as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const leadId = typeof record.lead_id === "string" ? record.lead_id : null;
  const status = typeof record.status === "string" ? record.status : null;
  const scheduledAt =
    typeof record.scheduled_at === "string" ? record.scheduled_at : null;

  if (!id || !leadId || !status || !scheduledAt) {
    return null;
  }

  return {
    id,
    lead_id: leadId,
    status,
    scheduled_at: scheduledAt,
  };
}

export function groupAppointmentsByLeadId(
  appointments: readonly AnalyticsAppointmentRow[],
): Map<string, AnalyticsAppointmentRow[]> {
  const map = new Map<string, AnalyticsAppointmentRow[]>();

  for (const appointment of appointments) {
    const existing = map.get(appointment.lead_id);
    if (existing) {
      existing.push(appointment);
    } else {
      map.set(appointment.lead_id, [appointment]);
    }
  }

  return map;
}

export function aggregateSourceRoi(
  leads: readonly AnalyticsLeadRow[],
  limit: number,
): SourceRoiRow[] {
  const bySource = new Map<
    string,
    {
      leadCount: number;
      hotLeadCount: number;
      pipelineValue: number;
      closedCount: number;
    }
  >();

  for (const lead of leads) {
    const bucket = bySource.get(lead.lead_source) ?? {
      leadCount: 0,
      hotLeadCount: 0,
      pipelineValue: 0,
      closedCount: 0,
    };

    bucket.leadCount += 1;
    if (lead.buyer_index_score > HOT_LEAD_SCORE_MIN) {
      bucket.hotLeadCount += 1;
    }
    if (lead.buyer_index_score > PIPELINE_SCORE_MIN && lead.target_budget !== null) {
      bucket.pipelineValue += lead.target_budget;
    }
    if (lead.current_status === "Closed") {
      bucket.closedCount += 1;
    }

    bySource.set(lead.lead_source, bucket);
  }

  return [...bySource.entries()]
    .map(([source, metrics]) => {
      const conversionRate =
        metrics.leadCount > 0 ? metrics.closedCount / metrics.leadCount : 0;

      return {
        source,
        leadCount: metrics.leadCount,
        hotLeadCount: metrics.hotLeadCount,
        estimatedPipelineValue: metrics.pipelineValue,
        estimatedGci: metrics.pipelineValue * PROJECTED_GCI_RATE,
        conversionRate: Number(conversionRate.toFixed(4)),
      };
    })
    .sort((a, b) => b.estimatedPipelineValue - a.estimatedPipelineValue)
    .slice(0, limit);
}

export function classifyVelocityStage(
  lead: AnalyticsLeadRow,
  appointments: readonly AnalyticsAppointmentRow[],
): VelocityStageKey {
  if (lead.current_status === "Closed") {
    return "closed";
  }

  if (appointments.some((row) => APPOINTMENT_LIVE_STATUSES.has(row.status))) {
    return "live_meeting";
  }

  if (
    appointments.some((row) => APPOINTMENT_SCHEDULED_STATUSES.has(row.status))
  ) {
    return "appointment_scheduled";
  }

  if (
    lead.current_status === "Pre-Approved" ||
    lead.current_status === "Active Searching" ||
    lead.current_status === "Under Contract"
  ) {
    return "qualified";
  }

  return "intake";
}

function daysBetweenTimestamps(startIso: string, endIso: string): number | null {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return null;
  }
  const days = (endMs - startMs) / 86_400_000;
  return Number.isFinite(days) && days >= 0 ? days : null;
}

export function aggregateConversionVelocity(
  leads: readonly AnalyticsLeadRow[],
  appointments: readonly AnalyticsAppointmentRow[],
): Pick<
  ConversionVelocitySuccessResponse,
  | "stages"
  | "avgDaysToAppointment"
  | "avgDaysToAppointmentNote"
  | "avgDaysToClose"
  | "avgDaysToCloseNote"
> {
  const appointmentsByLead = groupAppointmentsByLeadId(appointments);

  const stages: Record<VelocityStageKey, number> = {
    intake: 0,
    qualified: 0,
    appointment_scheduled: 0,
    live_meeting: 0,
    closed: 0,
  };

  const daysToAppointment: number[] = [];

  for (const lead of leads) {
    const leadAppointments = appointmentsByLead.get(lead.id) ?? [];
    const stage = classifyVelocityStage(lead, leadAppointments);
    stages[stage] += 1;

    if (leadAppointments.length > 0) {
      const earliest = leadAppointments.reduce((min, row) =>
        new Date(row.scheduled_at).getTime() <
        new Date(min.scheduled_at).getTime()
          ? row
          : min,
      );
      const days = daysBetweenTimestamps(lead.created_at, earliest.scheduled_at);
      if (days !== null) {
        daysToAppointment.push(days);
      }
    }
  }

  const avgDaysToAppointment =
    daysToAppointment.length > 0
      ? Number(
          (
            daysToAppointment.reduce((sum, value) => sum + value, 0) /
            daysToAppointment.length
          ).toFixed(2),
        )
      : null;

  const avgDaysToAppointmentNote =
    daysToAppointment.length > 0
      ? null
      : "No leads with appointments in this window; average unavailable.";

  return {
    stages,
    avgDaysToAppointment,
    avgDaysToAppointmentNote,
    avgDaysToClose: null,
    avgDaysToCloseNote:
      "Close timestamp unavailable: leads have no closed_at column and transaction_milestones has no close date in Pass D.",
  };
}

export async function fetchAnalyticsLeadsInRange(
  supabase: SupabaseServerClient,
  range: DateRange,
  routeLabel: string,
): Promise<
  | { readonly ok: true; readonly leads: AnalyticsLeadRow[] }
  | { readonly ok: false; readonly message: string }
> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select(LEAD_ANALYTICS_SELECT)
      .gte("created_at", range.fromIso)
      .lt("created_at", range.toIso);

    if (error) {
      logAnalyticsFailure(routeLabel, "leads_query_failed", {
        fromIso: range.fromIso,
        toIso: range.toIso,
        ...serializeSupabaseError(error),
      });
      return { ok: false, message: "Unable to load leads for analytics." };
    }

    const leads = (data ?? [])
      .map((row) => coerceAnalyticsLeadRow(row))
      .filter((row): row is AnalyticsLeadRow => row !== null);

    return { ok: true, leads };
  } catch (caught: unknown) {
    logAnalyticsFailure(routeLabel, "leads_query_exception", {
      fromIso: range.fromIso,
      toIso: range.toIso,
      ...serializeSupabaseError(caught),
    });
    return { ok: false, message: "Unable to load leads for analytics." };
  }
}

export async function fetchAnalyticsAppointmentsForLeads(
  supabase: SupabaseServerClient,
  leadIds: readonly string[],
  routeLabel: string,
): Promise<
  | { readonly ok: true; readonly appointments: AnalyticsAppointmentRow[] }
  | { readonly ok: false; readonly message: string }
> {
  if (leadIds.length === 0) {
    return { ok: true, appointments: [] };
  }

  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(APPOINTMENT_ANALYTICS_SELECT)
      .in("lead_id", [...leadIds]);

    if (error) {
      logAnalyticsFailure(routeLabel, "appointments_query_failed", {
        leadCount: leadIds.length,
        ...serializeSupabaseError(error),
      });
      return {
        ok: false,
        message: "Unable to load appointments for analytics.",
      };
    }

    const appointments = (data ?? [])
      .map((row) => coerceAnalyticsAppointmentRow(row))
      .filter((row): row is AnalyticsAppointmentRow => row !== null);

    return { ok: true, appointments };
  } catch (caught: unknown) {
    logAnalyticsFailure(routeLabel, "appointments_query_exception", {
      leadCount: leadIds.length,
      ...serializeSupabaseError(caught),
    });
    return {
      ok: false,
      message: "Unable to load appointments for analytics.",
    };
  }
}
