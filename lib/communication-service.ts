import {
  EMPTY_COMMUNICATION_PREFERENCES,
  parseCommunicationPreferences,
  type LeadCommunicationPreferences,
} from "@/lib/leads/admin-intake-fields";
import { formatProperWordsInput, formatEmailInput } from "@/lib/format/proper-text";
import { formatUsPhoneInput, usPhoneDigitsOnly } from "@/lib/format/us-phone";
import { createServiceClient } from "@/lib/supabase/service";

/** QR / public landing page intake payload (camelCase for the UI form). */
export type PublicLeadIntakeFormData = {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly preferred_channel: string;
  readonly contact_window: string;
  readonly notes?: string;
  readonly optInToUpdates?: boolean;
  readonly welcomeEmailEnabled?: boolean;
  /** Maps to `public.leads.communication_preferences` (jsonb). */
  readonly communication_preferences?: LeadCommunicationPreferences;
  readonly repAgreementPending?: boolean;
  /** QR campaign id (URL `source` param). */
  readonly campaignId?: string;
  /** QR scan location (URL `loc` param). */
  readonly location?: string;
};

export type PublicLeadIntakeSuccess = {
  readonly ok: true;
  readonly leadId: string;
};

export type PublicLeadIntakeFailure = {
  readonly ok: false;
  readonly message: string;
};

export type PublicLeadIntakeResult = PublicLeadIntakeSuccess | PublicLeadIntakeFailure;

const PUBLIC_LEAD_SOURCE = "QR Code" as const;

const ALLOWED_CHANNELS = new Set(["Text", "Call", "Email"]);

function parsePublicLeadIntakeFormData(
  raw: unknown,
): PublicLeadIntakeFormData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;

  const name = typeof record.name === "string" ? record.name.trim() : "";
  const email = typeof record.email === "string" ? record.email.trim() : "";
  const phone = typeof record.phone === "string" ? record.phone.trim() : "";
  const preferredChannel =
    typeof record.preferred_channel === "string"
      ? record.preferred_channel.trim()
      : "";
  const contactWindow =
    typeof record.contact_window === "string" ? record.contact_window.trim() : "";

  if (name.length === 0 || email.length === 0 || phone.length === 0) {
    return null;
  }
  if (!ALLOWED_CHANNELS.has(preferredChannel)) {
    return null;
  }

  const notes =
    typeof record.notes === "string" && record.notes.trim().length > 0
      ? record.notes.trim()
      : undefined;

  const optInToUpdates =
    record.optInToUpdates === true ||
    record.opt_in_to_updates === true ||
    record.optInToUpdates === "true";

  const welcomeEmailEnabled =
    record.welcomeEmailEnabled === true ||
    record.welcome_email_enabled === true ||
    record.welcomeEmailEnabled === "true";

  const campaignId =
    typeof record.campaignId === "string"
      ? record.campaignId.trim()
      : typeof record.campaign_id === "string"
        ? record.campaign_id.trim()
        : undefined;

  const location =
    typeof record.location === "string"
      ? record.location.trim()
      : typeof record.loc === "string"
        ? record.loc.trim()
        : undefined;

  const communicationPreferencesRaw =
    record.communication_preferences ?? record.communicationPreferences;

  const repAgreementPending =
    record.repAgreementPending === true ||
    record.rep_agreement_pending === true ||
    record.repAgreementPending === "true" ||
    record.rep_agreement_pending === "true";

  return {
    name,
    email,
    phone,
    preferred_channel: preferredChannel,
    contact_window: contactWindow,
    notes,
    optInToUpdates,
    welcomeEmailEnabled,
    communication_preferences:
      communicationPreferencesRaw !== undefined
        ? parseCommunicationPreferences(communicationPreferencesRaw)
        : undefined,
    repAgreementPending,
    campaignId: campaignId && campaignId.length > 0 ? campaignId : undefined,
    location: location && location.length > 0 ? location : undefined,
  };
}

function buildCommunicationPreferences(
  optInToUpdates: boolean,
  welcomeEmailEnabled: boolean,
): LeadCommunicationPreferences {
  return {
    ...EMPTY_COMMUNICATION_PREFERENCES,
    buyer_consultation_invite_enabled: welcomeEmailEnabled,
    market_update_email_enabled: optInToUpdates,
  };
}

function resolvePublicLeadSource(formData: PublicLeadIntakeFormData): string {
  if (formData.campaignId && formData.campaignId.length > 0) {
    return `QR · ${formatProperWordsInput(formData.campaignId)}`;
  }
  return PUBLIC_LEAD_SOURCE;
}

