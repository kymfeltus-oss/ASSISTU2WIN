"use client";

import { useMemo, useState } from "react";
import type { LeadRecord } from "@/lib/leads/types";

type LeadAnalysisViewProps = {
  readonly leads: readonly LeadRecord[];
  readonly selectedZipCode: string;
  readonly onZipCodeChange: (zip: string) => void;
  readonly generatedReportLink: string | null;
  readonly onGenerateReport: () => void;
};

type WidgetToggle = {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly onToggle: () => void;
};

type DistributionRow = {
  readonly label: string;
  readonly count: number;
  readonly pct: number;
  readonly barClassName: string;
};

const URGENCY_KEYWORDS = [
  "school",
  "urgently",
  "urgent",
  "lease",
  "relocating",
  "relocation",
] as const;

function matchesUrgencySummary(summary: string | null): boolean {
  if (!summary) return false;
  const lower = summary.toLowerCase();
  return URGENCY_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function pctOf(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

export function LeadAnalysisView({
  leads,
  selectedZipCode,
  onZipCodeChange,
  generatedReportLink,
  onGenerateReport,
}: LeadAnalysisViewProps) {
  const [showMarketCap, setShowMarketCap] = useState(true);
  const [showFinancing, setShowFinancing] = useState(true);
  const [showRoadblocks, setShowRoadblocks] = useState(true);
  const [showLeadMagnets, setShowLeadMagnets] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const totalLeadsCount = leads.length;
    const divisor = totalLeadsCount > 0 ? totalLeadsCount : 1;

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

    const lenderHurdles = leads.filter((lead) => !lead.has_verified_pre_approval).length;
    const homeSaleHurdles = leads.filter(
      (lead) => lead.ai_extracted_preferences.hurdle_home_sale,
    ).length;

    const urgentLeads = leads.filter(
      (lead) =>
        matchesUrgencySummary(lead.ai_summary) || lead.market_readiness_score >= 90,
    );

    const financingRows: readonly DistributionRow[] = [
      {
        label: "Conventional",
        count: conventionalCount,
        pct: pctOf(conventionalCount, divisor),
        barClassName: "bg-[#22D3EE]",
      },
      {
        label: "FHA / VA",
        count: fhaCount,
        pct: pctOf(fhaCount, divisor),
        barClassName: "bg-[#F59E0B]",
      },
      {
        label: "Cash",
        count: cashCount,
        pct: pctOf(cashCount, divisor),
        barClassName: "bg-[#10B981]",
      },
    ];

    const roadblockRows: readonly DistributionRow[] = [
      {
        label: "Awaiting verified pre-approval",
        count: lenderHurdles,
        pct: pctOf(lenderHurdles, divisor),
        barClassName: "bg-purple-500",
      },
      {
        label: "Contingent on home sale",
        count: homeSaleHurdles,
        pct: pctOf(homeSaleHurdles, divisor),
        barClassName: "bg-rose-500",
      },
    ];

    return {
      totalLeadsCount,
      totalMarketVolume,
      projectedCommission: totalMarketVolume * 0.03,
      financingRows,
      roadblockRows,
      urgentLeads,
    };
  }, [leads]);

  const widgetToggles: readonly WidgetToggle[] = [
    {
      id: "market-cap",
      label: "Market Volume",
      enabled: showMarketCap,
      onToggle: () => setShowMarketCap((value) => !value),
    },
    {
      id: "financing",
      label: "Loan Products",
      enabled: showFinancing,
      onToggle: () => setShowFinancing((value) => !value),
    },
    {
      id: "roadblocks",
      label: "Roadblocks",
      enabled: showRoadblocks,
      onToggle: () => setShowRoadblocks((value) => !value),
    },
    {
      id: "lead-magnets",
      label: "Market Reports",
      enabled: showLeadMagnets,
      onToggle: () => setShowLeadMagnets((value) => !value),
    },
  ];

  const handleCopyReportLink = async () => {
    if (!generatedReportLink) return;
    try {
      await navigator.clipboard.writeText(generatedReportLink);
      setCopyFeedback("Link copied.");
    } catch {
      setCopyFeedback("Copy failed — select the link manually.");
    }
  };

  return (
    <div className="w-full space-y-6 p-4 font-sans selection:bg-cyan-500/20 md:p-8">
      <div className="flex flex-col gap-3 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.04] p-4 shadow-xl backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[10px] font-black tracking-wider text-[#64748B] uppercase">
          Analysis panels
        </span>
        <div className="flex w-full flex-wrap justify-end gap-1.5 sm:w-auto">
          {widgetToggles.map((toggle) => (
            <button
              key={toggle.id}
              type="button"
              onClick={toggle.onToggle}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                toggle.enabled
                  ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                  : "border border-[#1E293B] bg-[#070B16] text-[#475569]"
              }`}
            >
              {toggle.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {showMarketCap ? (
          <div className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl">
            <div className="absolute top-0 left-0 h-full w-[3px] bg-gradient-to-b from-[#22D3EE] to-transparent" />
            <span className="block text-[10px] font-bold tracking-wider text-[#64748B] uppercase">
              Active buyer budget volume
            </span>
            <div className="mt-1 text-2xl font-black tracking-tight text-white">
              {formatCurrency(metrics.totalMarketVolume)}
            </div>
            <p className="mt-1.5 text-[11px] leading-normal text-[#475569]">
              Sum of max purchase budgets across {metrics.totalLeadsCount} active buyers.
            </p>
          </div>
        ) : null}

        {showMarketCap ? (
          <div className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl">
            <div className="absolute top-0 left-0 h-full w-[3px] bg-gradient-to-b from-[#10B981] to-transparent" />
            <span className="block text-[10px] font-bold tracking-wider text-[#64748B] uppercase">
              Projected commission (3%)
            </span>
            <div className="mt-1 text-2xl font-black tracking-tight text-[#10B981]">
              {formatCurrency(metrics.projectedCommission)}
            </div>
            <p className="mt-1.5 text-[11px] leading-normal text-[#475569]">
              Illustrative gross commission at a 3% listing-side baseline.
            </p>
          </div>
        ) : null}

        {showFinancing ? (
          <div className="space-y-4 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl">
            <div>
              <h3 className="text-xs font-black tracking-wide text-white uppercase">
                Financing mix
              </h3>
              <p className="mt-0.5 text-[10px] text-[#475569]">
                Loan types across your active buyers.
              </p>
            </div>
            <div className="space-y-3 pt-1">
              {metrics.financingRows.map((row) => (
                <DistributionBar key={row.label} row={row} suffix="buyers" />
              ))}
            </div>
          </div>
        ) : null}

        {showRoadblocks ? (
          <div className="space-y-4 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl">
            <div>
              <h3 className="text-xs font-black tracking-wide text-white uppercase">
                Transaction roadblocks
              </h3>
              <p className="mt-0.5 text-[10px] text-[#475569]">
                Pre-approval gaps and sale contingencies slowing closings.
              </p>
            </div>
            <div className="space-y-3 pt-1">
              {metrics.roadblockRows.map((row) => (
                <DistributionBar key={row.label} row={row} suffix="stalled" />
              ))}
            </div>
          </div>
        ) : null}

        {showLeadMagnets ? (
          <div className="space-y-5 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] pb-3">
              <div>
                <h3 className="text-xs font-black tracking-wide text-white uppercase">
                  Neighborhood market report
                </h3>
                <p className="mt-0.5 text-[10px] text-[#475569]">
                  Generate a shareable snapshot link for warm buyers by ZIP.
                </p>
              </div>
              <span className="rounded-md border border-[#6366F1]/30 bg-[#6366F1]/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#818CF8] uppercase">
                External search
              </span>
            </div>

            <div className="flex flex-col items-end gap-3 sm:flex-row">
              <div className="w-full space-y-1 sm:w-1/3">
                <label className="block text-[9px] font-bold text-[#94A3B8] uppercase">
                  Target ZIP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={selectedZipCode}
                  onChange={(e) => onZipCodeChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  className="w-full rounded-xl border border-[#1E293B] bg-[#070B16] p-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={onGenerateReport}
                className="w-full rounded-xl bg-purple-600 py-3.5 text-xs font-bold tracking-wider text-white uppercase shadow-md transition-all hover:bg-purple-500 sm:flex-1"
              >
                Generate report link
              </button>
            </div>

            {generatedReportLink ? (
              <div className="flex flex-col items-start justify-between gap-2 rounded-xl border border-purple-900/40 bg-purple-950/20 p-3.5 text-xs sm:flex-row sm:items-center">
                <a
                  href={generatedReportLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="max-w-full overflow-x-auto text-purple-300 underline-offset-2 hover:underline"
                >
                  {generatedReportLink}
                </a>
                <button
                  type="button"
                  onClick={() => void handleCopyReportLink()}
                  className="rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-1.5 text-[10px] font-bold tracking-wide text-white uppercase whitespace-nowrap hover:bg-[#2D3D5A]"
                >
                  Copy link
                </button>
              </div>
            ) : null}
            {copyFeedback ? (
              <p className="text-[10px] font-medium text-cyan-400">{copyFeedback}</p>
            ) : null}
          </div>
        ) : null}

        {showLeadMagnets ? (
          <div className="space-y-3 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl md:col-span-2">
            <div>
              <h4 className="text-xs font-black tracking-wide text-cyan-400 uppercase">
                High-urgency buyers
              </h4>
              <p className="mt-0.5 text-[10px] text-[#475569]">
                Notes mentioning lease, relocation, or school timing — plus Potential 90+.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1 text-xs sm:grid-cols-2">
              {metrics.urgentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-xl border border-[#1E293B] bg-[#070B16] p-3 transition-all hover:border-[#334155]"
                >
                  <div>
                    <span className="block font-bold text-white">{lead.lead_name}</span>
                    <span className="mt-0.5 block text-[10px] text-[#64748B]">
                      Source: {lead.lead_source}
                    </span>
                  </div>
                  <span className="rounded border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-0.5 text-[9px] font-black tracking-wider text-[#EF4444] uppercase">
                    Priority follow-up
                  </span>
                </div>
              ))}
              {metrics.urgentLeads.length === 0 ? (
                <div className="col-span-2 rounded-xl border border-dashed border-[#1E293B] py-4 text-center text-[11px] font-medium tracking-wider text-[#475569] uppercase">
                  No urgent relocation or lease signals in notes yet.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DistributionBar({
  row,
  suffix,
}: {
  readonly row: DistributionRow;
  readonly suffix: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-bold text-[#94A3B8]">
        <span>{row.label}</span>
        <span className="text-white">
          {row.count} {suffix} ({row.pct}%)
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#161F30]">
        <div
          className={`h-1.5 rounded-full ${row.barClassName}`}
          style={{ width: `${row.pct}%` }}
        />
      </div>
    </div>
  );
}
