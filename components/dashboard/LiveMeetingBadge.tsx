"use client";

import type { AppointmentType } from "@/components/dashboard/MeetingSchedulerModal";
import {
  getBusinessDayBounds,
  isValidIanaTimeZone,
  resolveBusinessTimeZoneFromEnv,
} from "@/lib/datetime/businessTimezone";
import {
  isMissingColumnError,
  isSchemaUnavailableError,
  type PostgrestErrorLike,
} from "@/lib/supabase/postgrest";
import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const POLL_INTERVAL_MS = 30_000;
const READY_WINDOW_MS = 10 * 60 * 1000;

/** Canonical lead embed — never `leads.name` (column may be absent on remote). */
const LEAD_JOIN_SELECT = "lead_name";

const APPOINTMENT_SELECT_LEGACY = `
  id,
  title,
  type,
  status,
  start_time,
  duration_minutes,
  livekit_room_id,
  leads (
    ${LEAD_JOIN_SELECT}
  )
`;

const NERVE_CENTER_SELECT = `
  id,
  title,
  event_type,
  status,
  scheduled_at,
  livekit_room_id,
  leads (
    ${LEAD_JOIN_SELECT}
  )
`;

type AppointmentStatus = "scheduled" | "live" | "completed" | "cancelled";

type LeadJoinRow = {
  readonly lead_name?: string | null;
  readonly full_name?: string | null;
  readonly display_name?: string | null;
  readonly first_name?: string | null;
  readonly last_name?: string | null;
};

type AppointmentRow = {
  readonly id: string;
  readonly title: string;
  readonly type: AppointmentType;
  readonly status: AppointmentStatus;
  readonly start_time: string;
  readonly duration_minutes: number | null;
  readonly livekit_room_id: string | null;
  readonly leads: LeadJoinRow | LeadJoinRow[] | null;
};

type RawAppointmentRow = {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly livekit_room_id: string | null;
  readonly type?: string | null;
  readonly event_type?: string | null;
  readonly start_time?: string | null;
  readonly scheduled_at?: string | null;
  readonly duration_minutes?: number | null;
  readonly leads: LeadJoinRow | LeadJoinRow[] | null;
};

type AppointmentQueryVariant = "legacy" | "nerve-center";
type AppointmentTimeColumn = "scheduled_at" | "start_time";

type ActiveAppointment = {
  readonly id: string;
  readonly title: string;
  readonly type: AppointmentType;
  readonly status: "scheduled" | "live";
  readonly startTime: Date;
  readonly durationMinutes: number;
  readonly livekitRoomId: string;
  readonly clientName: string;
  readonly isReady: boolean;
};

type LiveMeetingBadgeProps = {
  /** Server-resolved IANA zone (profile → env → default). */
  readonly businessTimeZone?: string;
};

function logLiveMeetingBadgeFailure(
  event: string,
  context: Record<string, unknown>,
): void {
  console.error(`[LIVE_MEETING_BADGE] ${event} ${safeJsonStringify(context)}`);
}

function resolveEffectiveTimeZone(propTimeZone: string | undefined): string {
  const trimmed = propTimeZone?.trim();
  if (trimmed && isValidIanaTimeZone(trimmed)) {
    return trimmed;
  }
  return resolveBusinessTimeZoneFromEnv();
}

function resolveLeadJoinRow(
  leads: AppointmentRow["leads"],
): LeadJoinRow | null {
  if (Array.isArray(leads)) {
    return leads[0] ?? null;
  }
  return leads;
}

/** Defensive display name — query uses `lead_name` only; never selects `leads.name`. */
function resolveLeadDisplayName(leads: AppointmentRow["leads"]): string {
  const row = resolveLeadJoinRow(leads);
  if (!row) {
    return "Lead";
  }

  const fullName =
    typeof row.full_name === "string" ? row.full_name.trim() : "";
  if (fullName.length > 0) {
    return fullName;
  }

  const displayName =
    typeof row.display_name === "string" ? row.display_name.trim() : "";
  if (displayName.length > 0) {
    return displayName;
  }

  const first =
    typeof row.first_name === "string" ? row.first_name.trim() : "";
  const last = typeof row.last_name === "string" ? row.last_name.trim() : "";
  const combined = `${first} ${last}`.trim();
  if (combined.length > 0) {
    return combined;
  }

  const leadName =
    typeof row.lead_name === "string" ? row.lead_name.trim() : "";
  if (leadName.length > 0) {
    return leadName;
  }

  return "Lead";
}

function isWithinReadyWindow(
  startTime: Date,
  durationMinutes: number,
  now: Date,
): boolean {
  const windowStart = startTime.getTime() - READY_WINDOW_MS;
  const windowEnd = startTime.getTime() + durationMinutes * 60 * 1000;
  const nowMs = now.getTime();
  return nowMs >= windowStart && nowMs <= windowEnd;
}

