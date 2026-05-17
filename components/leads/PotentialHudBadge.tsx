import { getPotentialHudTier } from "@/lib/leads/potential-index";

type PotentialHudBadgeProps = {
  readonly score: number;
};

export function PotentialHudBadge({ score }: PotentialHudBadgeProps) {
  const tier = getPotentialHudTier(score);
  return (
    <span
      className={`inline-block rounded-md border px-3 py-1 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase ${tier.className}`}
    >
      {tier.label}
    </span>
  );
}
