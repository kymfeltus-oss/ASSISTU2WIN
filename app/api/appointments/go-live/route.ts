import { createClient } from "@/lib/supabase/server";
import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import { isRlsOrPermissionError } from "@/lib/supabase/postgrest";
import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

const TOKEN_TTL_SECONDS = 2 * 60 * 60;
const AGENT_DISPLAY_NAME = "Derrick";

const ALLOWED_START_STATUSES = ["scheduled", "failed"] as const;

type AllowedStartStatus = (typeof ALLOWED_START_STATUSES)[number];

type ErrorCode =
  | "INVALID_PAYLOAD"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "TRANSITION_CONFLICT"
  | "CONFIG_MISSING"
  | "INTERNAL_ERROR";

type FailureStage =
  | "existence"
  | "auth"
  | "status"
  | "transition"
  | "token"
  | "finalize";

type GoLiveRequestBody = {
  readonly appointmentId: string;
};

type GoLiveSuccessResponse = {
  readonly appointmentId: string;
  readonly roomName: string;
  readonly token: string;
  readonly status: "live";
};

type GoLiveErrorResponse = {
  readonly error: string;
  readonly code: ErrorCode;
};

type AppointmentRecord = {
  readonly id: string;
  readonly lead_id: string;
  readonly status: string;
  readonly livekit_room_id: string | null;
};

type LeadAccessRecord = {
  readonly id: string;
  readonly profile_id: string | null;
  readonly assigned_admin_id?: string | null;
};

type AppointmentRow = {
  readonly id: string;
  readonly status: string;
  readonly livekit_room_id: string | null;
};

type TransitionFromStatus = AllowedStartStatus | "starting";

type StatusTransitionResult =
  | { readonly ok: true; readonly row: AppointmentRow }
  | { readonly ok: false; readonly conflict: true }
  | { readonly ok: false; readonly conflict: false; readonly message: string };

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseBody(body: unknown): GoLiveRequestBody | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  const appointmentId = record.appointmentId;
  if (
    typeof appointmentId !== "string" ||
    !UUID_PATTERN.test(appointmentId.trim())
  ) {
    return null;
  }
  return { appointmentId: appointmentId.trim() };
}

function jsonError(
  status: number,
  code: ErrorCode,
  message: string,
): NextResponse<GoLiveErrorResponse> {
  return NextResponse.json({ error: message, code }, { status });
}

function logGoLiveFailure(
  stage: FailureStage,
  context: Record<string, unknown>,
): void {
  console.error(
    `[APPOINTMENTS_GO_LIVE] ${stage} ${safeJsonStringify(context)}`,
  );
}

/** Dev-oriented auth tracing — no secrets, no tokens. */
function logGoLiveAuthContext(context: Record<string, unknown>): void {
  console.info(
    `[APPOINTMENTS_GO_LIVE] auth_context ${safeJsonStringify(context)}`,
  );
}

function normalizeStatus(status: unknown): string {
  if (typeof status === "string") {
    return status.trim().toLowerCase();
  }
  return String(status).trim().toLowerCase();
}

function isAllowedStartStatus(status: unknown): status is AllowedStartStatus {
  const normalized = normalizeStatus(status);
  return normalized === "scheduled" || normalized === "failed";
}

/**
 * `leads.profile_id` and `leads.assigned_admin_id` reference `auth.users.id`
 * (same UUID as `supabase.auth.getUser().id` / `auth.uid()` in RLS).
 */
function isLeadOwnedByUser(lead: LeadAccessRecord, userId: string): boolean {
  if (lead.profile_id === userId) {
    return true;
  }
  if (lead.assigned_admin_id === userId) {
    return true;
  }
  return false;
}

function buildOwnershipDiagnostics(
  lead: LeadAccessRecord,
  authUserId: string,
  isAdmin: boolean,
): Record<string, unknown> {
  return {
    authUserId,
    isAdmin,
    leadId: lead.id,
    leadProfileId: lead.profile_id,
    leadAssignedAdminId: lead.assigned_admin_id,
    matchesProfileId: lead.profile_id === authUserId,
    matchesAssignedAdminId: lead.assigned_admin_id === authUserId,
    identityNote:
      "Compare auth.users.id (getUser) to leads.profile_id / assigned_admin_id — not profiles row unless ids match by design",
  };
}

