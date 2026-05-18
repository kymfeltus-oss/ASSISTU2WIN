import {
  parseAdminLeadIntakeExtensions,
  type AdminLeadIntakeExtensions,
} from "@/lib/leads/admin-intake-fields";
import {
  computePotentialBuyerIndex,
  parseLeadHurdles,
  parsePurchaseTimeline,
  parseYesNoBoolean,
  type LeadOperationalHurdles,
  type PurchaseTimeline,
} from "@/lib/leads/potential-index";
import {
  isIntakePipelineStatus,
  type IntakePipelineStatus,
} from "@/lib/leads/intake-pipeline-status";
import { type LeadStatus, type LoanType } from "@/lib/leads/types";

export type ManualLeadIntakeBody = {
  readonly leadName: string;
  readonly leadSource: string;
  readonly targetBudget: number;
  readonly currentStatus: LeadStatus;
  readonly phoneNumber: string | null;
  readonly emailAddress: string | null;
  readonly loanType: LoanType;
  readonly followupDelayDays: 0 | 1 | 3;
  readonly isFirstTimeBuyer: boolean;
  readonly hasVerifiedPreApproval: boolean;
  readonly purchaseTimeline: PurchaseTimeline;
  readonly manualNotes: string | null;
  readonly adminExtensions: AdminLeadIntakeExtensions;
};

export type ManualLeadIntakeSuccess = {
  readonly ok: true;
  readonly leadId: string;
  readonly scheduledFollowupDays: number;
  readonly potentialBuyerIndex: number;
};

export type ManualLeadIntakeFailure = {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
};

const INTAKE_LOAN_TYPES = ["Conventional", "FHA", "Cash"] as const satisfies readonly LoanType[];

export function parseManualLeadIntakeBody(body: unknown): ManualLeadIntakeBody | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;

  const leadName = typeof record.leadName === "string" ? record.leadName.trim() : "";
  const leadSource =
    typeof record.leadSource === "string" ? record.leadSource.trim() : "";
  const targetBudget =
    typeof record.targetBudget === "number" && Number.isFinite(record.targetBudget)
      ? record.targetBudget
      : null;
  const currentStatus =
    typeof record.currentStatus === "string" ? record.currentStatus : "";
  const loanType = typeof record.loanType === "string" ? record.loanType : "";
  const followupRaw = record.followupDelayDays;

  if (leadName.length === 0 || leadSource.length === 0 || targetBudget === null) {
    return null;
  }
  if (!isIntakePipelineStatus(currentStatus)) {
    return null;
  }
  const intakeStatus: IntakePipelineStatus = currentStatus;
  if (!INTAKE_LOAN_TYPES.includes(loanType as (typeof INTAKE_LOAN_TYPES)[number])) {
    return null;
  }
  if (followupRaw !== 0 && followupRaw !== 1 && followupRaw !== 3) {
    return null;
  }

  const phoneNumber =
    typeof record.phoneNumber === "string" && record.phoneNumber.trim().length > 0
      ? record.phoneNumber.trim()
      : null;
  const emailAddress =
    typeof record.emailAddress === "string" && record.emailAddress.trim().length > 0
      ? record.emailAddress.trim()
      : null;

  const isFirstTimeBuyer =
    typeof record.isFirstTimeBuyer === "boolean"
      ? record.isFirstTimeBuyer
      : parseYesNoBoolean(record.isFirstTimeBuyer);
  const hasVerifiedPreApproval =
    typeof record.hasVerifiedPreApproval === "boolean"
      ? record.hasVerifiedPreApproval
      : parseYesNoBoolean(record.hasVerifiedPreApproval);
  const purchaseTimeline = parsePurchaseTimeline(record.purchaseTimeline);
  const manualNotes =
    typeof record.manualNotes === "string" && record.manualNotes.trim().length > 0
      ? record.manualNotes.trim()
      : null;

  return {
    leadName,
    leadSource,
    targetBudget,
    currentStatus: intakeStatus,
    phoneNumber,
    emailAddress,
    loanType: loanType as LoanType,
    followupDelayDays: followupRaw,
    isFirstTimeBuyer,
    hasVerifiedPreApproval,
    purchaseTimeline,
    manualNotes,
    adminExtensions: parseAdminLeadIntakeExtensions(record),
  };
}

export function resolvePotentialBuyerIndexForLead(
  status: LeadStatus,
  purchaseTimeline: PurchaseTimeline,
  hasVerifiedPreApproval: boolean,
  options?: {
    readonly notesText?: string;
    readonly hurdles?: LeadOperationalHurdles;
  },
): number {
  return computePotentialBuyerIndex(
    status,
    purchaseTimeline,
    hasVerifiedPreApproval,
    options,
  );
}

export function buildDefaultHurdles(): LeadOperationalHurdles {
  return parseLeadHurdles({});
}

export function formatPlainFirstName(leadName: string): string {
  const segment = leadName.split("&")[0]?.trim();
  return segment && segment.length > 0 ? segment : leadName.trim();
}

export function isAllowedLeadSource(value: string): boolean {
  const allowed = [
    "Referral",
    "Professional Network",
    "Open House",
    "Online Lead",
    "Past Client",
    "Other",
  ] as const;
  return (allowed as readonly string[]).includes(value);
}
