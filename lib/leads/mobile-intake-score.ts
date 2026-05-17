export const FINANCING_OPTIONS = ["Cash", "Conventional", "FHA"] as const;
export type MobileFinancing = (typeof FINANCING_OPTIONS)[number];

export const URGENCY_OPTIONS = ["High", "Medium", "Low"] as const;
export type MobileUrgency = (typeof URGENCY_OPTIONS)[number];

export const ROADBLOCK_OPTIONS = [
  "Must sell current home first",
  "Credit repair needed",
] as const;

export type MobileRoadblock = (typeof ROADBLOCK_OPTIONS)[number];

const FINANCING_POINTS: Record<MobileFinancing, number> = {
  Cash: 30,
  Conventional: 20,
  FHA: 10,
};

const URGENCY_POINTS: Record<MobileUrgency, number> = {
  High: 30,
  Medium: 15,
  Low: 5,
};

const ROADBLOCK_PENALTY = 15;
const MIN_LEAD_SCORE = 0;
const MAX_LEAD_SCORE = 100;

export function computeMobileLeadScore(input: {
  readonly financing: MobileFinancing;
  readonly urgency: MobileUrgency;
  readonly selectedRoadblocks: readonly string[];
}): number {
  const base =
    FINANCING_POINTS[input.financing] + URGENCY_POINTS[input.urgency];
  const penalty = input.selectedRoadblocks.length * ROADBLOCK_PENALTY;
  return Math.max(MIN_LEAD_SCORE, Math.min(MAX_LEAD_SCORE, base - penalty));
}
