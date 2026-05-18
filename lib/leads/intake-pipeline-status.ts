import type { LeadStatus } from "@/lib/leads/types";

/** Pipeline status options on admin lead intake (`/dashboard/leads/intake`). */
export const INTAKE_PIPELINE_STATUSES = [
  "Pre-Approved",
  "Denied",
  "No Pre-Approval",
  "Cash",
] as const satisfies readonly LeadStatus[];

export type IntakePipelineStatus = (typeof INTAKE_PIPELINE_STATUSES)[number];

export const INTAKE_PIPELINE_STATUS_OPTIONS: ReadonlyArray<{
  readonly value: IntakePipelineStatus;
  readonly label: string;
}> = [
  { value: "Pre-Approved", label: "Pre-Approved" },
  { value: "Denied", label: "Denied" },
  { value: "No Pre-Approval", label: "No Pre-Approval" },
  { value: "Cash", label: "Cash" },
] as const;

export function isIntakePipelineStatus(value: string): value is IntakePipelineStatus {
  return (INTAKE_PIPELINE_STATUSES as readonly string[]).includes(value);
}

export function hasVerifiedPreApprovalForIntakeStatus(
  status: IntakePipelineStatus,
): boolean {
  return status === "Pre-Approved";
}

/** When pipeline status is Cash, default loan type to Cash. */
export function shouldDefaultLoanTypeToCash(status: IntakePipelineStatus): boolean {
  return status === "Cash";
}
