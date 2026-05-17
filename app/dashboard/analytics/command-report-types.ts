export type CommandReportKpi = {
  readonly label: string;
  readonly display: string;
  readonly tone: "cyan" | "green" | "amber" | "red" | "muted";
  readonly featured?: boolean;
};

export type CommandReportRevenueGroup = {
  readonly label: string;
  readonly subtitle: string;
  readonly volume: number;
  readonly volumeDisplay: string;
  readonly tone: "green" | "cyan" | "amber" | "red" | "muted";
};

export type CommandReportFunnelStage = {
  readonly label: string;
  readonly count: number;
  readonly barPct: number;
};

export type CommandReportMatrixItem = {
  readonly label: string;
  readonly count: number;
  readonly display: string;
  readonly tone: "cyan" | "green" | "amber" | "red" | "muted";
};

export type CommandReportFrictionItem = {
  readonly label: string;
  readonly description: string;
  readonly display: string;
  readonly tone: "cyan" | "green" | "amber" | "red" | "muted";
};

export type CommandReportRiskItem = {
  readonly label: string;
  readonly description: string;
  readonly display: string;
  readonly pill: "red" | "amber" | "cyan" | "green";
};

export type CommandReportMarketSignal = {
  readonly label: string;
  readonly value: string;
  readonly tone: "cyan" | "green" | "amber" | "red" | "muted";
};

export type CommandReportMetrics = {
  readonly totalCount: number;
  readonly totalValue: number;
  readonly projectedCommission: number;
  readonly projectedCommissionDisplay: string;
  readonly pipelineDisplay: string;
  readonly donutGradient: string;
  readonly executiveSnapshot: readonly CommandReportKpi[];
  readonly revenueGroups: readonly CommandReportRevenueGroup[];
  readonly conversionFunnel: readonly CommandReportFunnelStage[];
  readonly readinessMatrix: readonly CommandReportMatrixItem[];
  readonly financingFriction: readonly CommandReportFrictionItem[];
  readonly followUpRisk: readonly CommandReportRiskItem[];
  readonly marketSignals: readonly CommandReportMarketSignal[];
  readonly briefingNarrative: string;
  readonly briefing: {
    readonly moneyMove: string;
    readonly leakDetected: string;
    readonly urgency: string;
    readonly focus: string;
  };
  readonly copySummary: string;
};
