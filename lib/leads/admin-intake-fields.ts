/** Communication automation toggles (stored in public.leads.communication_preferences). */
export type LeadCommunicationPreferences = {
  readonly buyer_consultation_invite_enabled: boolean;
  readonly pre_approval_reminder_enabled: boolean;
  readonly market_update_email_enabled: boolean;
  readonly representation_agreement_reminder_enabled: boolean;
  readonly inactive_lead_reengagement_enabled: boolean;
};

export const EMPTY_COMMUNICATION_PREFERENCES: LeadCommunicationPreferences = {
  buyer_consultation_invite_enabled: false,
  pre_approval_reminder_enabled: false,
  market_update_email_enabled: false,
  representation_agreement_reminder_enabled: false,
  inactive_lead_reengagement_enabled: false,
};

/** Optional admin intake extensions (all optional on submit). */
export type AdminLeadIntakeExtensions = {
  readonly coBuyerName: string | null;
  readonly coBuyerEmail: string | null;
  readonly coBuyerPhone: string | null;
  readonly coBuyerRelationship: string | null;
  readonly leadSourceOther: string | null;
  readonly streetAddress: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly zipCode: string | null;
  readonly currentHousingStatus: string | null;
  readonly dtiRatio: number | null;
  readonly creditScoreRange: string | null;
  readonly downPaymentAmount: number | null;
  readonly monthlyPaymentComfort: number | null;
  readonly employmentStatus: string | null;
  readonly lenderName: string | null;
  readonly welcomeEmailEnabled: boolean;
  readonly followUpFrequency: string | null;
  readonly firstFollowUpDate: string | null;
  readonly preferredCommunicationChannel: string | null;
  readonly preferredContactWindow: string | null;
  readonly customCommunicationNotes: string | null;
  readonly communicationPreferences: LeadCommunicationPreferences;
};

function optionalTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function optionalBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

function optionalIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}

export function parseCommunicationPreferences(
  raw: unknown,
): LeadCommunicationPreferences {
  if (typeof raw !== "object" || raw === null) {
    return EMPTY_COMMUNICATION_PREFERENCES;
  }
  const record = raw as Record<string, unknown>;
  return {
    buyer_consultation_invite_enabled: optionalBoolean(
      record.buyer_consultation_invite_enabled,
    ),
    pre_approval_reminder_enabled: optionalBoolean(
      record.pre_approval_reminder_enabled,
    ),
    market_update_email_enabled: optionalBoolean(record.market_update_email_enabled),
    representation_agreement_reminder_enabled: optionalBoolean(
      record.representation_agreement_reminder_enabled,
    ),
    inactive_lead_reengagement_enabled: optionalBoolean(
      record.inactive_lead_reengagement_enabled,
    ),
  };
}

export function parseAdminLeadIntakeExtensions(
  record: Record<string, unknown>,
): AdminLeadIntakeExtensions {
  const communicationRaw =
    record.communicationPreferences ?? record.communication_preferences;

  return {
    coBuyerName: optionalTrimmedString(record.coBuyerName ?? record.co_buyer_name),
    coBuyerEmail: optionalTrimmedString(record.coBuyerEmail ?? record.co_buyer_email),
    coBuyerPhone: optionalTrimmedString(record.coBuyerPhone ?? record.co_buyer_phone),
    coBuyerRelationship: optionalTrimmedString(
      record.coBuyerRelationship ?? record.co_buyer_relationship,
    ),
    leadSourceOther: optionalTrimmedString(
      record.leadSourceOther ?? record.lead_source_other,
    ),
    streetAddress: optionalTrimmedString(record.streetAddress ?? record.street_address),
    city: optionalTrimmedString(record.city),
    state: optionalTrimmedString(record.state),
    zipCode: optionalTrimmedString(record.zipCode ?? record.zip_code),
    currentHousingStatus: optionalTrimmedString(
      record.currentHousingStatus ?? record.current_housing_status,
    ),
    dtiRatio: optionalFiniteNumber(record.dtiRatio ?? record.dti_ratio),
    creditScoreRange: optionalTrimmedString(
      record.creditScoreRange ?? record.credit_score_range,
    ),
    downPaymentAmount: optionalFiniteNumber(
      record.downPaymentAmount ?? record.down_payment_amount,
    ),
    monthlyPaymentComfort: optionalFiniteNumber(
      record.monthlyPaymentComfort ?? record.monthly_payment_comfort,
    ),
    employmentStatus: optionalTrimmedString(
      record.employmentStatus ?? record.employment_status,
    ),
    lenderName: optionalTrimmedString(record.lenderName ?? record.lender_name),
    welcomeEmailEnabled: optionalBoolean(
      record.welcomeEmailEnabled ?? record.welcome_email_enabled,
    ),
    followUpFrequency: optionalTrimmedString(
      record.followUpFrequency ?? record.follow_up_frequency,
    ),
    firstFollowUpDate: optionalIsoDate(
      record.firstFollowUpDate ?? record.first_follow_up_date,
    ),
    preferredCommunicationChannel: optionalTrimmedString(
      record.preferredCommunicationChannel ?? record.preferred_communication_channel,
    ),
    preferredContactWindow: optionalTrimmedString(
      record.preferredContactWindow ?? record.preferred_contact_window,
    ),
    customCommunicationNotes: optionalTrimmedString(
      record.customCommunicationNotes ?? record.custom_communication_notes,
    ),
    communicationPreferences: parseCommunicationPreferences(communicationRaw),
  };
}

