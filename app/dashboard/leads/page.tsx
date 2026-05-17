import {
  ActionCenter,
  type Appointment,
  type AppointmentStatus,
} from "@/components/dashboard/ActionCenter";
import { LeadAnalysisWorkspace } from "@/components/dashboard/LeadAnalysisWorkspace";
import type { AnalysisWorkspaceLead } from "@/components/dashboard/LeadAnalysisWorkspace";
import { LiveMeetingBadge } from "@/components/dashboard/LiveMeetingBadge";
import { MobileIntakeForm } from "@/components/dashboard/MobileIntakeForm";
import {
  TokenLinkGenerator,
  type TokenLinkLead,
} from "@/components/dashboard/TokenLinkGenerator";
import {
  getBusinessDayBounds,
  resolveBusinessTimeZone,
} from "@/lib/datetime/businessTimezone";
import { parseLeadPreferences } from "@/lib/leads/types";
import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import {
  isMissingColumnError,
  isRlsOrPermissionError,
  isSchemaUnavailableError,
  type PostgrestErrorLike,
} from "@/lib/supabase/postgrest";
import { createClient } from "@/lib/supabase/server";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const PANEL_SHELL =
  "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-md";

/** Canonical nerve-center shape — filter `scheduled_at` with half-open day bounds. */
const CANONICAL_APPOINTMENT_SELECT = `
  id,
  title,
  scheduled_at,
  status,
  livekit_room_id,
  lead_id
`;

/** Legacy mobile-engine shape: filter on `start_time`. */
const LEGACY_APPOINTMENT_SELECT = `
  id,
  title,
  start_time,
  status,
  livekit_room_id,
  lead_id
`;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type AppointmentTimeColumn = "scheduled_at" | "start_time";

