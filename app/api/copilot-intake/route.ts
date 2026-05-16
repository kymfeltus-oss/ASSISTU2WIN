import { parseLeadTranscript } from "@/lib/leads/copilot-parser";
import type { CopilotIntakeRequest } from "@/lib/leads/types";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

type IntakeSuccess = {
  readonly ok: true;
  readonly leadId: string;
};

type IntakeFailure = {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
};

function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse<IntakeFailure> {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function isValidBody(body: unknown): body is CopilotIntakeRequest {
  if (typeof body !== "object" || body === null) return false;
  const record = body as Record<string, unknown>;
  return (
    typeof record.lead_source === "string" &&
    record.lead_source.trim().length > 0 &&
    typeof record.raw_content === "string" &&
    record.raw_content.trim().length > 0
  );
}

function authorizeWebhook(request: Request): boolean {
  const secret = process.env.COPILOT_INTAKE_SECRET?.trim();
  if (!secret) {
    return true;
  }
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }
  return header.slice("Bearer ".length) === secret;
}

export async function POST(
  request: Request,
): Promise<NextResponse<IntakeSuccess | IntakeFailure>> {
  if (!authorizeWebhook(request)) {
    return jsonError(401, "UNAUTHORIZED", "Invalid or missing intake authorization.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error: unknown) {
    console.error("[COPILOT_INTAKE_PARSE_BODY]", { error });
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  if (!isValidBody(body)) {
    return jsonError(
      400,
      "INVALID_PAYLOAD",
      "lead_source and raw_content are required non-empty strings.",
    );
  }

  const leadSource = body.lead_source.trim();
  const rawContent = body.raw_content.trim();

  const parsed = await parseLeadTranscript(leadSource, rawContent);
  if (!parsed) {
    const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
    return jsonError(
      502,
      "AI_PARSE_FAILED",
      hasOpenAi
        ? "Unable to parse lead content with the AI copilot."
        : "OPENAI_API_KEY is not configured on the server.",
    );
  }

  const leadName = parsed.lead_name?.trim() || "Unknown Buyer";

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("leads")
      .insert({
        lead_name: leadName,
        lead_source: leadSource,
        target_budget: parsed.target_budget,
        current_status: "New Lead",
        phone_number: parsed.phone_number,
        email_address: parsed.email_address,
        raw_transcript: rawContent,
        ai_summary: parsed.ai_summary,
        ai_extracted_preferences: parsed.preferences,
        loan_type: parsed.preferences.loan_type,
        is_ai_parsed: true,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      console.error("[COPILOT_INTAKE_INSERT]", {
        message: error?.message ?? "missing id",
      });
      return jsonError(
        500,
        "INSERT_FAILED",
        "Failed to persist parsed lead to the database.",
      );
    }

    return NextResponse.json({ ok: true, leadId: String(data.id) });
  } catch (error: unknown) {
    console.error("[COPILOT_INTAKE_EXCEPTION]", { error });
    return jsonError(
      500,
      "SERVER_ERROR",
      "An unexpected error occurred during lead intake.",
    );
  }
}
