"use client";

import {
  CARD_FEATURED,
  CARD_NORMAL,
  MUTED,
  PANEL,
  SECTION_HEADING,
  TOUCH_TARGET,
} from "@/components/dashboard/AgentCommandShell";
import type { LeadRecord } from "@/lib/leads/types";
import { useMemo, useState, type ReactNode } from "react";

export type LeadAnalysisViewProps = {
  readonly leads: readonly LeadRecord[];
  readonly selectedZipCode: string;
  readonly onZipCodeChange: (zip: string) => void;
  readonly generatedReportLink: string | null;
  readonly onGenerateReport: () => void;
  readonly layout?: "embedded" | "app" | "report";
};

type MetricRow = {
  readonly label: string;
  readonly count: number;
  readonly pct: number;
  readonly barClassName: string;
};

type KpiItem = {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
};

type RevenueGroup = {
  readonly label: string;
  readonly count: number;
  readonly volume: number;
};

type RiskQueueItem = {
  readonly label: string;
  readonly count: number;
  readonly leads: readonly LeadRecord[];
};

type MarketSignal = {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
};

export type LeadAnalysisMetrics = {
  readonly totalLeadsCount: number;
  readonly hasData: boolean;
  readonly executiveSnapshot: readonly KpiItem[];
  readonly revenue: {
    readonly pipelineVolume: number;
    readonly projectedCommission: number;
    readonly weightedCommissionForecast: number;
    readonly byReadinessGroup: readonly RevenueGroup[];
  };
  readonly readinessMatrix: readonly MetricRow[];
  readonly conversionFunnel: readonly MetricRow[];
  readonly financingFriction: readonly MetricRow[];
  readonly followUpRisk: readonly RiskQueueItem[];
  readonly marketSignals: readonly MarketSignal[];
  readonly executiveSummary: string;
  readonly briefingText: string;
};

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

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

function sumBudget(leads: readonly LeadRecord[]): number {
  return leads.reduce((sum, lead) => sum + Number(lead.target_budget ?? 0), 0);
}

function hoursSince(iso: string): number {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return 0;
  return (Date.now() - ts) / MS_HOUR;
}

function isActiveLead(lead: LeadRecord): boolean {
  return lead.current_status !== "Closed";
}

function isReadyToWrite(lead: LeadRecord): boolean {
  return lead.has_verified_pre_approval && lead.market_readiness_score >= 80;
}

function isFinancingBlocked(lead: LeadRecord): boolean {
  return (
    !lead.has_verified_pre_approval ||
    lead.ai_extracted_preferences.hurdle_lender ||
    lead.ai_extracted_preferences.hurdle_down_payment
  );
}

function isConversionRisk(lead: LeadRecord): boolean {
  if (!isActiveLead(lead)) return false;
  return (
    (lead.market_readiness_score >= 70 && !lead.has_verified_pre_approval) ||
    (lead.current_status === "New Lead" && lead.market_readiness_score >= 50)
  );
}

function extractAreaKey(lead: LeadRecord): string {
  const neighborhoods = lead.ai_extracted_preferences.target_neighborhoods;
  for (const n of neighborhoods) {
    const zipMatch = n.match(/\b(\d{5})\b/);
    if (zipMatch?.[1]) return zipMatch[1];
  }
  if (neighborhoods.length > 0) return neighborhoods[0] ?? "Unspecified area";
  return "Needs area data";
}

function docsPending(lead: LeadRecord): boolean {
  const status = lead.ai_extracted_preferences.pre_approval_status?.toLowerCase() ?? "";
  return status.includes("pending") || status.includes("review");
}

function creditConcern(lead: LeadRecord): boolean {
  const summary = `${lead.ai_summary ?? ""} ${lead.raw_transcript ?? ""}`.toLowerCase();
  return summary.includes("credit") || summary.includes("score");
}

function downPaymentConcern(lead: LeadRecord): boolean {
  return lead.ai_extracted_preferences.hurdle_down_payment;
}

function isStalledBuyer(lead: LeadRecord): boolean {
  return (
    isActiveLead(lead) &&
    lead.buyer_engagement_count === 0 &&
    hoursSince(lead.updated_at) >= 168
  );
}

function isColdRiskBuyer(lead: LeadRecord): boolean {
  return (
    isActiveLead(lead) &&
    lead.market_readiness_score < 30 &&
    lead.buyer_engagement_count === 0
  );
}

function readinessBand(score: number): string {
  if (score >= 75) return "highIntent";
  if (score >= 60) return "activeClient";
  if (score >= 45) return "qualified";
  if (score >= 25) return "potential";
  return "prospect";
}