type NormalizedAppointment = {
  readonly id: string;
  readonly title: string;
  readonly scheduled_at: string;
  readonly status: AppointmentStatus;
  readonly livekit_room_id: string | null;
  readonly lead_id: string | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toInteger(value: unknown): number | null {
  const numeric = toNumber(value);
  return numeric === null ? null : Math.floor(numeric);
}

function parseRoadblocks(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items : null;
}

function logAppointmentsFailure(
  level: "warn" | "error",
  event: string,
  context: Record<string, unknown>,
): void {
  const payload = safeJsonStringify(context);
  if (level === "warn") {
    console.warn(`[LEADS_DASHBOARD_APPOINTMENTS] ${event} ${payload}`);
    return;
  }
  console.error(`[LEADS_DASHBOARD_APPOINTMENTS] ${event} ${payload}`);
}

function normalizeAppointmentStatus(value: unknown): AppointmentStatus {
  if (
    value === "scheduled" ||
    value === "starting" ||
    value === "live" ||
    value === "completed" ||
    value === "failed"
  ) {
    return value;
  }
  return "scheduled";
}

function normalizeAppointmentRow(
  row: Record<string, unknown>,
): NormalizedAppointment | null {
  const id = typeof row.id === "string" ? row.id : null;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const scheduledAt =
    typeof row.scheduled_at === "string"
      ? row.scheduled_at
      : typeof row.start_time === "string"
        ? row.start_time
        : null;
  const livekitRoomId =
    typeof row.livekit_room_id === "string" ? row.livekit_room_id : null;
  const leadId = typeof row.lead_id === "string" ? row.lead_id : null;

  if (!id || !title || !scheduledAt) {
    return null;
  }

  return {
    id,
    title,
    scheduled_at: scheduledAt,
    status: normalizeAppointmentStatus(row.status),
    livekit_room_id: livekitRoomId,
    lead_id: leadId,
  };
}

function sortAppointmentsByScheduledAt(
  rows: readonly NormalizedAppointment[],
): NormalizedAppointment[] {
  return [...rows].sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
}

function toActionCenterAppointment(row: NormalizedAppointment): Appointment {
  return {
    id: row.id,
    title: row.title,
    scheduled_at: row.scheduled_at,
    status: row.status,
    livekit_room_id: row.livekit_room_id,
  };
}

async function queryAppointmentsForDay(
  supabase: SupabaseServerClient,
  timeColumn: AppointmentTimeColumn,
  select: string,
  startIso: string,
  endIso: string,
): Promise<{
  readonly rows: Record<string, unknown>[];
  readonly error: PostgrestErrorLike | null;
}> {
  const result = await supabase
    .from("appointments")
    .select(select)
    .gte(timeColumn, startIso)
    .lt(timeColumn, endIso)
    .order(timeColumn, { ascending: true });

  return {
    rows: (result.data ?? []).map((row) => row as unknown as Record<string, unknown>),
    error: result.error,
  };
}

/**
 * Loads today's appointments in the business timezone (profile → env → America/Chicago).
 * Day window uses half-open UTC bounds `[startIso, endIso)` from `getBusinessDayBounds`.
 * Never throws; returns [] on failure.
 */
async function fetchTodaysAppointments(
  supabase: SupabaseServerClient,
  timeZone: string,
): Promise<readonly Appointment[]> {
  const { startIso, endIso } = getBusinessDayBounds(timeZone);
  let datetimeColumn: AppointmentTimeColumn = "scheduled_at";
  let queryPath: "canonical" | "legacy" = "canonical";

  try {
    const primary = await queryAppointmentsForDay(
      supabase,
      "scheduled_at",
      CANONICAL_APPOINTMENT_SELECT,
      startIso,
      endIso,
    );

    let rows = primary.rows;
    let error = primary.error;

    // Legacy schema: `start_time` when `scheduled_at` is absent.
    if (error && isMissingColumnError(error, "scheduled_at")) {
      datetimeColumn = "start_time";
      queryPath = "legacy";
      const legacy = await queryAppointmentsForDay(
        supabase,
        "start_time",
        LEGACY_APPOINTMENT_SELECT,
        startIso,
        endIso,
      );
      rows = legacy.rows;
      error = legacy.error;
    }

    if (error) {
      const errorFields = serializeSupabaseError(error);
      const logContext: Record<string, unknown> = {
        timeZone,
        dayStartIso: startIso,
        dayEndIso: endIso,
        datetimeColumn,
        queryPath,
        ...errorFields,
      };

      if (isSchemaUnavailableError(error)) {
        logAppointmentsFailure("warn", "schema_unavailable", logContext);
        return [];
      }

      if (isRlsOrPermissionError(error)) {
        logAppointmentsFailure("warn", "rls_or_permission_denied", logContext);
        return [];
      }

      logAppointmentsFailure("error", "query_failed", logContext);
      return [];
    }

    const normalized = sortAppointmentsByScheduledAt(
      rows
        .map((row) => normalizeAppointmentRow(row))
        .filter((row): row is NormalizedAppointment => row !== null),
    );

    return normalized.map((row) => toActionCenterAppointment(row));
  } catch (caught: unknown) {
    logAppointmentsFailure("error", "unexpected_exception", {
      timeZone,
      dayStartIso: startIso,
      dayEndIso: endIso,
      datetimeColumn,
      queryPath,
      ...serializeSupabaseError(caught),
    });
    return [];
  }
}

function coerceWorkspaceLead(row: Record<string, unknown>): AnalysisWorkspaceLead {
  const preferences = parseLeadPreferences(row.ai_extracted_preferences);

  return {
    id: String(row.id),
    name: String(row.lead_name ?? row.name ?? "Active buyer"),
    phone:
      typeof row.phone === "string"
        ? row.phone
        : typeof row.phone_number === "string"
          ? row.phone_number
          : null,
    target_zip_code:
      typeof row.target_zip_code === "string" ? row.target_zip_code : null,
    purchasing_power_limit: toNumber(row.purchasing_power_limit),
    target_budget: toNumber(row.target_budget),
    current_status: String(row.current_status ?? row.milestone ?? "New Lead"),
    milestone:
      typeof row.milestone === "string"
        ? row.milestone
        : typeof row.current_status === "string"
          ? row.current_status
          : null,
    timeline: typeof row.timeline === "string" ? row.timeline : null,
    purchase_timeline:
      typeof row.purchase_timeline === "string" ? row.purchase_timeline : null,
    notes:
      typeof row.notes === "string"
        ? row.notes
        : typeof row.ai_summary === "string"
          ? row.ai_summary
          : null,
    ai_summary: typeof row.ai_summary === "string" ? row.ai_summary : null,
    has_verified_pre_approval: row.has_verified_pre_approval === true,
    lead_score: toInteger(row.lead_score),
    market_readiness_score: toInteger(row.market_readiness_score),
    roadblocks: parseRoadblocks(row.roadblocks),
    hurdle_lender: preferences.hurdle_lender,
    hurdle_home_sale: preferences.hurdle_home_sale,
    hurdle_down_payment: preferences.hurdle_down_payment,
  };
}

function pickTokenLinkLead(
  leads: readonly AnalysisWorkspaceLead[],
): TokenLinkLead | null {
  const active = leads.filter(
    (lead) => (lead.milestone ?? lead.current_status) !== "Closed",
  );

  const withZip = active.find((lead) => lead.target_zip_code?.trim());
  const candidate = withZip ?? active[0] ?? leads[0];
  if (!candidate) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name.trim() || "Active buyer",
    phone: candidate.phone?.trim() ?? "",
    target_zip_code: candidate.target_zip_code?.trim() ?? "local",
  };
}