/**
 * Server-only: inserts a public QR / landing-page lead via service role.
 * Maps UI fields to `public.leads` columns (not full_name / phone / welcome_email_sent).
 */
export async function handleLeadIntake(
  formData: PublicLeadIntakeFormData,
): Promise<PublicLeadIntakeResult> {
  try {
    const supabase = createServiceClient();

    const leadName = formatProperWordsInput(formData.name.trim());
    const emailAddress = formatEmailInput(formData.email.trim());
    const phoneDigits = usPhoneDigitsOnly(formData.phone);
    const phoneNumber =
      phoneDigits.length > 0 ? formatUsPhoneInput(phoneDigits) : null;

    const contactWindow = formatProperWordsInput(formData.contact_window.trim());
    const notes = formData.notes?.trim()
      ? formatProperWordsInput(formData.notes)
      : null;

    const welcomeEmailEnabled = formData.welcomeEmailEnabled === true;
    const optInToUpdates = formData.optInToUpdates === true;

    const communication_preferences: LeadCommunicationPreferences = {
      ...(formData.communication_preferences ??
        buildCommunicationPreferences(optInToUpdates, welcomeEmailEnabled)),
      buyer_consultation_invite_enabled:
        welcomeEmailEnabled ||
        (formData.communication_preferences?.buyer_consultation_invite_enabled ??
          false),
      market_update_email_enabled:
        formData.communication_preferences?.market_update_email_enabled ??
        optInToUpdates,
    };

    const leadSource = resolvePublicLeadSource(formData);

    const insertRow = {
      lead_name: leadName,
      lead_source: leadSource,
      lead_source_other:
        formData.location && formData.location.length > 0
          ? formatProperWordsInput(formData.location)
          : null,
      target_budget: null,
      current_status: "No Pre-Approval",
      phone_number: phoneNumber,
      email_address: emailAddress,
      preferred_communication_channel: formData.preferred_channel,
      preferred_contact_window: contactWindow.length > 0 ? contactWindow : null,
      custom_communication_notes: notes,
      welcome_email_enabled: welcomeEmailEnabled,
      rep_agreement_pending: formData.repAgreementPending === true,
      communication_preferences,
      market_readiness_score: 50,
      purchase_timeline: "1-3 Months",
      is_first_time_buyer: false,
      has_verified_pre_approval: false,
      is_ai_parsed: false,
      ai_summary: notes
        ? `QR intake · ${notes}`
        : "Prospective buyer submitted via QR landing page.",
      raw_transcript: notes,
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

    const { data, error } = await supabase
      .from("leads")
      .insert([insertRow])
      .select("id")
      .single();

    if (error || !data?.id) {
      console.error("[PUBLIC_LEAD_INTAKE_INSERT]", { message: error?.message });
      return {
        ok: false,
        message: error?.message ?? "Unable to save your information. Please try again.",
      };
    }

    return { ok: true, leadId: String(data.id) };
  } catch (error: unknown) {
    console.error("[PUBLIC_LEAD_INTAKE_EXCEPTION]", { error });
    return {
      ok: false,
      message: "Unable to save your information. Please try again.",
    };
  }
}

/** Browser-safe: POST to the public intake API (do not call handleLeadIntake from the client). */
export async function submitPublicLeadIntake(
  formData: PublicLeadIntakeFormData,
): Promise<PublicLeadIntakeResult> {
  try {
    const response = await fetch("/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload &&
        typeof (payload as { message: unknown }).message === "string"
          ? (payload as { message: string }).message
          : "Unable to save your information.";
      return { ok: false, message };
    }

    if (
      typeof payload === "object" &&
      payload !== null &&
      "ok" in payload &&
      (payload as { ok: unknown }).ok === true &&
      "leadId" in payload &&
      typeof (payload as { leadId: unknown }).leadId === "string"
    ) {
      return { ok: true, leadId: (payload as { leadId: string }).leadId };
    }

    return { ok: false, message: "Unexpected response from the server." };
  } catch (error: unknown) {
    console.error("[PUBLIC_LEAD_INTAKE_FETCH]", { error });
    return { ok: false, message: "Network error. Please try again." };
  }
}

export function parsePublicLeadIntakeRequestBody(
  body: unknown,
): PublicLeadIntakeFormData | null {
  return parsePublicLeadIntakeFormData(body);
}
