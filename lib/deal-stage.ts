/**
 * Single source of truth for deal pipeline stages.
 * Values MUST stay aligned with the future PostgreSQL enum, e.g.:
 * `CREATE TYPE deal_stage AS ENUM ('INTAKE', 'PRE_APPROVAL', 'HOME_SHOPPING', 'UNDER_CONTRACT', 'CLOSING_ROOM');`
 */

export const DEAL_STAGE_VALUES = [
  "INTAKE",
  "PRE_APPROVAL",
  "HOME_SHOPPING",
  "UNDER_CONTRACT",
  "CLOSING_ROOM",
] as const;

export type DealStage = (typeof DEAL_STAGE_VALUES)[number];

const DEAL_STAGE_LABELS: Readonly<Record<DealStage, string>> = {
  INTAKE: "Intake",
  PRE_APPROVAL: "Pre-Approval",
  HOME_SHOPPING: "Home Shopping",
  UNDER_CONTRACT: "Under Contract",
  CLOSING_ROOM: "Closing Room",
};

export function isDealStage(value: unknown): value is DealStage {
  return (
    typeof value === "string" &&
    (DEAL_STAGE_VALUES as readonly string[]).includes(value)
  );
}

export function getDealStageLabel(stage: DealStage): string {
  return DEAL_STAGE_LABELS[stage];
}

/** 1-based order for sorting and progress (1 = Intake … 5 = Closing Room). */
export function getDealStageOrder(stage: DealStage): number {
  const index = DEAL_STAGE_VALUES.indexOf(stage);
  return index + 1;
}

export function parseDealStage(value: unknown): DealStage | null {
  return isDealStage(value) ? value : null;
}
