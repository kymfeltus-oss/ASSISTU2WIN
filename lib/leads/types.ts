/** Pipeline milestones — drives future homebuyer portal timelines. */
export const LEAD_STATUSES = [
  "New Lead",
  "Pre-Approved",
  "Denied",
  "No Pre-Approval",
  "Cash",
  "Active Client",
  "Active Searching",
  "Under Contract",
  "Closed",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LOAN_TYPES = [
  "Conventional",
  "FHA",
  "VA",
  "USDA",
  "Cash",
  "Unknown",
] as const;

export type LoanType = (typeof LOAN_TYPES)[number];

import type { LeadCommunicationPreferences } from "@/lib/leads/admin-intake-fields";
import { parseCommunicationPlanFromLeadRow } from "@/lib/leads/communication-plan";

/** AI-extracted buyer preferences (extensible for lender/title portals). */
export type LeadExtractedPreferences = {
  readonly target_neighborhoods: readonly string[];
  readonly min_bedrooms: number | null;
  readonly pre_approval_status: string | null;
  readonly loan_type: LoanType;
  readonly hurdle_lender: boolean;
  readonly hurdle_home_sale: boolean;
  readonly hurdle_down_payment: boolean;
};

export type LeadRecord = {
  readonly id: string;
  readonly lead_name: string;
  readonly lead_source: string;
  readonly target_budget: number | null;
  readonly current_status: LeadStatus;
  readonly phone_number: string | null;
  readonly email_address: string | null;
  readonly raw_transcript: string | null;
  readonly ai_summary: string | null;
  readonly ai_extracted_preferences: LeadExtractedPreferences;
  /** Potential Buyer Index (0–100 display; stored as market_readiness_score). */
  readonly market_readiness_score: number;
  readonly is_first_time_buyer: boolean;
  readonly has_verified_pre_approval: boolean;
  readonly purchase_timeline: string;
  readonly buyer_engagement_count: number;
  readonly ai_next_best_action: string | null;
  readonly target_timeline: string | null;
  readonly is_ai_parsed: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly welcome_email_enabled: boolean;
  readonly rep_agreement_pending: boolean;
  readonly preferred_communication_channel: string | null;
  readonly preferred_contact_window: string | null;
  readonly custom_communication_notes: string | null;
  readonly communication_preferences: LeadCommunicationPreferences;
};

export type CopilotIntakeRequest = {
  readonly lead_source: string;
  readonly raw_content: string;
};

export type CopilotParseResult = {
  readonly lead_name: string | null;
  readonly target_budget: number | null;
  readonly ai_summary: string;
  readonly phone_number: string | null;
  readonly email_address: string | null;
  readonly preferences: LeadExtractedPreferences;
};

export function parseLeadStatus(value: unknown): LeadStatus {
  if (typeof value === "string" && LEAD_STATUSES.includes(value as LeadStatus)) {
    return value as LeadStatus;
  }
  return "New Lead";
}

export function parseLoanType(value: unknown): LoanType {
  if (
    typeof value === "string" &&
    LOAN_TYPES.includes(value as LoanType)
  ) {
    return value as LoanType;
  }
  return "Unknown";
}

export function parseLeadPreferences(raw: unknown): LeadExtractedPreferences {
  if (typeof raw !== "object" || raw === null) {
    return {
      target_neighborhoods: [],
      min_bedrooms: null,
      pre_approval_status: null,
      loan_type: "Unknown",
      hurdle_lender: false,
      hurdle_home_sale: false,
      hurdle_down_payment: false,
    };
  }
  const record = raw as Record<string, unknown>;
  const neighborhoods = Array.isArray(record.target_neighborhoods)
    ? record.target_neighborhoods.filter(
        (n): n is string => typeof n === "string" && n.trim().length > 0,
      )
    : [];
  const minBedrooms =
    typeof record.min_bedrooms === "number" && Number.isFinite(record.min_bedrooms)
      ? Math.max(0, Math.floor(record.min_bedrooms))
      : null;
  const preApproval =
    typeof record.pre_approval_status === "string" &&
    record.pre_approval_status.trim().length > 0
      ? record.pre_approval_status.trim()
      : null;

  return {
    target_neighborhoods: neighborhoods,
    min_bedrooms: minBedrooms,
    pre_approval_status: preApproval,
    loan_type: parseLoanType(record.loan_type),
    hurdle_lender: record.hurdle_lender === true,
    hurdle_home_sale: record.hurdle_home_sale === true,
    hurdle_down_payment: record.hurdle_down_payment === true,
  };
}

export function coerceLeadRow(row: Record<string, unknown>): LeadRecord {
  return {
    id: String(row.id),
    lead_name: String(row.lead_name ?? "Unknown Buyer"),
    lead_source: String(row.lead_source ?? "Unspecified"),
    target_budget:
      typeof row.target_budget === "number" && Number.isFinite(row.target_budget)
        ? row.target_budget
        : row.target_budget === null
          ? null
          : null,
    current_status: parseLeadStatus(row.current_status),
    phone_number:
      typeof row.phone_number === "string" ? row.phone_number : null,
    email_address:
      typeof row.email_address === "string" ? row.email_address : null,
    raw_transcript:
      typeof row.raw_transcript === "string" ? row.raw_transcript : null,
    ai_summary: typeof row.ai_summary === "string" ? row.ai_summary : null,
    ai_extracted_preferences: (() => {
      const preferences = parseLeadPreferences(row.ai_extracted_preferences);
      const columnLoanType = parseLoanType(row.loan_type);
      return {
        ...preferences,
        loan_type:
          columnLoanType !== "Unknown" ? columnLoanType : preferences.loan_type,
      };
    })(),
    market_readiness_score:
      typeof row.market_readiness_score === "number" &&
      Number.isFinite(row.market_readiness_score)
        ? Math.max(0, Math.min(100, Math.floor(row.market_readiness_score)))
        : 0,
    is_first_time_buyer: row.is_first_time_buyer === true,
    has_verified_pre_approval: row.has_verified_pre_approval === true,
    purchase_timeline:
      typeof row.purchase_timeline === "string" && row.purchase_timeline.trim().length > 0
        ? row.purchase_timeline.trim()
        : "1-3 Months",
    buyer_engagement_count:
      typeof row.buyer_engagement_count === "number" &&
      Number.isFinite(row.buyer_engagement_count)
        ? Math.max(0, Math.floor(row.buyer_engagement_count))
        : 0,
    ai_next_best_action:
      typeof row.ai_next_best_action === "string"
        ? row.ai_next_best_action
        : null,
    target_timeline:
      typeof row.target_timeline === "string" ? row.target_timeline : null,
    is_ai_parsed: row.is_ai_parsed === true,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    ...(() => {
      const plan = parseCommunicationPlanFromLeadRow(row);
      return {
        welcome_email_enabled: plan.welcomeEmailEnabled,
        rep_agreement_pending: plan.repAgreementPending,
        preferred_communication_channel: plan.preferredCommunicationChannel,
        preferred_contact_window:
          plan.preferredContactWindow.trim().length > 0
            ? plan.preferredContactWindow
            : null,
        custom_communication_notes:
          plan.customCommunicationNotes.trim().length > 0
            ? plan.customCommunicationNotes
            : null,
        communication_preferences: plan.communicationPreferences,
      };
    })(),
  };
}