export function buildAdminIntakeInsertColumns(
  extensions: AdminLeadIntakeExtensions,
): Record<string, unknown> {
  return {
    co_buyer_name: extensions.coBuyerName,
    co_buyer_email: extensions.coBuyerEmail,
    co_buyer_phone: extensions.coBuyerPhone,
    co_buyer_relationship: extensions.coBuyerRelationship,
    lead_source_other: extensions.leadSourceOther,
    street_address: extensions.streetAddress,
    city: extensions.city,
    state: extensions.state,
    target_zip_code: extensions.zipCode,
    current_housing_status: extensions.currentHousingStatus,
    dti_ratio: extensions.dtiRatio,
    credit_score_range: extensions.creditScoreRange,
    down_payment_amount: extensions.downPaymentAmount,
    monthly_payment_comfort: extensions.monthlyPaymentComfort,
    employment_status: extensions.employmentStatus,
    lender_name: extensions.lenderName,
    welcome_email_enabled: extensions.welcomeEmailEnabled,
    follow_up_frequency: extensions.followUpFrequency,
    first_follow_up_date: extensions.firstFollowUpDate,
    preferred_communication_channel: extensions.preferredCommunicationChannel,
    preferred_contact_window: extensions.preferredContactWindow,
    custom_communication_notes: extensions.customCommunicationNotes,
    communication_preferences: extensions.communicationPreferences,
  };
}

function parseOptionalNumberString(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Maps admin intake form state to API body fields (camelCase). */
export function adminIntakeFormToRequestBody(
  state: {
    readonly coBuyerName: string;
    readonly coBuyerEmail: string;
    readonly coBuyerPhone: string;
    readonly coBuyerRelationship: string;
    readonly leadSourceOther: string;
    readonly streetAddress: string;
    readonly city: string;
    readonly state: string;
    readonly zipCode: string;
    readonly currentHousingStatus: string;
    readonly dtiRatio: string;
    readonly creditScoreRange: string;
    readonly downPaymentAmount: string;
    readonly monthlyPaymentComfort: string;
    readonly employmentStatus: string;
    readonly lenderName: string;
    readonly welcomeEmailEnabled: boolean;
    readonly followUpFrequency: string;
    readonly firstFollowUpDate: string;
    readonly preferredCommunicationChannel: string;
    readonly preferredContactWindow: string;
    readonly customCommunicationNotes: string;
    readonly communicationPreferences: LeadCommunicationPreferences;
  },
): Record<string, unknown> {
  return {
    coBuyerName: state.coBuyerName.trim() || null,
    coBuyerEmail: state.coBuyerEmail.trim() || null,
    coBuyerPhone: state.coBuyerPhone.trim() || null,
    coBuyerRelationship: state.coBuyerRelationship.trim() || null,
    leadSourceOther: state.leadSourceOther.trim() || null,
    streetAddress: state.streetAddress.trim() || null,
    city: state.city.trim() || null,
    state: state.state.trim() || null,
    zipCode: state.zipCode.trim() || null,
    currentHousingStatus: state.currentHousingStatus.trim() || null,
    dtiRatio: parseOptionalNumberString(state.dtiRatio),
    creditScoreRange: state.creditScoreRange.trim() || null,
    downPaymentAmount: parseOptionalNumberString(state.downPaymentAmount),
    monthlyPaymentComfort: parseOptionalNumberString(state.monthlyPaymentComfort),
    employmentStatus: state.employmentStatus.trim() || null,
    lenderName: state.lenderName.trim() || null,
    welcomeEmailEnabled: state.welcomeEmailEnabled,
    followUpFrequency: state.followUpFrequency.trim() || null,
    firstFollowUpDate: state.firstFollowUpDate.trim() || null,
    preferredCommunicationChannel: state.preferredCommunicationChannel.trim() || null,
    preferredContactWindow: state.preferredContactWindow.trim() || null,
    customCommunicationNotes: state.customCommunicationNotes.trim() || null,
    communicationPreferences: state.communicationPreferences,
  };
}

export function hasAdminIntakeExtensions(extensions: AdminLeadIntakeExtensions): boolean {
  const { communicationPreferences, welcomeEmailEnabled, ...scalarFields } = extensions;
  const hasScalar = Object.values(scalarFields).some((value) => {
    if (typeof value === "boolean") return value;
    return value !== null;
  });
  const hasCommunicationToggle = Object.values(communicationPreferences).some(Boolean);
  return hasScalar || hasCommunicationToggle || welcomeEmailEnabled;
}
