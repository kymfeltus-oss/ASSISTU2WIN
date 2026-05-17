import {
  formatProspectBudget,
  getScoreBandClassName,
  type ProspectingFunnelRow,
} from "@/lib/leads/prospecting-funnel";

export type ProspectingFunnelProps = {
  readonly leads: readonly ProspectingFunnelRow[];
};

type ExplainabilityChipsProps = {
  readonly chips: readonly string[];
};

function ExplainabilityChips({ chips }: ExplainabilityChipsProps) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Why this score">
      {chips.map((chip) => (
        <li
          key={chip}
          className="rounded-md border border-slate-700/80 bg-slate-900/50 px-2 py-0.5 text-[10px] font-medium text-slate-400"
        >
          {chip}
        </li>
      ))}
    </ul>
  );
}

type FunnelRowProps = {
  readonly lead: ProspectingFunnelRow;
  readonly rank: number;
};

function FunnelRow({ lead, rank }: FunnelRowProps) {
  const budgetLabel = formatProspectBudget(lead.target_budget);

  return (
    <li className="border-b border-slate-800/50 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-700/80 bg-slate-900/60 text-[10px] font-semibold tabular-nums text-slate-500"
          aria-hidden
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-100">
                {lead.lead_name}
              </p>
              {budgetLabel ? (
                <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                  Max budget {budgetLabel}
                </p>
              ) : null}
            </div>
            <span
              className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${getScoreBandClassName(lead.scoreBand)}`}
            >
              {lead.buyer_index_score}
            </span>
          </div>
          <ExplainabilityChips chips={lead.explainabilityChips} />
        </div>
      </div>
    </li>
  );
}

export function ProspectingFunnel({ leads }: ProspectingFunnelProps) {
  return (
    <section
      aria-label="Prospecting funnel"
      className="rounded-2xl border border-slate-800/60 bg-slate-950/30"
    >
      <div className="border-b border-slate-800/60 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Prospecting funnel
        </h3>
        <p className="mt-1 text-[11px] text-slate-500">
          Top buyers by Potential Index
        </p>
      </div>
      {leads.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          No ranked buyers yet.
        </p>
      ) : (
        <ol className="px-4">
          {leads.map((lead, index) => (
            <FunnelRow key={lead.id} lead={lead} rank={index + 1} />
          ))}
        </ol>
      )}
    </section>
  );
}
