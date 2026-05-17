import {
  coerceLeadScoreInput,
  computeLeadScore,
  isValidLeadId,
  SCORE_VERSION,
  type ScoreExplanation,
} from "@/lib/leads/score-versioning";
import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import {
  isMissingColumnError,
  isRlsOrPermissionError,
} from "@/lib/supabase/postgrest";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ROUTE_LOG_PREFIX = "[LEAD_SCORE_RECALC]";

type RouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

type RecalcErrorCode =
  | "INVALID_LEAD_ID"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "UPDATE_FAILED"
  | "INTERNAL_ERROR";

type RecalcErrorResponse = {
  readonly ok: false;
  readonly code: RecalcErrorCode;
  readonly message: string;
};

type RecalcSuccessResponse = {
  readonly ok: true;
  readonly leadId: string;
  readonly score: number;
  readonly scoreVersion: typeof SCORE_VERSION;
  readonly scoreExplanation: ScoreExplanation;
};

const LEAD_SCORE_SELECT = `
  id,
  profile_id,
  target_budget,
  motivation_urgency,
  financing_type,
  has_verified_pre_approval,
  is_first_time_buyer,
  buyer_engagement_count,
  last_active_at,
  current_status,
  updated_at
`;

const LEAD_SCORE_SELECT_WITHOUT_LAST_ACTIVE = `
  id,
  profile_id,
  target_budget,
  motivation_urgency,
  financing_type,
  has_verified_pre_approval,
  is_first_time_buyer,
  buyer_engagement_count,
  current_status,
  updated_at
`;

function jsonError(
  status: number,
  code: RecalcErrorCode,
  message: string,
): NextResponse<RecalcErrorResponse> {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function logRecalcFailure(
  event: string,
  context: Record<string, unknown>,
): void {
  console.error(`${ROUTE_LOG_PREFIX} ${event} ${safeJsonStringify(context)}`);
}

export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<RecalcSuccessResponse | RecalcErrorResponse>> {
  const { id: leadId } = await context.params;
  const trimmedId = leadId?.trim() ?? "";

  if (!trimmedId) {
    return jsonError(400, "INVALID_LEAD_ID", "Lead id is required.");
  }
  if (!isValidLeadId(trimmedId)) {
    return jsonError(400, "INVALID_LEAD_ID", "Lead id must be a valid UUID.");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return jsonError(401, "UNAUTHORIZED", "Sign in required.");
    }

    let selectColumns = LEAD_SCORE_SELECT;
    let leadResult = await supabase
      .from("leads")
      .select(selectColumns)
      .eq("id", trimmedId)
      .eq("profile_id", user.id)
      .maybeSingle();

    if (
      leadResult.error &&
      isMissingColumnError(leadResult.error, "last_active_at")
    ) {
      selectColumns = LEAD_SCORE_SELECT_WITHOUT_LAST_ACTIVE;
      leadResult = await supabase
        .from("leads")
        .select(selectColumns)
        .eq("id", trimmedId)
        .eq("profile_id", user.id)
        .maybeSingle();
    }

    if (leadResult.error) {
      if (isRlsOrPermissionError(leadResult.error)) {
        logRecalcFailure("fetch_forbidden", {
          leadId: trimmedId,
          userId: user.id,
          ...serializeSupabaseError(leadResult.error),
        });
        return jsonError(403, "FORBIDDEN", "You do not have access to this lead.");
      }

      logRecalcFailure("fetch_failed", {
        leadId: trimmedId,
        userId: user.id,
        ...serializeSupabaseError(leadResult.error),
      });
      return jsonError(500, "INTERNAL_ERROR", "Unable to load lead for scoring.");
    }

    if (!leadResult.data) {
      return jsonError(404, "NOT_FOUND", "Lead not found.");
    }

    const scoreInput = coerceLeadScoreInput(
      leadResult.data as unknown as Record<string, unknown>,
    );
    if (!scoreInput) {
      logRecalcFailure("coerce_failed", { leadId: trimmedId });
      return jsonError(500, "INTERNAL_ERROR", "Lead data is incomplete for scoring.");
    }

    const computed = computeLeadScore(scoreInput);
    const calculatedAt = computed.explanation.computedAt;

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        buyer_index_score: computed.score,
        score_version: SCORE_VERSION,
        score_explanation: computed.explanation,
        score_last_calculated_at: calculatedAt,
      })
      .eq("id", trimmedId)
      .eq("profile_id", user.id);

    if (updateError) {
      if (isRlsOrPermissionError(updateError)) {
        logRecalcFailure("update_forbidden", {
          leadId: trimmedId,
          userId: user.id,
          ...serializeSupabaseError(updateError),
        });
        return jsonError(403, "FORBIDDEN", "You do not have access to update this lead.");
      }

      logRecalcFailure("update_failed", {
        leadId: trimmedId,
        userId: user.id,
        ...serializeSupabaseError(updateError),
      });
      return jsonError(500, "UPDATE_FAILED", "Unable to persist recalculated score.");
    }

    const body: RecalcSuccessResponse = {
      ok: true,
      leadId: trimmedId,
      score: computed.score,
      scoreVersion: SCORE_VERSION,
      scoreExplanation: computed.explanation,
    };

    return NextResponse.json(body);
  } catch (caught: unknown) {
    logRecalcFailure("unexpected_exception", {
      leadId: trimmedId,
      ...serializeSupabaseError(caught),
    });
    return jsonError(500, "INTERNAL_ERROR", "Score recalculation failed.");
  }
}
