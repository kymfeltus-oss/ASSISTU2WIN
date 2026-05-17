import { PotentialHudBadge } from "@/components/leads/PotentialHudBadge";
import type { LeadRecord } from "@/lib/leads/types";

type LeadsAnalysisPanelProps = {
  readonly leads: readonly LeadRecord[];
  readonly selectedZipCode: string;
  readonly onZipCodeChange: (zip: string) => void;
  readonly generatedReportLink: string | null;
  readonly onGenerateReport: () => void;
};

export function LeadsAnalysisPanel({
  leads,
  selectedZipCode,
  onZipCodeChange,
  generatedReportLink,
  onGenerateReport,
}: LeadsAnalysisPanelProps) {
  const totalMarketVolume = leads.reduce(
    (sum, lead) => sum + Number(lead.target_budget ?? 0),
    0,
  );
  const conventionalCount = leads.filter(
    (lead) => lead.ai_extracted_preferences.loan_type === "Conventional",
  ).length;
  const fhaCount = leads.filter(
    (lead) => lead.ai_extracted_preferences.loan_type === "FHA",
  ).length;
  const cashCount = leads.filter(
    (lead) => lead.ai_extracted_preferences.loan_type === "Cash",
  ).length;
  const urgentLeads = leads.filter((lead) => lead.market_readiness_score >= 90);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div>
        <h2 className="text-lg font-black tracking-tight text-white uppercase">
          Lead Analysis
        </h2>
        <p className="mt-1 text-xs text-[#64748B]">
          Portfolio volume, financing mix, and high-potential buyers.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-5">
          <p className="text-[10px] font-bold tracking-wide text-[#94A3B8] uppercase">
            Total Market Volume
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-400">
            ${totalMarketVolume.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-5">
          <p className="text-[10px] font-bold tracking-wide text-[#94A3B8] uppercase">
            Financing Mix
          </p>
          <p className="mt-2 text-sm text-[#CBD5E1]">
            Conventional {conventionalCount} · FHA {fhaCount} · Cash {cashCount}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-5">
        <p className="mb-3 text-[10px] font-bold tracking-wide text-[#94A3B8] uppercase">
          Hot Buyers (Potential 90+)
        </p>
        {urgentLeads.length === 0 ? (
          <p className="text-xs text-[#64748B]">No hot buyers in the pipeline yet.</p>
        ) : (
          <ul className="space-y-2">
            {urgentLeads.map((lead) => (
              <li
                key={lead.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1E293B]/60 bg-[#070B16] px-3 py-2"
              >
                <span className="text-sm font-bold text-white">{lead.lead_name}</span>
                <PotentialHudBadge score={lead.market_readiness_score} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-5">
        <p className="text-[10px] font-bold tracking-wide text-[#94A3B8] uppercase">
          Market Insights
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-medium text-[#64748B]">ZIP Code</label>
            <input
              type="text"
              value={selectedZipCode}
              onChange={(e) => onZipCodeChange(e.target.value)}
              className="w-full rounded-lg border border-[#1E293B] bg-[#070B16] p-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onGenerateReport}
            className="rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-bold tracking-wide text-[#060813] uppercase hover:bg-cyan-600"
          >
            Generate Report Link
          </button>
        </div>
        {generatedReportLink ? (
          <a
            href={generatedReportLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            Open market snapshot for {selectedZipCode}
          </a>
        ) : null}
      </div>
    </div>
  );
}