function mapActiveAppointment(
  row: AppointmentRow,
  now: Date,
): ActiveAppointment | null {
  if (!row.start_time) {
    return null;
  }

  const startTime = new Date(row.start_time);
  if (Number.isNaN(startTime.getTime())) {
    return null;
  }

  const durationMinutes = row.duration_minutes ?? 30;
  const status = row.status;
  if (status !== "scheduled" && status !== "live") {
    return null;
  }

  const isReady =
    status === "live" ||
    isWithinReadyWindow(startTime, durationMinutes, now);

  if (!isReady) {
    return null;
  }

  const livekitRoomId =
    typeof row.livekit_room_id === "string" ? row.livekit_room_id.trim() : "";

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status,
    startTime,
    durationMinutes,
    livekitRoomId,
    clientName: resolveLeadDisplayName(row.leads),
    isReady: true,
  };
}

function isMissingNerveCenterAppointmentColumns(
  error: PostgrestErrorLike,
): boolean {
  if (error.code !== "42703") {
    return false;
  }
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("scheduled_at") ||
    message.includes("event_type")
  );
}

type SupabaseBrowserClient = ReturnType<typeof createClient>;

function buildAppointmentSelect(schemaVariant: AppointmentQueryVariant): string {
  return schemaVariant === "nerve-center"
    ? NERVE_CENTER_SELECT
    : APPOINTMENT_SELECT_LEGACY;
}

async function queryTodaysAppointments(
  supabase: SupabaseBrowserClient,
  schemaVariant: AppointmentQueryVariant,
  timeColumn: AppointmentTimeColumn,
  startIso: string,
  endIso: string,
) {
  return supabase
    .from("appointments")
    .select(buildAppointmentSelect(schemaVariant))
    .in("status", ["scheduled", "live"])
    .gte(timeColumn, startIso)
    .lt(timeColumn, endIso)
    .order(timeColumn, { ascending: true });
}

function resolveAppointmentType(
  typeValue: string | null | undefined,
  eventType: string | null | undefined,
): AppointmentType {
  if (typeValue === "virtual_showing") {
    return "virtual_showing";
  }
  if (typeValue === "consultation") {
    return "consultation";
  }
  if (typeValue === "doc_review") {
    return "doc_review";
  }
  if (eventType === "showing") {
    return "virtual_showing";
  }
  return "consultation";
}

function normalizeAppointmentRow(raw: RawAppointmentRow): AppointmentRow | null {
  const startTime = raw.start_time ?? raw.scheduled_at ?? null;
  if (!startTime) {
    return null;
  }

  const status = raw.status;
  if (
    status !== "scheduled" &&
    status !== "live" &&
    status !== "completed" &&
    status !== "cancelled"
  ) {
    return null;
  }

  return {
    id: raw.id,
    title: raw.title,
    type: resolveAppointmentType(raw.type, raw.event_type),
    status,
    start_time: startTime,
    duration_minutes: raw.duration_minutes ?? null,
    livekit_room_id: raw.livekit_room_id,
    leads: raw.leads,
  };
}

function classifyAppointmentFetchError(
  error: PostgrestErrorLike,
): Record<string, unknown> {
  const message = error.message?.toLowerCase() ?? "";
  return {
    missingStartTime:
      message.includes("start_time") || message.includes("start time"),
    missingType: message.includes("type") && message.includes("appointments"),
    missingScheduledAt: message.includes("scheduled_at"),
    rlsDenied:
      message.includes("row-level security") || error.code === "42501",
    embedOrJoin:
      message.includes("embed") ||
      message.includes("relationship") ||
      message.includes("could not find"),
    permissionDenied:
      error.code === "42501" ||
      message.includes("permission denied") ||
      message.includes("not authorized"),
  };
}

const TYPE_LABELS: Record<AppointmentType, string> = {
  virtual_showing: "Virtual Showing",
  consultation: "Consultation",
  doc_review: "Doc Review",
};

