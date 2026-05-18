import { parseDealStage, type DealStage } from "@/lib/deal-stage";
import type { LeadStatus } from "@/lib/leads/types";
import type {
  CommandReportFrictionItem,
  CommandReportFunnelStage,
  CommandReportKpi,
  CommandReportMarketSignal,
  CommandReportMatrixItem,
  CommandReportMetrics,
  CommandReportRevenueGroup,
  CommandReportRiskItem,
} from "./command-report-types";

export type LeadPipelineRow = {
  target_budget: number | string | null;
  stage: string | null;
  financing_type: string | null;
};

type LeadMetricsRow = {
  target_budget: number | string | null;
  current_status: string | null;
  financing_type?: string | null;
};

const LEAD_STATUS_TO_DEAL_STAGE: Readonly<Record<LeadStatus, DealStage>> = {
  "New Lead": "INTAKE",
  "Pre-Approved": "PRE_APPROVAL",
  Denied: "INTAKE",
  "No Pre-Approval": "INTAKE",
  Cash: "PRE_APPROVAL",
  "Active Searching": "HOME_SHOPPING",
  "Under Contract": "UNDER_CONTRACT",
  Closed: "CLOSING_ROOM",
};

export function leadStatusToDealStage(status: string | null): DealStage {
  if (status && status in LEAD_STATUS_TO_DEAL_STAGE) {
    return LEAD_STATUS_TO_DEAL_STAGE[status as LeadStatus];
  }
  return "INTAKE";
}

export function leadRowToPipelineMetrics(row: LeadMetricsRow): LeadPipelineRow {
  return {
    target_budget: row.target_budget,
    stage: leadStatusToDealStage(row.current_status),
    financing_type: row.financing_type ?? null,
  };
}

const COMMISSION_RATE = 0.03;
const DONUT_COLORS = ["#00F2FE", "#18E28F", "#FFBD59", "#FF4F7B"] as const;

