import {
  formatKpiCount,
  formatKpiCurrency,
  type KpiPulseMetrics,
} from "@/lib/leads/kpi-pulse";

export type KpiPulseProps = KpiPulseMetrics;

type KpiItemProps = {
  readonly label: string;
  readonly value: string;
  readonly valueClassName?: string;
};

function KpiItem({ label, value, valueClassName }: KpiItemProps) {
  return (
    <div className="min-w-[7.5rem] flex-1">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums tracking-tight sm:text-xl ${valueClassName ?? "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}

export function KpiPulse({
  pipelineVelocity,
  projectedGci,
  hotLeads,
  meetingsToday,
}: KpiPulseProps) {
  return (
    <section
      aria-label="KPI pulse"
      className="flex flex-wrap gap-x-10 gap-y-4 border-b border-slate-800/50 pb-4"
    >
      <KpiItem
        label="Pipeline Velocity"
        value={formatKpiCurrency(pipelineVelocity)}
      />
      <KpiItem
        label="Projected GCI"
        value={formatKpiCurrency(projectedGci)}
        valueClassName="text-emerald-400"
      />
      <KpiItem label="Hot Leads" value={formatKpiCount(hotLeads)} />
      <KpiItem label="Meetings Today" value={formatKpiCount(meetingsToday)} />
    </section>
  );
}
