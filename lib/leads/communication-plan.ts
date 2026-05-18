import {
  EMPTY_COMMUNICATION_PREFERENCES,
  parseAdminLeadIntakeExtensions,
  type LeadCommunicationPreferences,
} from "@/lib/leads/admin-intake-fields";

export const COMMUNICATION_CHANNELS = ["Text", "Call", "Email"] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export type CommunicationPlanData = {
  readonly preferredCommunicationChannel: CommunicationChannel;
  readonly preferredContactWindow: string;
  readonly welcomeEmailEnabled: boolean;
  /** Maps to `public.leads.rep_agreement_pending`. */
  readonly repAgreementPending: boolean;
  readonly customCommunicationNotes: string;
  readonly communicationPreferences: LeadCommunicationPreferences;
};

export function defaultCommunicationPlanData(): CommunicationPlanData {
  return {
    preferredCommunicationChannel: "Text",
    preferredContactWindow: "",
    welcomeEmailEnabled: false,
    repAgreementPending: false,
    customCommunicationNotes: "",
    communicationPreferences: { ...EMPTY_COMMUNICATION_PREFERENCES },
  };
}

function parseCommunicationChannel(value: string | null): CommunicationChannel {
  if (value && (COMMUNICATION_CHANNELS as readonly string[]).includes(value)) {
    return value as CommunicationChannel;
  }
  return "Text";
}

/** Map a `public.leads` row (snake_case) into communication plan UI state. */
export function parseCommunicationPlanFromLeadRow(
  row: Record<string, unknown>,
): CommunicationPlanData {
  const extensions = parseAdminLeadIntakeExtensions(row);
  return {
    preferredCommunicationChannel: parseCommunicationChannel(
      extensions.preferredCommunicationChannel,
    ),
    preferredContactWindow: extensions.preferredContactWindow ?? "",
    welcomeEmailEnabled: extensions.welcomeEmailEnabled,
    repAgreementPending: optionalRepAgreementPending(row),
    customCommunicationNotes: extensions.customCommunicationNotes ?? "",
    communicationPreferences: extensions.communicationPreferences,
  };
}

function optionalRepAgreementPending(row: Record<string, unknown>): boolean {
  if (typeof row.rep_agreement_pending === "boolean") {
    return row.rep_agreement_pending;
  }
  if (row.rep_agreement_pending === "true" || row.rep_agreement_pending === 1) {
    return true;
  }
  return false;
}

/** Columns to persist from communication plan UI state. */
/** Build editor state from a coerced `LeadRecord`. */
export function communicationPlanFromLead(lead: {
  readonly welcome_email_enabled: boolean;
  readonly rep_agreement_pending: boolean;
  readonly preferred_communication_channel: string | null;
  readonly preferred_contact_window: string | null;
  readonly custom_communication_notes: string | null;
  readonly communication_preferences: LeadCommunicationPreferences;
}): CommunicationPlanData {
  return {
    preferredCommunicationChannel: parseCommunicationChannel(
      lead.preferred_communication_channel,
    ),
    preferredContactWindow: lead.preferred_contact_window ?? "",
    welcomeEmailEnabled: lead.welcome_email_enabled,
    repAgreementPending: lead.rep_agreement_pending,
    customCommunicationNotes: lead.custom_communication_notes ?? "",
    communicationPreferences: lead.communication_preferences,
  };
}

export function communicationPlanToDbUpdate(
  data: CommunicationPlanData,
): Record<string, unknown> {
  const contactWindow = data.preferredContactWindow.trim();
  const notes = data.customCommunicationNotes.trim();

  return {
    preferred_communication_channel: data.preferredCommunicationChannel,
    preferred_contact_window: contactWindow.length > 0 ? contactWindow : null,
    welcome_email_enabled: data.welcomeEmailEnabled,
    rep_agreement_pending: data.repAgreementPending,
    custom_communication_notes: notes.length > 0 ? notes : null,
    communication_preferences: data.communicationPreferences,
  };
}