function buildFinancingRows(leads: readonly LeadRecord[], total: number): readonly MetricRow[] {
  const row = (
    label: string,
    count: number,
    barClassName: string,
  ): MetricRow => ({
    label,
    count,
    pct: pctOf(count, total),
    barClassName,
  });

  return [
    row(
      "Needs Lender",
      leads.filter((l) => l.ai_extracted_preferences.hurdle_lender).length,
      "bg-purple-500",
    ),
    row(
      "Missing Pre Approval",
      leads.filter((l) => !l.has_verified_pre_approval).length,
      "bg-rose-500",
    ),
    row(
      "FHA Buyers",
      leads.filter((l) => l.ai_extracted_preferences.loan_type === "FHA").length,
      "bg-amber-500",
    ),
    row(
      "VA Buyers",
      leads.filter((l) => l.ai_extracted_preferences.loan_type === "VA").length,
      "bg-amber-400",
    ),
    row(
      "Cash Buyers",
      leads.filter((l) => l.ai_extracted_preferences.loan_type === "Cash").length,
      "bg-emerald-500",
    ),
    row(
      "Conventional Buyers",
      leads.filter((l) => l.ai_extracted_preferences.loan_type === "Conventional").length,
      "bg-[#00F2FE]",
    ),
    row(
      "Unknown Financing",
      leads.filter((l) => l.ai_extracted_preferences.loan_type === "Unknown").length,
      "bg-slate-500",
    ),
    row("Docs Pending", leads.filter(docsPending).length, "bg-orange-500"),
    row(
      "Down Payment Concern",
      leads.filter(downPaymentConcern).length,
      "bg-orange-400",
    ),
    row("Credit Concern", leads.filter(creditConcern).length, "bg-red-400"),
    row(
      "Home Sale Contingency",
      leads.filter((l) => l.ai_extracted_preferences.hurdle_home_sale).length,
      "bg-rose-400",
    ),
  ];
}

function buildConversionFunnel(leads: readonly LeadRecord[], total: number): readonly MetricRow[] {
  const prospect = leads.filter((l) => l.current_status === "New Lead").length;
  const potential = leads.filter(
    (l) => l.current_status === "Pre-Approved" && l.market_readiness_score < 70,
  ).length;
  const qualified = leads.filter(
    (l) => l.current_status === "Pre-Approved" && l.market_readiness_score >= 70,
  ).length;
  const activeClient = leads.filter((l) => l.current_status === "Active Searching").length;
  const underContract = leads.filter((l) => l.current_status === "Under Contract").length;
  const closed = leads.filter((l) => l.current_status === "Closed").length;

  const stages: { readonly label: string; readonly count: number }[] = [
    { label: "Prospect", count: prospect },
    { label: "Potential Buyer", count: potential },
    { label: "Qualified Buyer", count: qualified },
    { label: "Active Client", count: activeClient },
    { label: "Under Contract", count: underContract },
    { label: "Closed", count: closed },
  ];

  return stages.map((s) => ({
    label: s.label,
    count: s.count,
    pct: pctOf(s.count, total),
    barClassName: "bg-[#00F2FE]",
  }));
}

function buildReadinessMatrix(leads: readonly LeadRecord[], total: number): readonly MetricRow[] {
  const bands: { readonly label: string; readonly filter: (l: LeadRecord) => boolean }[] = [
    {
      label: "Prospects",
      filter: (l) => readinessBand(l.market_readiness_score) === "prospect",
    },
    {
      label: "Potential Buyers",
      filter: (l) => readinessBand(l.market_readiness_score) === "potential",
    },
    {
      label: "Qualified Buyers",
      filter: (l) => readinessBand(l.market_readiness_score) === "qualified",
    },
    {
      label: "Active Clients",
      filter: (l) => readinessBand(l.market_readiness_score) === "activeClient",
    },
    {
      label: "High Intent Buyers",
      filter: (l) => readinessBand(l.market_readiness_score) === "highIntent",
    },
    { label: "Stalled Buyers", filter: isStalledBuyer },
    { label: "Cold Risk Buyers", filter: isColdRiskBuyer },
  ];

  return bands.map((b) => {
    const count = leads.filter(b.filter).length;
    return {
      label: b.label,
      count,
      pct: pctOf(count, total),
      barClassName: "bg-[#00F2FE]",
    };
  });
}