function resolveRoomName(
  appointmentId: string,
  livekitRoomId: string | null | undefined,
): string {
  const existing = typeof livekitRoomId === "string" ? livekitRoomId.trim() : "";
  if (existing.length > 0) {
    return existing;
  }
  return `appt-${appointmentId}`;
}

async function mintLiveKitToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
): Promise<string> {
  const accessToken = new AccessToken(apiKey, apiSecret, {
    identity: AGENT_DISPLAY_NAME,
    name: AGENT_DISPLAY_NAME,
    ttl: TOKEN_TTL_SECONDS,
  });

  accessToken.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return accessToken.toJwt();
}

/** Stage A — existence by primary key only (no lead embed). */
async function fetchAppointmentById(
  supabase: SupabaseServerClient,
  appointmentId: string,
): Promise<
  | { readonly ok: true; readonly row: AppointmentRecord }
  | { readonly ok: false; readonly notFound: true }
  | {
      readonly ok: false;
      readonly notFound: false;
      readonly forbidden: boolean;
      readonly message: string;
      readonly code?: string;
    }
> {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, lead_id, status, livekit_room_id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) {
    const postgrestError: { message?: string; code?: string } = error;
    const forbidden = isRlsOrPermissionError(postgrestError);
    return {
      ok: false,
      notFound: false,
      forbidden,
      message: postgrestError.message ?? "Unable to load appointment.",
      code: postgrestError.code,
    };
  }

  const row = data as AppointmentRecord | null;
  if (!row?.id || typeof row.lead_id !== "string") {
    return { ok: false, notFound: true };
  }

  return { ok: true, row };
}

/** Stage B — ownership on lead row (separate from appointment existence). */
async function fetchLeadForAuthorization(
  supabase: SupabaseServerClient,
  leadId: string,
): Promise<
  | { readonly ok: true; readonly row: LeadAccessRecord }
  | { readonly ok: false; readonly message: string }
> {
  const { data, error } = await supabase
    .from("leads")
    .select("id, profile_id")
    .eq("id", leadId)
    .maybeSingle();

  if (error) {
    const postgrestError: { message?: string; code?: string } = error;
    if (isRlsOrPermissionError(postgrestError)) {
      return { ok: false, message: "Lead blocked by row-level security." };
    }
    return { ok: false, message: postgrestError.message ?? "Unable to load lead." };
  }

  if (!data?.id) {
    return {
      ok: false,
      message:
        "Lead not visible (RLS or missing). auth.uid() must match leads.profile_id.",
    };
  }

  return { ok: true, row: data as LeadAccessRecord };
}

function userCanAccessAppointment(
  lead: LeadAccessRecord,
  userId: string,
  isAdmin: boolean,
): boolean {
  if (isAdmin) {
    return true;
  }
  return isLeadOwnedByUser(lead, userId);
}

/**
 * Conditional status transition: only updates when `id` matches and current
 * `status` is in `fromStatuses`. Zero updated rows => lost race / invalid state.
 */
async function transitionAppointmentStatus(
  supabase: SupabaseServerClient,
  appointmentId: string,
  fromStatuses: readonly TransitionFromStatus[],
  toStatus: "starting" | "live" | "failed",
): Promise<StatusTransitionResult> {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: toStatus })
    .eq("id", appointmentId)
    .in("status", [...fromStatuses])
    .select("id, status, livekit_room_id");

  if (error) {
    return { ok: false, conflict: false, message: error.message };
  }

  const row = data?.[0];
  if (!row?.id) {
    return { ok: false, conflict: true };
  }

  return { ok: true, row: row as AppointmentRow };
}