function numericValue(raw: number | string | null | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number): string {
  if (value <= 0) return "Needs data";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatCompactCurrency(value: number): string {
  if (value <= 0) return "Needs data";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1000)}K`;
  return formatCurrency(value);
}

function sumStageValue(
  leadRows: readonly LeadPipelineRow[],
  stages: readonly DealStage[],
): number {
  const allowed = new Set(stages);
  return leadRows.reduce((sum, row) => {
    const stage = parseDealStage(row.stage) ?? "INTAKE";
    if (!allowed.has(stage)) return sum;
    return sum + numericValue(row.target_budget);
  }, 0);
}

function buildDonutGradient(
  groups: readonly { readonly volume: number }[],
  totalVolume: number,
): string {
  if (totalVolume <= 0) {
    return "conic-gradient(#1E2A44 0deg 360deg)";
  }
  const stops: string[] = [];
  let acc = 0;
  groups.forEach((group, index) => {
    if (group.volume <= 0) return;
    const slice = (group.volume / totalVolume) * 100;
    const color = DONUT_COLORS[index % DONUT_COLORS.length];
    const next = acc + slice;
    stops.push(`${color} ${acc}% ${next}%`);
    acc = next;
  });
  if (stops.length === 0) return "conic-gradient(#1E2A44 0deg 360deg)";
  return `conic-gradient(${stops.join(", ")})`;
}

export function buildCommandReportMetrics(
  leadRows: readonly LeadPipelineRow[],
): CommandReportMetrics {
  const totalCount = leadRows.length;
  const hasData = totalCount > 0;

  const stageCounts: Record<DealStage, number> = {
    INTAKE: 0,
    PRE_APPROVAL: 0,
    HOME_SHOPPING: 0,
    UNDER_CONTRACT: 0,
    CLOSING_ROOM: 0,
  };

  leadRows.forEach((row) => {
    const stage = parseDealStage(row.stage) ?? "INTAKE";
    stageCounts[stage]++;
  });

  const totalValue = leadRows.reduce(
    (acc, row) => acc + numericValue(row.target_budget),
    0,
  );

  const fhaBuyerCount = leadRows.filter((row) => row.financing_type === "fha").length;
  const cashBuyerCount = leadRows.filter((row) => row.financing_type === "cash").length;
  const intakeWithoutFinancing = leadRows.filter(
    (row) =>
      (parseDealStage(row.stage) ?? "INTAKE") === "INTAKE" && row.financing_type == null,
  ).length;
  const projectedCommission = totalValue * COMMISSION_RATE;

  const intakeCount = stageCounts.INTAKE;
  const preApprovalCount = stageCounts.PRE_APPROVAL;
  const homeShoppingCount = stageCounts.HOME_SHOPPING;
  const underContractCount = stageCounts.UNDER_CONTRACT;
  const closingRoomCount = stageCounts.CLOSING_ROOM;
  const readyToWriteCount = underContractCount + closingRoomCount;

  const executiveSnapshot: readonly CommandReportKpi[] = [
    {
      label: "Active Pipeline",
      display: formatCompactCurrency(totalValue),
      tone: "cyan",
      featured: true,
    },
    {
      label: "Projected Commission",
      display: formatCompactCurrency(projectedCommission),
      tone: "green",
    },
    {
      label: "Ready To Write",
      display: hasData ? String(readyToWriteCount) : "Needs data",
      tone: "green",
    },
    {
      label: "Conversion Risk",
      display: hasData ? String(intakeCount) : "Needs data",
      tone: "red",
    },
    {
      label: "Financing Friction",
      display:
        hasData && intakeWithoutFinancing > 0
          ? String(intakeWithoutFinancing)
          : hasData
            ? "0"
            : "Needs data",
      tone: "amber",
    },
    {
      label: "Closing Watch",
      display: hasData ? String(closingRoomCount) : "Needs data",
      tone: "red",
    },
  ];

  const revenueGroups: readonly CommandReportRevenueGroup[] = [
    {
      label: "Ready to Write",
      subtitle: "Highest probability revenue",
      volume: sumStageValue(leadRows, ["UNDER_CONTRACT", "CLOSING_ROOM"]),
      volumeDisplay: formatCompactCurrency(
        sumStageValue(leadRows, ["UNDER_CONTRACT", "CLOSING_ROOM"]),
      ),
      tone: "green",
    },
    {
      label: "Active Search",
      subtitle: "Touring and listing engagement",
      volume: sumStageValue(leadRows, ["HOME_SHOPPING"]),
      volumeDisplay: formatCompactCurrency(sumStageValue(leadRows, ["HOME_SHOPPING"])),
      tone: "cyan",
    },
    {
      label: "Financing Blocked",
      subtitle: "Recoverable commission",
      volume: 0,
      volumeDisplay: "Needs data",
      tone: "amber",
    },
    {
      label: "At Risk",
      subtitle: "Needs immediate attention",
      volume: sumStageValue(leadRows, ["INTAKE"]),
      volumeDisplay: formatCompactCurrency(sumStageValue(leadRows, ["INTAKE"])),
      tone: "red",
    },
  ];

  const funnelCounts = [
    { label: "Prospect", count: intakeCount },
    { label: "Potential Buyer", count: preApprovalCount },
    { label: "Qualified Buyer", count: homeShoppingCount },
    {
      label: "Active Client",
      count: preApprovalCount + homeShoppingCount,
    },
    { label: "Under Contract", count: underContractCount },
    { label: "Closed", count: closingRoomCount },
  ];
  const maxFunnel = Math.max(...funnelCounts.map((s) => s.count), 1);
  const conversionFunnel: readonly CommandReportFunnelStage[] = funnelCounts.map((stage) => ({
    label: stage.label,
    count: stage.count,
    barPct: stage.count > 0 ? Math.max(8, Math.round((stage.count / maxFunnel) * 100)) : 0,
  }));

  const readinessMatrix: readonly CommandReportMatrixItem[] = [
    {
      label: "Potential Buyers",
      count: preApprovalCount,
      display: hasData ? String(preApprovalCount) : "Needs data",
      tone: "cyan",
    },
    {
      label: "Qualified Buyers",
      count: homeShoppingCount,
      display: hasData ? String(homeShoppingCount) : "Needs data",
      tone: "green",
    },
    {
      label: "Active Clients",
      count: underContractCount,
      display: hasData ? String(underContractCount) : "Needs data",
      tone: "green",
    },
    {
      label: "High Intent",
      count: closingRoomCount,
      display: hasData ? String(closingRoomCount) : "Needs data",
      tone: "cyan",
    },
    {
      label: "Stalled Buyers",
      count: 0,
      display: "Needs data",
      tone: "amber",
    },
    {
      label: "Cold Risk",
      count: 0,
      display: "Needs data",
      tone: "red",
    },
  ];

  const financingFriction: readonly CommandReportFrictionItem[] = [
    {
      label: "Need Lender",
      description: "Missing lender connection",
      display: hasData ? String(intakeWithoutFinancing) : "Needs data",
      tone: "amber",
    },
    {
      label: "Missing Pre-Approval",
      description: "Cannot advance to offer",
      display: hasData ? String(stageCounts.PRE_APPROVAL) : "Needs data",
      tone: "red",
    },
    {
      label: "FHA Buyers",
      description: "Strong buyer segment",
      display: hasData ? String(fhaBuyerCount) : "Needs data",
      tone: "cyan",
    },
    {
      label: "Cash Buyers",
      description: "Fastest path to close",
      display: hasData ? String(cashBuyerCount) : "Needs data",
      tone: "green",
    },
    {
      label: "Docs Pending",
      description: "Need upload or verification",
      display: "Needs data",
      tone: "amber",
    },
    {
      label: "Credit Concerns",
      description: "Requires lender strategy",
      display: "Needs data",
      tone: "red",
    },
  ];

  const followUpRisk: readonly CommandReportRiskItem[] = [
    {
      label: "No response in 72 hours",
      description: "High intent buyers may be cooling.",
      display: "Needs data",
      pill: "red",
    },
    {
      label: "New intake without response",
      description: "Speed-to-lead risk detected.",
      display: hasData ? String(intakeCount) : "Needs data",
      pill: "amber",
    },
    {
      label: "High readiness, no activity",
      description: "Buyers ready but not progressing.",
      display: "Needs data",
      pill: "cyan",
    },
    {
      label: "Stalled lender handoff",
      description: "Financing partner action needed.",
      display: "Needs data",
      pill: "amber",
    },
  ];

  const values = leadRows
    .map((row) => numericValue(row.target_budget))
    .filter((value) => value > 0);
  const avgValue =
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  let budgetCluster = "Needs data";
  if (values.length > 0) {
    if (avgValue >= 750_000) budgetCluster = "$750k+";
    else if (avgValue >= 500_000) budgetCluster = "$500k–$749k";
    else if (avgValue >= 350_000) budgetCluster = "$350k–$499k";
    else budgetCluster = "Under $350k";
  }

  const stageDemandRows = [
    { label: "Intake", count: intakeCount },
    { label: "Pre-Approval", count: preApprovalCount },
    { label: "Home Shopping", count: homeShoppingCount },
    { label: "Under Contract", count: underContractCount },
    { label: "Closing Room", count: closingRoomCount },
  ];
  const topDemandStage = [...stageDemandRows].sort((a, b) => b.count - a.count)[0];

  const marketSignals: readonly CommandReportMarketSignal[] = [
    {
      label: "Highest buyer demand",
      value: topDemandStage && topDemandStage.count > 0 ? topDemandStage.label : "Needs data",
      tone: "cyan",
    },
    {
      label: "Strongest budget cluster",
      value: budgetCluster,
      tone: "green",
    },
    {
      label: "Fastest rising segment",
      value:
        homeShoppingCount > preApprovalCount
          ? "Home Shopping"
          : preApprovalCount > 0
            ? "Pre-Approval"
            : "Needs data",
      tone: "amber",
    },
    {
      label: "Luxury buyer acceleration",
      value:
        values.filter((value) => value >= 750_000).length > 0
          ? `${values.filter((value) => value >= 750_000).length} at $750k+`
          : "Needs data",
      tone: "cyan",
    },
  ];

  const biggestRevenue = [...revenueGroups].sort((a, b) => b.volume - a.volume)[0];
  const moneyMove =
    biggestRevenue && biggestRevenue.volume > 0
      ? `Prioritize ${biggestRevenue.label.toLowerCase()} (${biggestRevenue.volumeDisplay}).`
      : "Prioritize pipeline intake and stage advancement.";

  const leakDetected =
    intakeCount > 0
      ? "Financing uncertainty and intake backlog are slowing qualified buyers."
      : "No conversion leak detected yet — build pipeline depth.";

  const urgency =
    intakeCount > 0
      ? `${intakeCount} ${intakeCount === 1 ? "buyer is" : "buyers are"} at conversion risk today.`
      : "Pipeline stable — advance top-value stages.";

  const focus =
    intakeCount > 0
      ? "Route lender docs before expanding new intake."
      : readyToWriteCount > 0
        ? "Protect ready-to-write offers and closing timeline."
        : "Pipeline stage advancement.";

  const briefingNarrative = [
    `Your biggest revenue segment is ${biggestRevenue?.label.toLowerCase() ?? "active search"}.`,
    "Your biggest conversion leak is financing uncertainty.",
    "The immediate operational focus should be lender routing, same-day follow-up for high-intent buyers, and recovery outreach for buyers silent over 72 hours.",
  ].join(" ");

  const copySummary = [
    `Assist U2 Win Analytics Summary: Active Pipeline ${formatCompactCurrency(totalValue)}, Projected Commission ${formatCompactCurrency(projectedCommission)}, ${readyToWriteCount} Ready-To-Write Buyers, ${intakeCount} Conversion Risks, Financing Friction Needs data, and ${closingRoomCount} Closing Watch ${closingRoomCount === 1 ? "item" : "items"}.`,
    "",
    moneyMove,
    leakDetected,
    urgency,
    focus,
  ].join("\n");

  return {
    totalCount,
    totalValue,
    projectedCommission,
    projectedCommissionDisplay: formatCompactCurrency(projectedCommission),
    pipelineDisplay: formatCompactCurrency(totalValue),
    donutGradient: buildDonutGradient(revenueGroups, totalValue),
    executiveSnapshot,
    revenueGroups,
    conversionFunnel,
    readinessMatrix,
    financingFriction,
    followUpRisk,
    marketSignals,
    briefingNarrative,
    briefing: { moneyMove, leakDetected, urgency, focus },
    copySummary,
  };
}