function buildMarketSignals(leads: readonly LeadRecord[]): readonly MarketSignal[] {
  if (leads.length === 0) {
    return [
      { label: "Top ZIP codes", value: "Needs data" },
      { label: "Strongest budget cluster", value: "Needs data" },
      { label: "Buyer demand by area", value: "Needs data" },
      { label: "Market heat indicators", value: "Needs data" },
      { label: "Opportunity neighborhoods", value: "Needs data" },
      { label: "High budget buyer concentration", value: "Needs data" },
    ];
  }

  const areaCounts = new Map<string, number>();
  const areaHeat = new Map<string, number>();
  const budgets: number[] = [];

  for (const lead of leads) {
    const area = extractAreaKey(lead);
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
    areaHeat.set(
      area,
      (areaHeat.get(area) ?? 0) + lead.market_readiness_score,
    );
    if (lead.target_budget != null && lead.target_budget > 0) {
      budgets.push(lead.target_budget);
    }
  }

  const topAreas = [...areaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([area, count]) => `${area} (${count})`)
    .join(", ");

  const avgBudget =
    budgets.length > 0 ? budgets.reduce((a, b) => a + b, 0) / budgets.length : 0;
  const highBudgetThreshold = avgBudget > 0 ? avgBudget * 1.15 : 0;
  const highBudgetCount =
    highBudgetThreshold > 0
      ? leads.filter((l) => (l.target_budget ?? 0) >= highBudgetThreshold).length
      : 0;

  let clusterLabel = "Needs data";
  if (budgets.length > 0) {
    if (avgBudget >= 750_000) clusterLabel = "$750k+ cluster";
    else if (avgBudget >= 500_000) clusterLabel = "$500k–$749k cluster";
    else if (avgBudget >= 350_000) clusterLabel = "$350k–$499k cluster";
    else clusterLabel = "Under $350k cluster";
  }

  const hottestArea = [...areaHeat.entries()].sort((a, b) => b[1] - a[1])[0];
  const opportunityNeighborhoods = [...areaCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([area]) => area)
    .slice(0, 4)
    .join(", ");

  return [
    {
      label: "Top ZIP codes",
      value: topAreas || "Needs data",
      detail: "Areas with the most active buyers",
    },
    {
      label: "Strongest budget cluster",
      value: clusterLabel,
      detail: avgBudget > 0 ? `Avg budget ${formatCurrency(avgBudget)}` : undefined,
    },
    {
      label: "Buyer demand by area",
      value: `${areaCounts.size} tracked areas`,
      detail: topAreas || undefined,
    },
    {
      label: "Market heat indicators",
      value: hottestArea ? `${hottestArea[0]} heat index ${hottestArea[1]}` : "Needs data",
    },
    {
      label: "Opportunity neighborhoods",
      value: opportunityNeighborhoods || "Needs data",
      detail: "2+ buyers in the same area",
    },
    {
      label: "High budget buyer concentration",
      value:
        highBudgetCount > 0
          ? `${highBudgetCount} buyers above cluster avg`
          : "Needs data",
    },
  ];
}

function buildExecutiveSummary(metrics: LeadAnalysisMetrics): string {
  const lines = [
    "EXECUTIVE SUMMARY",
    `Active buyers: ${metrics.totalLeadsCount}`,
    `Active pipeline value: ${formatCurrency(metrics.revenue.pipelineVolume)}`,
    `Projected commission (3%): ${formatCurrency(metrics.revenue.projectedCommission)}`,
    `Weighted commission forecast: ${formatCurrency(metrics.revenue.weightedCommissionForecast)}`,
    "",
    "AI ANALYTICS BRIEFING",
    metrics.briefingText,
  ];
  return lines.join("\n");
}