export function LiveMeetingBadge({
  businessTimeZone: businessTimeZoneProp,
}: LiveMeetingBadgeProps) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<ActiveAppointment | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [schemaUnavailable, setSchemaUnavailable] = useState(false);

  const effectiveTimeZone = useMemo(
    () => resolveEffectiveTimeZone(businessTimeZoneProp),
    [businessTimeZoneProp],
  );

  const fetchActiveAppointment = useCallback(async () => {
    if (schemaUnavailable) {
      return;
    }

    const timeZone = effectiveTimeZone;
    const { startIso, endIso } = getBusinessDayBounds(timeZone);
    let queryVariant: AppointmentQueryVariant = "nerve-center";
    let datetimeColumn: AppointmentTimeColumn = "scheduled_at";

    try {
      const supabase = createClient();

      let result = await queryTodaysAppointments(
        supabase,
        "nerve-center",
        "scheduled_at",
        startIso,
        endIso,
      );

      if (
        result.error &&
        (isMissingNerveCenterAppointmentColumns(result.error) ||
          isMissingColumnError(result.error, "scheduled_at"))
      ) {
        queryVariant = "legacy";
        datetimeColumn = "start_time";
        result = await queryTodaysAppointments(
          supabase,
          "legacy",
          "start_time",
          startIso,
          endIso,
        );
      }

      const error = result.error;

      if (error) {
        logLiveMeetingBadgeFailure("fetch_failed", {
          timeZone,
          dayStartIso: startIso,
          dayEndIso: endIso,
          datetimeColumn,
          queryVariant,
          leadJoin: LEAD_JOIN_SELECT,
          ...serializeSupabaseError(error),
          ...classifyAppointmentFetchError(error),
        });
        setAppointment(null);

        if (isSchemaUnavailableError(error)) {
          setSchemaUnavailable(true);
          setFetchError(
            "Appointments table not installed. Apply migration supabase/migrations/20260517000000_init_real_estate_engine.sql in Supabase.",
          );
          return;
        }

        setFetchError("Live meeting sync unavailable.");
        return;
      }

      const now = new Date();
      const rows = (result.data ?? [])
        .map((row) => normalizeAppointmentRow(row as unknown as RawAppointmentRow))
        .filter((row): row is AppointmentRow => row !== null);
      const ready = rows
        .map((row) => mapActiveAppointment(row, now))
        .find((item): item is ActiveAppointment => item !== null);

      setAppointment(ready ?? null);
      setFetchError(null);
      setSchemaUnavailable(false);
    } catch (caught: unknown) {
      logLiveMeetingBadgeFailure("unexpected_exception", {
        timeZone,
        dayStartIso: startIso,
        dayEndIso: endIso,
        datetimeColumn,
        queryVariant,
        ...serializeSupabaseError(caught),
      });
      setAppointment(null);
      setFetchError("Live meeting sync unavailable.");
    }
  }, [effectiveTimeZone, schemaUnavailable]);

  useEffect(() => {
    if (schemaUnavailable) {
      return;
    }

    void fetchActiveAppointment();
    const intervalId = window.setInterval(() => {
      void fetchActiveAppointment();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [fetchActiveAppointment, schemaUnavailable]);

  const goLiveLabel = useMemo(() => {
    if (!appointment) {
      return "Go Live Now";
    }
    return appointment.status === "live" ? "Rejoin Room" : "Go Live Now";
  }, [appointment]);

  const handleGoLive = async () => {
    if (!appointment || isUpdating) {
      return;
    }

    setIsUpdating(true);
    setActionError(null);

    try {
      if (appointment.status === "live" && appointment.livekitRoomId.length > 0) {
        router.push(
          `/meet/${encodeURIComponent(appointment.livekitRoomId)}?name=Derrick`,
        );
        return;
      }

      const response = await fetch("/api/appointments/go-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: appointment.id }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            readonly token?: string;
            readonly roomName?: string;
            readonly appointmentId?: string;
            readonly error?: string;
          }
        | null;

      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "Unable to start meeting.";
        setActionError(message);
        return;
      }

      const roomName =
        typeof payload?.roomName === "string" ? payload.roomName.trim() : "";
      if (!roomName) {
        setActionError("Invalid server response.");
        return;
      }

      setAppointment((current) =>
        current
          ? {
              ...current,
              status: "live",
              livekitRoomId: roomName,
            }
          : null,
      );

      router.push(`/meet/${encodeURIComponent(roomName)}?name=Derrick`);
    } catch (caught: unknown) {
      logLiveMeetingBadgeFailure("go_live_exception", {
        appointmentId: appointment.id,
        ...serializeSupabaseError(caught),
      });
      setActionError("Unable to open meeting room.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEndMeeting = async () => {
    if (!appointment || isUpdating) {
      return;
    }

    setIsUpdating(true);
    setActionError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", appointment.id);

      if (error) {
        logLiveMeetingBadgeFailure("end_meeting_failed", {
          appointmentId: appointment.id,
          ...serializeSupabaseError(error),
        });
        setActionError(error.message || "Unable to end meeting.");
        return;
      }

      setAppointment(null);
      void fetchActiveAppointment();
    } catch (caught: unknown) {
      logLiveMeetingBadgeFailure("end_meeting_exception", {
        appointmentId: appointment.id,
        ...serializeSupabaseError(caught),
      });
      setActionError("Unable to end meeting.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (fetchError && !appointment) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90 backdrop-blur-sm"
        role="status"
        aria-live="polite"
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
        <span>{fetchError}</span>
      </div>
    );
  }

  if (!appointment) {
    return null;
  }

  return (
    <section
      className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-950/80 p-4 text-emerald-100 shadow-lg shadow-emerald-950/40"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
            {appointment.status === "live" ? "Live now" : "Ready to go live"}
          </p>
          <p className="truncate text-base font-semibold text-emerald-50">
            {appointment.title}
          </p>
          <p className="text-sm text-emerald-200/90">
            {TYPE_LABELS[appointment.type]} · {appointment.clientName}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => void handleGoLive()}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-600 px-5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.45)] transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60",
              appointment.status !== "live" && "animate-pulse",
            )}
          >
            {isUpdating ? "Opening…" : goLiveLabel}
          </button>
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => void handleEndMeeting()}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-700/80 bg-emerald-950 px-5 text-sm font-semibold text-emerald-200 transition hover:border-emerald-500/50 hover:text-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            End
          </button>
        </div>
      </div>

      {actionError ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {actionError}
        </p>
      ) : null}
    </section>
  );
}