function DashboardErrorCard({ message }: { readonly message: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-lg rounded-2xl border border-rose-500/30 bg-slate-900/80 p-8 text-center shadow-xl shadow-black/30 backdrop-blur-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-300">
          <AlertCircle className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-slate-100">
          Command hub unavailable
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{message}</p>
      </div>
    </div>
  );
}

export default async function LeadsDashboardPage() {
  let workspaceLeads: AnalysisWorkspaceLead[] = [];
  let todaysAppointments: readonly Appointment[] = [];
  let fetchError: string | null = null;
  let businessTimeZone: string | undefined;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    businessTimeZone = await resolveBusinessTimeZone(supabase, user?.id);

    const [leadsResult, appointments] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      fetchTodaysAppointments(supabase, businessTimeZone),
    ]);

    todaysAppointments = appointments;

    const { data, error } = leadsResult;

    if (error) {
      console.error(
        `[LEADS_DASHBOARD_FETCH] ${safeJsonStringify(serializeSupabaseError(error))}`,
      );
      fetchError =
        "We could not load your active buyers. Check your connection and try again.";
    } else {
      workspaceLeads = (data ?? []).map((row) =>
        coerceWorkspaceLead(row as Record<string, unknown>),
      );
    }
  } catch (error: unknown) {
    console.error(
      `[LEADS_DASHBOARD_FETCH_FAILURE] ${safeJsonStringify(serializeSupabaseError(error))}`,
    );
    fetchError =
      "Database connection failed. Verify Supabase configuration and refresh.";
  }

  if (fetchError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#090d16] px-4 text-slate-50">
        <DashboardErrorCard message={fetchError} />
      </div>
    );
  }

  const tokenLinkLead = pickTokenLinkLead(workspaceLeads);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col bg-[#090d16] text-slate-50 lg:h-[calc(100dvh-5.75rem)] lg:max-h-[calc(100dvh-5.75rem)] lg:overflow-hidden">
      {/* Pinned app chrome — live media + title never scroll away on desktop */}
      <header className="z-20 shrink-0 space-y-3 px-4 pb-3 pt-1 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-cyan-400/80">
              Active buyers command hub
            </p>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Leads console
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            {workspaceLeads.length} active {workspaceLeads.length === 1 ? "file" : "files"}
          </p>
        </div>
        <LiveMeetingBadge businessTimeZone={businessTimeZone} />
        <ActionCenter initialAppointments={todaysAppointments} />
      </header>

      {/* Split workspace: single feed on mobile, dual independent panels on lg+ */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-5 lg:overflow-hidden lg:pb-4">
        {/* Analytics hub — 8/12 */}
        <section className={`${PANEL_SHELL} lg:col-span-8`}>
          <div className="shrink-0 border-b border-slate-800/60 px-4 py-3 sm:px-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Analytics & velocity
            </h2>
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <LeadAnalysisWorkspace leads={workspaceLeads} />
          </div>
        </section>

        {/* Intake console — 4/12 */}
        <aside className={`${PANEL_SHELL} lg:col-span-4`}>
          <div className="shrink-0 border-b border-slate-800/60 px-4 py-3 sm:px-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Intake & outbound
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Capture buyers and push tracked market links.
            </p>
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
            <MobileIntakeForm />
            {tokenLinkLead ? (
              <TokenLinkGenerator lead={tokenLinkLead} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/30 p-6 text-center backdrop-blur-sm">
                <p className="text-sm font-medium text-slate-300">
                  Outbound market links
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Add an active buyer with a target ZIP to generate tracked SMS
                  links.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