export function useLeadAnalysisMetrics(leads: readonly LeadRecord[]): LeadAnalysisMetrics {
  return useMemo(() => {
    const totalLeadsCount = leads.length;
    const hasData = totalLeadsCount > 0;
    const divisor = totalLeadsCount > 0 ? totalLeadsCount : 1;
    const activeLeads = leads.filter(isActiveLead);

    const pipelineVolume = sumBudget(activeLeads);
    const projectedCommission = pipelineVolume * 0.03;
    const weightedCommissionForecast = activeLeads.reduce((sum, lead) => {
      const budget = Number(lead.target_budget ?? 0);
      const weight = lead.market_readiness_score / 100;
      return sum + budget * 0.03 * weight;
    }, 0);

    const readyToWriteLeads = activeLeads.filter(isReadyToWrite);
    const financingFrictionLeads = activeLeads.filter(isFinancingBlocked);
    const conversionRiskLeads = activeLeads.filter(isConversionRisk);
    const closingWatchLeads = leads.filter((l) => l.current_status === "Under Contract");

    const executiveSnapshot: readonly KpiItem[] = [
      {
        label: "Active Pipeline Value",
        value: hasData ? formatCurrency(pipelineVolume) : "Needs data",
      },
      {
        label: "Projected Commission",
        value: hasData ? formatCurrency(projectedCommission) : "Needs data",
      },
      {
        label: "Ready to Write",
        value: hasData ? String(readyToWriteLeads.length) : "Needs data",
      },
      {
        label: "Conversion Risk",
        value: hasData ? String(conversionRiskLeads.length) : "Needs data",
      },
      {
        label: "Financing Friction",
        value: hasData ? String(financingFrictionLeads.length) : "Needs data",
      },
      {
        label: "Closing Watch",
        value: hasData ? String(closingWatchLeads.length) : "Needs data",
      },
    ];

    const readyToWriteGroup = activeLeads.filter(isReadyToWrite);
    const activeSearchGroup = activeLeads.filter((l) => l.current_status === "Active Searching");
    const financingBlockedGroup = activeLeads.filter(isFinancingBlocked);
    const atRiskGroup = activeLeads.filter(
      (l) => l.market_readiness_score >= 70 && !l.has_verified_pre_approval,
    );

    const byReadinessGroup: readonly RevenueGroup[] = [
      {
        label: "Ready to Write",
        count: readyToWriteGroup.length,
        volume: sumBudget(readyToWriteGroup),
      },
      {
        label: "Active Search",
        count: activeSearchGroup.length,
        volume: sumBudget(activeSearchGroup),
      },
      {
        label: "Financing Blocked",
        count: financingBlockedGroup.length,
        volume: sumBudget(financingBlockedGroup),
      },
      {
        label: "At Risk",
        count: atRiskGroup.length,
        volume: sumBudget(atRiskGroup),
      },
    ];

    const followUpRisk: readonly RiskQueueItem[] = [
      {
        label: "No response in 24 hours",
        count: activeLeads.filter(
          (l) => l.buyer_engagement_count === 0 && hoursSince(l.updated_at) >= 24,
        ).length,
        leads: activeLeads.filter(
          (l) => l.buyer_engagement_count === 0 && hoursSince(l.updated_at) >= 24,
        ),
      },
      {
        label: "No response in 72 hours",
        count: activeLeads.filter(
          (l) => l.buyer_engagement_count === 0 && hoursSince(l.updated_at) >= 72,
        ).length,
        leads: activeLeads.filter(
          (l) => l.buyer_engagement_count === 0 && hoursSince(l.updated_at) >= 72,
        ),
      },
      {
        label: "High readiness but no activity",
        count: activeLeads.filter(
          (l) => l.market_readiness_score >= 80 && l.buyer_engagement_count === 0,
        ).length,
        leads: activeLeads.filter(
          (l) => l.market_readiness_score >= 80 && l.buyer_engagement_count === 0,
        ),
      },
      {
        label: "New intake with no agent response",
        count: activeLeads.filter(
          (l) =>
            l.current_status === "New Lead" &&
            l.buyer_engagement_count === 0 &&
            hoursSince(l.created_at) <= 48,
        ).length,
        leads: activeLeads.filter(
          (l) =>
            l.current_status === "New Lead" &&
            l.buyer_engagement_count === 0 &&
            hoursSince(l.created_at) <= 48,
        ),
      },
      {
        label: "Stalled lender handoff",
        count: activeLeads.filter(
          (l) => l.ai_extracted_preferences.hurdle_lender && !l.has_verified_pre_approval,
        ).length,
        leads: activeLeads.filter(
          (l) => l.ai_extracted_preferences.hurdle_lender && !l.has_verified_pre_approval,
        ),
      },
      {
        label: "Missing pre approval blocking progress",
        count: activeLeads.filter((l) => !l.has_verified_pre_approval).length,
        leads: activeLeads.filter((l) => !l.has_verified_pre_approval),
      },
      {
        label: "Home sale contingency slowing buyer",
        count: activeLeads.filter((l) => l.ai_extracted_preferences.hurdle_home_sale).length,
        leads: activeLeads.filter((l) => l.ai_extracted_preferences.hurdle_home_sale),
      },
    ];

    const biggestRevenueGroup = [...byReadinessGroup].sort((a, b) => b.volume - a.volume)[0];
    const biggestLeak = [...followUpRisk].sort((a, b) => b.count - a.count)[0];
    const topUrgent = [...activeLeads]
      .sort((a, b) => b.market_readiness_score - a.market_readiness_score)
      .find((l) => !l.has_verified_pre_approval || l.ai_extracted_preferences.hurdle_lender);

    const briefingText = [
      `Biggest revenue opportunity: ${
        biggestRevenueGroup && biggestRevenueGroup.volume > 0
          ? `${biggestRevenueGroup.label} (${formatCurrency(biggestRevenueGroup.volume)})`
          : "Needs data"
      }`,
      `Biggest conversion leak: ${
        biggestLeak && biggestLeak.count > 0
          ? `${biggestLeak.label} (${biggestLeak.count} buyers)`
          : "Needs data"
      }`,
      `Highest urgency action: ${
        topUrgent
          ? `${topUrgent.lead_name} — ${topUrgent.ai_next_best_action ?? "Clear financing friction"}`
          : "Needs data"
      }`,
      `Recommended operational focus: ${
        financingFrictionLeads.length > conversionRiskLeads.length
          ? "Financing friction clearance"
          : conversionRiskLeads.length > 0
            ? "Conversion risk follow-up"
            : readyToWriteLeads.length > 0
              ? "Ready-to-write offer strategy"
              : "Pipeline intake quality"
      }`,
      `Financing friction summary: ${financingFrictionLeads.length} buyers blocked on lender or pre-approval.`,
      `Follow-up risk summary: ${followUpRisk.reduce((s, r) => s + r.count, 0)} flagged touchpoints across active buyers.`,
    ].join("\n");

    const metricsBase: LeadAnalysisMetrics = {
      totalLeadsCount,
      hasData,
      executiveSnapshot,
      revenue: {
        pipelineVolume,
        projectedCommission,
        weightedCommissionForecast,
        byReadinessGroup,
      },
      readinessMatrix: buildReadinessMatrix(leads, divisor),
      conversionFunnel: buildConversionFunnel(leads, divisor),
      financingFriction: buildFinancingRows(leads, divisor),
      followUpRisk,
      marketSignals: buildMarketSignals(leads),
      executiveSummary: "",
      briefingText,
    };

    return {
      ...metricsBase,
      executiveSummary: buildExecutiveSummary(metricsBase),
    };
  }, [leads]);
}

