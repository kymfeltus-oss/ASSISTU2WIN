import { formatProperWordsInput, formatEmailInput } from "@/lib/format/proper-text";
import { formatUsPhoneInput, usPhoneDigitsOnly } from "@/lib/format/us-phone";
import {
  EMPTY_COMMUNICATION_PREFERENCES,
  parseCommunicationPreferences,
} from "@/lib/leads/admin-intake-fields";
import { getNotificationBaseUrl } from "@/lib/notifications/notification-base-url";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type IntakeSuccess = { readonly ok: true; readonly leadId: string };
type IntakeFailure = { readonly ok: false; readonly message: string };

function jsonError(status: number, message: string): NextResponse<IntakeFailure> {
  return NextResponse.json({ ok: false, message }, { status });
}

function readString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function readBoolean(record: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = record[key];
    if (value === true || value === "true" || value === 1) return true;
  }
  return false;
}

/**
 * Public QR / landing-page intake.
 * Persists `communication_preferences` (jsonb) and `rep_agreement_pending` on `public.leads`.
 */
export async function POST(
  request: Request,
): Promise<NextResponse<IntakeSuccess | IntakeFailure>> {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null) {
      return jsonError(400, "Request body must be a JSON object.");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }

  if (process.env.NODE_ENV === "development") {
    console.log("DEBUG: Received Payload:", JSON.stringify(body, null, 2));
  }

  const leadNameRaw = readString(body, "lead_name", "name");
  const emailRaw = readString(body, "email_address", "email");
  const phoneRaw = readString(body, "phone_number", "phone");
  const preferredChannel = readString(
    body,
    "preferred_communication_channel",
    "preferred_channel",
  );

  if (
    leadNameRaw.length === 0 ||
    emailRaw.length === 0 ||
    phoneRaw.length === 0 ||
    preferredChannel.length === 0
  ) {
    return jsonError(
      400,
      "Name, email, phone, and preferred contact channel are required.",
    );
  }

  // Force the mapping to be safe (snake_case column; accept camelCase from clients)
  const communicationPreferencesRaw =
    body.communication_preferences || body.communicationPreferences || {};

  const repAgreementPending =
    body.rep_agreement_pending ?? body.repAgreementPending ?? false;

  const leadData = {
    lead_name: formatProperWordsInput(leadNameRaw),
    email_address: formatEmailInput(emailRaw),
    communication_preferences:
      typeof communicationPreferencesRaw === "object" &&
      communicationPreferencesRaw !== null
        ? parseCommunicationPreferences(communicationPreferencesRaw)
        : { ...EMPTY_COMMUNICATION_PREFERENCES },
    rep_agreement_pending: Boolean(repAgreementPending),
    phone_number: (() => {
      const digits = usPhoneDigitsOnly(phoneRaw);
      return digits.length > 0 ? formatUsPhoneInput(digits) : phoneRaw;
    })(),
    lead_source: (() => {
      const campaign = readString(body, "campaignId", "campaign_id", "src");
      return campaign.length > 0
        ? `QR · ${formatProperWordsInput(campaign)}`
        : "QR Code";
    })(),
    lead_source_other: (() => {
      const loc = readString(body, "location", "loc");
      return loc.length > 0 ? formatProperWordsInput(loc) : null;
    })(),
    target_budget: null,
    current_status: "No Pre-Approval",
    preferred_communication_channel: preferredChannel,
    preferred_contact_window: (() => {
      const window = readString(body, "preferred_contact_window", "contact_window");
      return window.length > 0 ? formatProperWordsInput(window) : null;
    })(),
    custom_communication_notes: (() => {
      const notes = readString(body, "custom_communication_notes", "notes");
      return notes.length > 0 ? formatProperWordsInput(notes) : null;
    })(),
    welcome_email_enabled: readBoolean(
      body,
      "welcome_email_enabled",
      "welcomeEmailEnabled",
    ),
    market_readiness_score: 50,
    purchase_timeline: "1-3 Months",
    is_first_time_buyer: false,
    has_verified_pre_approval: false,
    is_ai_parsed: false,
    ai_summary: (() => {
      const notes = readString(body, "custom_communication_notes", "notes");
      return notes.length > 0
        ? `QR intake · ${formatProperWordsInput(notes)}`
        : "Prospective buyer submitted via QR landing page.";
    })(),
    raw_transcript: (() => {
      const notes = readString(body, "custom_communication_notes", "notes");
      return notes.length > 0 ? formatProperWordsInput(notes) : null;
    })(),
    ai_extracted_preferences: {
      target_neighborhoods: [],
      min_bedrooms: null,
      pre_approval_status: null,
      loan_type: "Unknown",
      hurdle_lender: false,
      hurdle_home_sale: false,
      hurdle_down_payment: false,
    },
  };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from("leads").insert([leadData]).select("id").single();

    if (error || !data?.id) {
      console.error("[API_INTAKE_INSERT]", { message: error?.message });
      return jsonError(
        500,
        error?.message ?? "Unable to save your information. Please try again.",
      );
    }

    if (leadData.welcome_email_enabled && leadData.email_address) {
      const baseUrl = getNotificationBaseUrl();
      void fetch(`${baseUrl}/api/notifications/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: leadData.email_address,
          name: leadData.lead_name,
        }),
      }).catch((welcomeError: unknown) => {
        console.error("[API_INTAKE_WELCOME_EMAIL_TRIGGER]", { welcomeError });
      });
    }

    return NextResponse.json({ ok: true, leadId: String(data.id) }, { status: 201 });
  } catch (error: unknown) {
    console.error("[API_INTAKE_EXCEPTION]", { error });
    return jsonError(500, "Unable to save your information. Please try again.");
  }
}
