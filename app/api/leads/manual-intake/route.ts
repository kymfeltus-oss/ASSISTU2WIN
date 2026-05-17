import { buildAdminIntakeInsertColumns } from "@/lib/leads/admin-intake-fields";
import {
  buildDefaultHurdles,
  formatPlainFirstName,
  isAllowedLeadSource,
  parseManualLeadIntakeBody,
  resolvePotentialBuyerIndexForLead,
  type ManualLeadIntakeFailure,
  type ManualLeadIntakeSuccess,
} from "@/lib/leads/manual-intake";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse<ManualLeadIntakeFailure> {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function isRlsViolation(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("row-level security") || lower.includes("rls");
}

export async function POST(
  request: Request,
): Promise<NextResponse<ManualLeadIntakeSuccess | ManualLeadIntakeFailure>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const payload = parseManualLeadIntakeBody(body);
  if (!payload || !isAllowedLeadSource(payload.leadSource)) {
    return jsonError(400, "INVALID_PAYLOAD", "Invalid lead intake payload.");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return jsonError(401, "UNAUTHORIZED", "Sign in required to create a lead.");
    }

    const intakeHurdles = buildDefaultHurdles();
    const potentialBuyerIndex = resolvePotentialBuyerIndexForLead(
      payload.currentStatus,
      payload.purchaseTimeline,
      payload.hasVerifiedPreApproval,
      { notesText: payload.manualNotes ?? "", hurdles: intakeHurdles },
    );
    const summary = payload.manualNotes
      ? `Intake note: ${payload.manualNotes}`
      : `Manual intake · ${payload.loanType} · $${payload.targetBudget.toLocaleString()}.`;

    const preferences = {
      loan_type: payload.loanType,
      min_bedrooms: 3,
      target_neighborhoods: ["DFW Metropolitan Grid"],
      pre_approval_status: payload.hasVerifiedPreApproval ? "Verified" : null,
      hurdle_lender: false,
      hurdle_home_sale: false,
      hurdle_down_payment: false,
    };

    const adminColumns = buildAdminIntakeInsertColumns(payload.adminExtensions);

    const insertRow = {
      profile_id: user.id,
      lead_name: payload.leadName,
      lead_source: payload.leadSource,
      target_budget: payload.targetBudget,
      current_status: payload.currentStatus,
      phone_number: payload.phoneNumber,
      email_address: payload.emailAddress,
      market_readiness_score: potentialBuyerIndex,
      raw_transcript: payload.manualNotes,
      ai_summary: summary,
      loan_type: payload.loanType,
      ai_extracted_preferences: preferences,
      is_ai_parsed: true,
      is_first_time_buyer: payload.isFirstTimeBuyer,
      has_verified_pre_approval: payload.hasVerifiedPreApproval,
      purchase_timeline: payload.purchaseTimeline,
      ...adminColumns,
    };

    let leadId: string | null = null;
    let lastErrorMessage: string | null = null;

    const { data: directLead, error: directError } = await supabase
      .from("leads")
      .insert(insertRow)
      .select("id")
      .single();

    if (!directError && directLead?.id) {
      leadId = String(directLead.id);
    } else {
      lastErrorMessage = directError?.message ?? "Direct insert failed.";
    }

    const { data: rpcLeadId, error: rpcError } = leadId
      ? { data: null, error: null }
      : await supabase.rpc("create_owned_lead", {
      p_lead_name: payload.leadName,
      p_lead_source: payload.leadSource,
      p_target_budget: payload.targetBudget,
      p_current_status: payload.currentStatus,
      p_phone_number: payload.phoneNumber ?? "",
      p_email_address: payload.emailAddress ?? "",
      p_market_readiness_score: potentialBuyerIndex,
      p_ai_summary: summary,
      p_loan_type: payload.loanType,
      p_ai_extracted_preferences: preferences,
      p_is_ai_parsed: true,
      p_is_first_time_buyer: payload.isFirstTimeBuyer,
      p_has_verified_pre_approval: payload.hasVerifiedPreApproval,
      p_purchase_timeline: payload.purchaseTimeline,
    });

    if (!leadId && !rpcError && rpcLeadId) {
      leadId = String(rpcLeadId);
      const { error: patchError } = await supabase
        .from("leads")
        .update(adminColumns)
        .eq("id", leadId);
      if (patchError) {
        console.error("[MANUAL_LEAD_INTAKE_ADMIN_PATCH]", { message: patchError.message });
      }
    } else if (!leadId) {
      lastErrorMessage = rpcError?.message ?? lastErrorMessage;
    }

    if (!leadId && isRlsViolation(lastErrorMessage ?? undefined)) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
      if (serviceRoleKey) {
        try {
          const service = createServiceClient();
          const { data: serviceLead, error: serviceError } = await service
            .from("leads")
            .insert(insertRow)
            .select("id")
            .single();
          if (!serviceError && serviceLead?.id) {
            leadId = String(serviceLead.id);
          } else {
            lastErrorMessage = serviceError?.message ?? lastErrorMessage;
          }
        } catch (serviceError: unknown) {
          lastErrorMessage =
            serviceError instanceof Error ? serviceError.message : lastErrorMessage;
        }
      }
    }

    if (!leadId) {
      console.error("[MANUAL_LEAD_INTAKE_INSERT]", { message: lastErrorMessage });
      return jsonError(
        500,
        "INSERT_FAILED",
        lastErrorMessage ?? "Failed to create lead.",
      );
    }

    if (payload.emailAddress && payload.followupDelayDays > 0) {
      const sendTime = new Date();
      sendTime.setDate(sendTime.getDate() + payload.followupDelayDays);
      const plainName = formatPlainFirstName(payload.leadName);

      const scheduleClient = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
        ? createServiceClient()
        : supabase;

      const { error: scheduleError } = await scheduleClient
        .from("scheduled_emails")
        .insert({
          lead_id: leadId,
          recipient_email: payload.emailAddress,
          email_subject: `Welcome, ${plainName}`,
          email_body:
            "Your Assist U 2 Win buyer portal is ready. We will send your full welcome message at the scheduled time.",
          send_at: sendTime.toISOString(),
          is_sent: false,
        });

      if (scheduleError) {
        console.error("[MANUAL_LEAD_SCHEDULE_EMAIL]", {
          message: scheduleError.message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      leadId,
      scheduledFollowupDays:
        payload.emailAddress && payload.followupDelayDays > 0
          ? payload.followupDelayDays
          : 0,
      potentialBuyerIndex,
    });
  } catch (error: unknown) {
    console.error("[MANUAL_LEAD_INTAKE_EXCEPTION]", { error });
    return jsonError(500, "SERVER_ERROR", "Unexpected error creating lead.");
  }
}