const WORKSPACE_PANEL =
  "min-w-0 overflow-visible rounded-2xl border border-[#1E2A44] bg-[#111827]/90 p-4 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.85)] sm:p-5";

const WORKSPACE_ROW = "grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4";

const DONUT_COLORS = ["#00F2FE", "#10B981", "#F59E0B", "#EF4444"] as const;

function ThickMetricBar({ row, suffix }: { readonly row: MetricRow; readonly suffix: string }) {
  const barWidth = Math.max(row.pct, row.count > 0 ? 6 : 0);
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-xs font-semibold text-[#F8FAFC] sm:text-sm">
          {row.label}
        </span>
        <span className={`shrink-0 text-xs font-bold tabular-nums sm:text-sm ${MUTED}`}>
          {row.count} {suffix}
          <span className="ml-1.5 text-[#00F2FE]">({row.pct}%)</span>
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-[#0B1020] sm:h-4">
        <div
          className={`h-3 rounded-full sm:h-4 ${row.barClassName}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  children,
  className = "",
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <section className={`${PANEL} min-w-0 overflow-visible ${className}`}>
      <h2 className={SECTION_HEADING}>{title}</h2>
      <div className="mt-2.5 min-w-0">{children}</div>
    </section>
  );
}

function NeedsData({ message = "Needs data" }: { readonly message?: string }) {
  return (
    <p
      className={`rounded-xl border border-dashed border-[#1E2A44] bg-[#0B1020]/60 px-3 py-4 text-center text-xs ${MUTED}`}
    >
      {message}
    </p>
  );
}

function WorkspacePanel({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className={WORKSPACE_PANEL}>
      <h2 className={SECTION_HEADING}>{title}</h2>
      <div className="mt-3 min-w-0">{children}</div>
    </section>
  );
}

function stripBriefingPrefix(line: string, prefix: string): string {
  return line.startsWith(prefix) ? line.slice(prefix.length).trim() : line.trim();
}

function parseBriefingCards(briefingText: string): {
  readonly moneyMove: string;
  readonly leakDetected: string;
  readonly urgency: string;
  readonly focus: string;
  readonly summaries: readonly string[];
} {
  const lines = briefingText.split("\n").filter((line) => line.trim().length > 0);
  return {
    moneyMove: stripBriefingPrefix(
      lines[0] ?? "Needs data",
      "Biggest revenue opportunity:",
    ),
    leakDetected: stripBriefingPrefix(lines[1] ?? "Needs data", "Biggest conversion leak:"),
    urgency: stripBriefingPrefix(lines[2] ?? "Needs data", "Highest urgency action:"),
    focus: stripBriefingPrefix(
      lines[3] ?? "Needs data",
      "Recommended operational focus:",
    ),
    summaries: lines.slice(4),
  };
}

function RevenueDonutRing({
  groups,
  totalVolume,
}: {
  readonly groups: readonly RevenueGroup[];
  readonly totalVolume: number;
}) {
  const gradientStops: string[] = [];
  if (totalVolume > 0) {
    let accPct = 0;
    groups.forEach((group, index) => {
      const slicePct = (group.volume / totalVolume) * 100;
      if (slicePct <= 0) return;
      const color = DONUT_COLORS[index % DONUT_COLORS.length];
      const next = accPct + slicePct;
      gradientStops.push(`${color} ${accPct}% ${next}%`);
      accPct = next;
    });
  }

  const ringBackground =
    gradientStops.length > 0
      ? `conic-gradient(${gradientStops.join(", ")})`
      : "conic-gradient(#1E2A44 0deg 360deg)";

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
      <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
        <div
          className="h-full w-full rounded-full shadow-[0_0_28px_-6px_rgba(0,242,254,0.55)]"
          style={{ background: ringBackground }}
        />
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full border border-[#1E2A44] bg-[#080C1A] text-center">
          <p className={`text-[9px] font-semibold uppercase tracking-wider ${MUTED}`}>
            Pipeline
          </p>
          <p className="mt-0.5 text-sm font-bold text-[#00F2FE] sm:text-base">
            {formatCurrency(totalVolume)}
          </p>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {groups.map((group, index) => (
          <li key={group.label} className="flex min-w-0 items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
            />
            <span className="truncate font-semibold text-[#F8FAFC]">{group.label}</span>
            <span className={`ml-auto shrink-0 tabular-nums ${MUTED}`}>
              {formatCurrency(group.volume)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type WorkspaceProps = {
  readonly metrics: LeadAnalysisMetrics;
};

export function LeadAnalysisWorkspace({ metrics }: WorkspaceProps) {
  const { revenue, briefingText, hasData } = metrics;
  const briefing = parseBriefingCards(briefingText);

  return (
    <div className="min-w-0 space-y-4 print:space-y-4">
      <section className="min-w-0 overflow-visible">
        <h2 className={`mb-3 ${SECTION_HEADING}`}>Executive Snapshot</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {metrics.executiveSnapshot.map((kpi) => (
            <div
              key={kpi.label}
              className={`${CARD_FEATURED} min-w-0 px-3 py-4 sm:px-4 sm:py-5`}
            >
              <p className={`truncate text-[10px] font-bold tracking-[0.14em] uppercase ${MUTED}`}>
                {kpi.label}
              </p>
              <p className="mt-2 truncate text-xl font-bold text-[#F8FAFC] sm:text-2xl">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className={WORKSPACE_ROW}>
        <WorkspacePanel title="Revenue Intelligence">
          <div className="space-y-4">
            <RevenueDonutRing
              groups={revenue.byReadinessGroup}
              totalVolume={revenue.pipelineVolume}
            />
            <div className={`${CARD_FEATURED} grid grid-cols-1 gap-4 p-4 sm:grid-cols-3`}>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${MUTED}`}>
                  Pipeline volume
                </p>
                <p className="mt-1 text-xl font-bold text-[#F8FAFC] sm:text-2xl">
                  {hasData ? formatCurrency(revenue.pipelineVolume) : "Needs data"}
                </p>
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${MUTED}`}>
                  Projected commission
                </p>
                <p className="mt-1 text-xl font-bold text-[#10B981] sm:text-2xl">
                  {hasData ? formatCurrency(revenue.projectedCommission) : "Needs data"}
                </p>
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${MUTED}`}>
                  Weighted forecast
                </p>
                <p className="mt-1 text-xl font-bold text-[#00F2FE] sm:text-2xl">
                  {hasData ? formatCurrency(revenue.weightedCommissionForecast) : "Needs data"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${MUTED}`}>
                Revenue forecast by readiness group
              </p>
              {revenue.byReadinessGroup.map((group) => (
                <div
                  key={group.label}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#1E2A44] bg-[#0B1020]/80 px-4 py-3"
                >
                  <span className="truncate text-sm font-semibold text-[#F8FAFC]">
                    {group.label}
                  </span>
                  <span className={`shrink-0 text-xs font-bold tabular-nums ${MUTED}`}>
                    {group.count} buyers ·{" "}
                    <span className="text-[#00F2FE]">{formatCurrency(group.volume)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Conversion Funnel">
          <div className="space-y-3">
            {metrics.conversionFunnel.map((row) => (
              <ThickMetricBar key={row.label} row={row} suffix="buyers" />
            ))}
          </div>
        </WorkspacePanel>
      </div>

      <div className={WORKSPACE_ROW}>
        <WorkspacePanel title="Buyer Readiness Matrix">
          <div className="space-y-3">
            {metrics.readinessMatrix.map((row) => (
              <ThickMetricBar key={row.label} row={row} suffix="buyers" />
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Financing Friction Map">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {metrics.financingFriction.map((row) => (
              <ThickMetricBar key={row.label} row={row} suffix="buyers" />
            ))}
          </div>
        </WorkspacePanel>
      </div>

      <section className={`${WORKSPACE_PANEL} shadow-[0_0_40px_-12px_rgba(0,242,254,0.35)]`}>
        <h2 className={SECTION_HEADING}>AI Analytics Briefing</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`${CARD_FEATURED} min-w-0 p-4`}>
            <p className="text-[10px] font-bold tracking-[0.16em] text-[#00F2FE] uppercase">
              Money Move
            </p>
            <p className="mt-2 text-sm leading-relaxed font-semibold text-[#F8FAFC] sm:text-base">
              {briefing.moneyMove}
            </p>
          </div>
          <div className={`${CARD_FEATURED} min-w-0 p-4`}>
            <p className="text-[10px] font-bold tracking-[0.16em] text-[#EF4444] uppercase">
              Leak Detected
            </p>
            <p className="mt-2 text-sm leading-relaxed font-semibold text-[#F8FAFC] sm:text-base">
              {briefing.leakDetected}
            </p>
          </div>
          <div className={`${CARD_FEATURED} min-w-0 p-4`}>
            <p className="text-[10px] font-bold tracking-[0.16em] text-[#F59E0B] uppercase">
              Urgency
            </p>
            <p className="mt-2 text-sm leading-relaxed font-semibold text-[#F8FAFC] sm:text-base">
              {briefing.urgency}
            </p>
          </div>
          <div className={`${CARD_FEATURED} min-w-0 p-4`}>
            <p className="text-[10px] font-bold tracking-[0.16em] text-[#10B981] uppercase">
              Focus
            </p>
            <p className="mt-2 text-sm leading-relaxed font-semibold text-[#F8FAFC] sm:text-base">
              {briefing.focus}
            </p>
          </div>
        </div>
        {briefing.summaries.length > 0 ? (
          <div className="mt-3 space-y-1.5 border-t border-[#1E2A44] pt-3">
            {briefing.summaries.map((line) => (
              <p key={line} className={`text-xs leading-relaxed ${MUTED}`}>
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <div className={WORKSPACE_ROW}>
        <WorkspacePanel title="Follow-Up Risk Queue">
          <div className="space-y-2.5">
            {metrics.followUpRisk.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[#1E2A44] bg-[#0B1020]/80 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#F8FAFC]">{item.label}</span>
                  <span className="shrink-0 rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/15 px-2.5 py-1 text-xs font-bold text-[#EF4444]">
                    {item.count}
                  </span>
                </div>
                {item.leads.length > 0 ? (
                  <ul className={`mt-2 space-y-1 text-xs ${MUTED}`}>
                    {item.leads.slice(0, 3).map((lead) => (
                      <li key={lead.id} className="truncate">
                        {lead.lead_name}
                        <span className="text-[#64748B]">
                          {" "}
                          · Readiness {lead.market_readiness_score}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`mt-2 text-xs ${MUTED}`}>No buyers in this queue.</p>
                )}
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Market Opportunity Signals">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {metrics.marketSignals.map((signal) => (
              <div
                key={signal.label}
                className="min-w-0 rounded-xl border border-[#1E2A44] bg-[#0B1020]/80 px-4 py-3"
              >
                <p className={`text-[10px] font-bold uppercase tracking-wider ${MUTED}`}>
                  {signal.label}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[#F8FAFC] sm:text-base">
                  {signal.value}
                </p>
                {signal.detail ? (
                  <p className={`mt-1 text-xs ${MUTED}`}>{signal.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(leads: readonly LeadRecord[], metrics: LeadAnalysisMetrics): string {
  const header = [
    "lead_name",
    "lead_source",
    "current_status",
    "target_budget",
    "buyer_readiness",
    "has_verified_pre_approval",
    "loan_type",
  ];
  const rows = leads.map((lead) =>
    [
      lead.lead_name,
      lead.lead_source,
      lead.current_status,
      String(lead.target_budget ?? ""),
      String(lead.market_readiness_score),
      lead.has_verified_pre_approval ? "yes" : "no",
      lead.ai_extracted_preferences.loan_type,
    ]
      .map(escapeCsvCell)
      .join(","),
  );
  const summary = [
    "",
    "# Executive Snapshot",
    ...metrics.executiveSnapshot.map((k) => `${k.label},${escapeCsvCell(k.value)}`),
    "",
    "# AI Briefing",
    ...metrics.briefingText.split("\n").map((line) => `briefing,${escapeCsvCell(line)}`),
  ];
  return [header.join(","), ...rows, ...summary].join("\n");
}

type ReportAssistantProps = {
  readonly metrics: LeadAnalysisMetrics;
  readonly leads: readonly LeadRecord[];
  readonly selectedZipCode: string;
  readonly onZipCodeChange: (zip: string) => void;
  readonly generatedReportLink: string | null;
  readonly onGenerateReport: () => void;
  readonly compact?: boolean;
};

export function LeadAnalysisReportAssistant({
  metrics,
  leads,
  selectedZipCode,
  onZipCodeChange,
  generatedReportLink,
  onGenerateReport,
  compact = false,
}: ReportAssistantProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleCopyExecutiveSummary = async () => {
    try {
      await navigator.clipboard.writeText(metrics.executiveSummary);
      setCopyFeedback("Executive summary copied.");
    } catch {
      setCopyFeedback("Copy failed — select text manually.");
    }
  };

  const handleDownloadCsv = () => {
    if (!metrics.hasData) {
      setActionFeedback("Needs data — no buyers to export.");
      return;
    }
    const blob = new Blob([buildCsv(leads, metrics)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `assist-u2-win-analytics-${selectedZipCode || "export"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setActionFeedback("CSV downloaded.");
  };

  const handleDownloadPdf = () => {
    setActionFeedback("PDF: use Print Report and save as PDF.");
    window.print();
  };

  const handlePrint = () => {
    window.print();
    setActionFeedback("Opening print dialog.");
  };

  const actionButtonClass = compact
    ? `w-full rounded-xl border border-[#1E2A44] bg-[#0B1020] px-3 py-3 text-xs font-semibold text-[#F8FAFC] transition hover:border-[#00F2FE]/40 ${TOUCH_TARGET}`
    : `w-full rounded-xl border border-[#1E2A44] bg-[#0B1020] px-3 py-2.5 text-xs font-semibold text-[#F8FAFC] transition hover:border-[#00F2FE]/40`;

  return (
    <aside
      className={`${CARD_NORMAL} flex min-h-0 min-w-0 flex-col overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] print:hidden`}
    >
      <div className="shrink-0 border-b border-[#1E2A44] px-4 py-3 sm:px-4">
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#00F2FE]/90 uppercase">
          AI report assistant
        </p>
        <h2 className="mt-0.5 text-sm font-semibold text-[#F8FAFC]">Analytics briefing</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-4 py-3 sm:px-4">
        <SectionBlock title="AI Analytics Briefing">
          {!metrics.hasData ? (
            <NeedsData message="Needs data — briefing generates when buyers are loaded." />
          ) : (
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#1E2A44] bg-[#0B1020]/80 p-2.5 text-[11px] leading-relaxed text-[#F8FAFC]">
              {metrics.briefingText}
            </pre>
          )}
        </SectionBlock>

        <div className="space-y-2">
          <p className={SECTION_HEADING}>Report actions</p>
          <div className={compact ? "flex flex-col gap-2" : "grid grid-cols-1 gap-2"}>
            <button type="button" onClick={handlePrint} className={actionButtonClass}>
              Print Report
            </button>
            <button type="button" onClick={handleDownloadPdf} className={actionButtonClass}>
              Download PDF
            </button>
            <button type="button" onClick={handleDownloadCsv} className={actionButtonClass}>
              Download CSV
            </button>
            <button
              type="button"
              onClick={() => void handleCopyExecutiveSummary()}
              className={actionButtonClass}
            >
              Copy Executive Summary
            </button>
          </div>
        </div>

        <div className="space-y-2 border-t border-[#1E2A44] pt-3">
          <p className={SECTION_HEADING}>Market report link</p>
          <label className={`block text-[10px] font-semibold uppercase tracking-wider ${MUTED}`}>
            Target ZIP
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={selectedZipCode}
            onChange={(e) => onZipCodeChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
            className="w-full min-w-0 rounded-xl border border-[#1E2A44] bg-[#0B1020] px-3 py-2.5 text-sm text-[#F8FAFC] focus:border-[#00F2FE] focus:outline-none"
          />
          <button
            type="button"
            onClick={onGenerateReport}
            className={`w-full rounded-xl bg-[#00F2FE] py-2.5 text-xs font-bold tracking-wide text-[#080C1A] uppercase transition hover:bg-white ${TOUCH_TARGET}`}
          >
            Generate report link
          </button>
          {generatedReportLink ? (
            <a
              href={generatedReportLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all text-[11px] text-[#00F2FE] underline-offset-2 hover:underline"
            >
              {generatedReportLink}
            </a>
          ) : null}
        </div>

        {copyFeedback ? <p className="text-xs text-[#00F2FE]">{copyFeedback}</p> : null}
        {actionFeedback ? <p className={`text-xs ${MUTED}`}>{actionFeedback}</p> : null}
      </div>
    </aside>
  );
}

export function LeadAnalysisView({
  leads,
  selectedZipCode,
  onZipCodeChange,
  generatedReportLink,
  onGenerateReport,
  layout = "embedded",
}: LeadAnalysisViewProps) {
  const metrics = useLeadAnalysisMetrics(leads);

  const workspaceProps = { metrics };
  const reportProps = {
    metrics,
    leads,
    selectedZipCode,
    onZipCodeChange,
    generatedReportLink,
    onGenerateReport,
  };

  if (layout === "app") {
    return <LeadAnalysisWorkspace {...workspaceProps} />;
  }

  if (layout === "report") {
    return <LeadAnalysisReportAssistant {...reportProps} />;
  }

  return (
    <div className="min-w-0 space-y-3 p-3 sm:p-4">
      <LeadAnalysisWorkspace {...workspaceProps} />
      <LeadAnalysisReportAssistant {...reportProps} compact />
    </div>
  );
}