/** Transition 2: `starting` -> `live` and persist LiveKit room assignment. */
async function transitionStartingToLive(
  supabase: SupabaseServerClient,
  appointmentId: string,
  roomName: string,
): Promise<StatusTransitionResult> {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "live",
      livekit_room_id: roomName,
    })
    .eq("id", appointmentId)
    .eq("status", "starting")
    .select("id, status, livekit_room_id");

  if (error) {
    return { ok: false, conflict: false, message: error.message };
  }

  const row = data?.[0];
  if (!row?.id) {
    return { ok: false, conflict: true };
  }

  return { ok: true, row: row as AppointmentRow };
}

async function rollbackStartingToFailed(
  supabase: SupabaseServerClient,
  appointmentId: string,
  userId: string,
): Promise<void> {
  const rollback = await transitionAppointmentStatus(
    supabase,
    appointmentId,
    ["starting"],
    "failed",
  );
  if (!rollback.ok) {
    logGoLiveFailure("transition", {
      appointmentId,
      userId,
      phase: "rollback_failed",
      conflict: rollback.conflict,
      message: rollback.conflict ? null : rollback.message,
    });
  }
}

export async function POST(
  request: Request,
): Promise<NextResponse<GoLiveSuccessResponse | GoLiveErrorResponse>> {
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    return jsonError(500, "CONFIG_MISSING", "LiveKit is not configured.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_PAYLOAD", "Request body must be valid JSON.");
  }

  const payload = parseBody(body);
  if (!payload) {
    return jsonError(
      400,
      "INVALID_PAYLOAD",
      "appointmentId must be a valid UUID.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const appointmentId = payload.appointmentId;

  logGoLiveAuthContext({
    stage: "session",
    appointmentId,
    hasUser: Boolean(user?.id),
    userId: user?.id ?? null,
    authError: authError ? serializeSupabaseError(authError) : null,
    hint: authError || !user?.id
      ? "No Supabase session on this request — include auth cookies (browser) or sign in first"
      : "auth.uid() should match leads.profile_id for owned rows",
  });

  if (authError || !user?.id) {
    logGoLiveFailure("auth", {
      appointmentId,
      reason: "unauthenticated",
      hasUser: Boolean(user?.id),
      ...serializeSupabaseError(authError ?? { message: "missing user" }),
    });
    return jsonError(401, "UNAUTHORIZED", "Sign in required.");
  }

  const userId = user.id;

  const { data: isAdminRaw, error: adminError } =
    await supabase.rpc("is_platform_admin");

  if (adminError) {
    logGoLiveFailure("auth", {
      appointmentId,
      userId,
      reason: "admin_check_failed",
      ...serializeSupabaseError(adminError),
    });
    return jsonError(500, "INTERNAL_ERROR", "Unable to verify permissions.");
  }

  const isAdmin = isAdminRaw === true;

  logGoLiveAuthContext({
    stage: "session_ok",
    appointmentId,
    userId,
    isAdmin,
  });

  // Stage A — appointment exists? (no lead embed; RLS may hide row)
  const existence = await fetchAppointmentById(supabase, appointmentId);

  if (!existence.ok) {
    if (existence.notFound) {
      logGoLiveFailure("existence", {
        appointmentId,
        userId,
        reason: "appointment_missing_or_rls_hidden",
        hint:
          "Row absent for this JWT. Confirm id in SQL editor vs app session; RLS can look like 404.",
      });
      return jsonError(404, "NOT_FOUND", "Appointment not found.");
    }

    if ("forbidden" in existence && existence.forbidden) {
      logGoLiveFailure("existence", {
        appointmentId,
        userId,
        reason: "appointment_rls_denied",
        code: existence.code ?? null,
        message: existence.message,
      });
      return jsonError(
        403,
        "FORBIDDEN",
        "You do not have access to this appointment.",
      );
    }

    logGoLiveFailure("existence", {
      appointmentId,
      userId,
      reason: "appointment_query_error",
      ...serializeSupabaseError({ message: existence.message }),
    });
    return jsonError(500, "INTERNAL_ERROR", "Unable to load appointment.");
  }

  const appointment = existence.row;

  // Stage B — ownership separate from existence (`profile_id` = auth.users.id)
  const leadResult = await fetchLeadForAuthorization(
    supabase,
    appointment.lead_id,
  );

  if (!leadResult.ok) {
    logGoLiveFailure("auth", {
      appointmentId,
      userId,
      leadId: appointment.lead_id,
      reason: "lead_not_visible",
      message: leadResult.message,
      devUnblockSql: `UPDATE public.leads SET profile_id = '${userId}' WHERE id = '${appointment.lead_id}';`,
    });
    return jsonError(
      403,
      "FORBIDDEN",
      "You do not have access to this appointment.",
    );
  }

  const ownershipDiagnostics = buildOwnershipDiagnostics(
    leadResult.row,
    userId,
    isAdmin,
  );

  logGoLiveAuthContext({
    stage: "ownership_check",
    appointmentId,
    ...ownershipDiagnostics,
  });

  if (!userCanAccessAppointment(leadResult.row, userId, isAdmin)) {
    logGoLiveFailure("auth", {
      appointmentId,
      userId,
      leadId: appointment.lead_id,
      reason: "ownership_denied",
      ...ownershipDiagnostics,
      devUnblockSql: `UPDATE public.leads SET profile_id = '${userId}' WHERE id = '${appointment.lead_id}';`,
    });
    return jsonError(
      403,
      "FORBIDDEN",
      "You do not have access to this appointment.",
    );
  }

  // Stage — status eligible for go-live?
  if (!isAllowedStartStatus(appointment.status)) {
    logGoLiveFailure("status", {
      appointmentId,
      userId,
      currentStatus: normalizeStatus(appointment.status),
      allowed: ALLOWED_START_STATUSES,
    });
    return jsonError(
      409,
      "TRANSITION_CONFLICT",
      "Session must be scheduled or failed before going live.",
    );
  }

  const roomName = resolveRoomName(appointmentId, appointment.livekit_room_id);

  // Transition 1: scheduled|failed -> starting (compare-and-swap).
  const claim = await transitionAppointmentStatus(
    supabase,
    appointmentId,
    ALLOWED_START_STATUSES,
    "starting",
  );

  if (!claim.ok) {
    if (claim.conflict) {
      const refreshed = await fetchAppointmentById(supabase, appointmentId);
      const currentStatus = refreshed.ok
        ? normalizeStatus(refreshed.row.status)
        : "unknown";

      logGoLiveFailure("transition", {
        appointmentId,
        userId,
        reason: "claim_conflict",
        currentStatus,
      });

      return jsonError(
        409,
        "TRANSITION_CONFLICT",
        "Session is already starting, live, or completed.",
      );
    }

    logGoLiveFailure("transition", {
      appointmentId,
      userId,
      reason: "claim_error",
      ...serializeSupabaseError({ message: claim.message }),
    });
    return jsonError(500, "INTERNAL_ERROR", "Unable to reserve session.");
  }

  let token: string;
  try {
    token = await mintLiveKitToken(apiKey, apiSecret, roomName);
  } catch (error: unknown) {
    logGoLiveFailure("token", {
      appointmentId,
      userId,
      ...serializeSupabaseError(error),
    });

    await rollbackStartingToFailed(supabase, appointmentId, userId);
    return jsonError(500, "INTERNAL_ERROR", "Unable to mint LiveKit token.");
  }

  // Transition 2: starting -> live with room assignment persisted.
  const finalize = await transitionStartingToLive(
    supabase,
    appointmentId,
    roomName,
  );

  if (!finalize.ok) {
    logGoLiveFailure("finalize", {
      appointmentId,
      userId,
      conflict: finalize.conflict,
      message: finalize.conflict ? null : finalize.message,
    });

    await rollbackStartingToFailed(supabase, appointmentId, userId);
    return jsonError(500, "INTERNAL_ERROR", "Unable to finalize live session.");
  }

  return NextResponse.json({
    appointmentId,
    roomName,
    token,
    status: "live",
  });
}
