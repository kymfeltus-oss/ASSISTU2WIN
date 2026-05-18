"use client";

import { LeadsProvider, useLeads } from "@/components/leads/LeadsProvider";
import { BRAND_LOGO_ALT, BRAND_LOGO_SRC } from "@/lib/branding";
import {
  buildAiActions,
  formatLeadBudget,
  getFollowUpLeads,
  getHotBuyers,
  getLeadAreaLabel,
  getTotalPipelineVolume,
  isHotBuyer,
  type LeadInsightAction,
} from "@/lib/leads/lead-insights";
import { getPotentialHudTier } from "@/lib/leads/potential-index";
import type { LeadRecord, LeadStatus } from "@/lib/leads/types";
import Image from "next/image";
import Link from "next/link";
import { ActivityFeed, type Activity } from "@/components/dashboard/ActivityFeed";
import { DashboardUtilityBar } from "@/components/dashboard/DashboardUtilityBar";
import { PipelineStatusTracker } from "@/components/dashboard/PipelineStatusTracker";
import {
  UrgentMilestones,
  type Milestone,
} from "@/components/dashboard/UrgentMilestones";
import { MUTED, SECTION_HEADING } from "@/components/dashboard/AgentCommandShell";
import { DollarSign, Home, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from "react";

const AMBIENT_OVERLAY_STYLE = {
  background:
    "radial-gradient(circle at 20% 10%, rgba(0, 242, 254, 0.12) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(167, 139, 250, 0.1) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.04) 0%, transparent 60%)",
} as const;

const PREMIUM_CARD_SHADOW =
  "0 4px 16px rgba(0, 0, 0, 0.25), 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)";

const SECTION_LABEL_CLASS =
  "text-[10px] font-semibold tracking-[0.08em] text-[color:var(--text-muted)] uppercase";

const SECTION_TITLE_CLASS = "text-lg font-bold text-[color:var(--text-primary)]";

/** Visual-only sample data for dashboard panels (does not alter lead queries). */
const URGENT_MILESTONES_SAMPLE: readonly Milestone[] = [
  {
    id: "1",
    title: "Option Period Ends Today",
    property: "123 Oak Street",
    dueTime: "Due in 3 hours",
    urgency: "critical",
  },
  {
    id: "2",
    title: "Financing Approval Due",
    property: "456 Maple Avenue",
    dueTime: "Due in 2 days",
    urgency: "warning",
  },
  {
    id: "3",
    title: "Closing Day",
    property: "789 Pine Drive",
    dueTime: "May 24, 2026",
    urgency: "normal",
  },
] as const;

const ACTIVITY_FEED_SAMPLE: readonly Activity[] = [
  {
    id: "1",
    type: "feedback",
    title: "Showing Feedback Received",
    property: "123 Main St",
    description: "Client loved the kitchen, price seems high",
    timestamp: "15 min ago",
  },
  {
    id: "2",
    type: "offer",
    title: "New Offer Submitted",
    property: "3BR Condo - Downtown",
    description: "$465K Offer Price",
    timestamp: "1 hour ago",
  },
] as const;

const ADD_LEAD_BUTTON_CLASS =
  "inline-flex min-h-[var(--touch-target-min)] shrink-0 items-center justify-center rounded-[var(--radius-button)] px-4 text-[13px] font-bold tracking-[0.04em] text-white uppercase transition duration-300 ease-in-out hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98]";

const ADD_LEAD_BUTTON_STYLE = {
  background: "var(--gradient-cyan)",
  boxShadow:
    "0 4px 16px rgba(0, 0, 0, 0.25), 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 242, 254, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
} as const;

/* Leads OS — primary dashboard home (/dashboard) */

type QuickStat = {
  readonly label: string;
  readonly value: string;
  readonly subtext?: string;
};
type QuickAction = {
  readonly label: string;
  readonly href: string;
  readonly icon: "intake" | "score" | "follow" | "lender";
};
type CommandInsights = {
  readonly nextAction: string | null;
  readonly conversionWarning: string | null;
  readonly recommendedFollowUp: string | null;
};
type PipelineStage = {
  readonly label: string;
  readonly count: number;
  readonly volume: string;
};

const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: "Intake", href: "/dashboard/leads/intake", icon: "intake" },
  { label: "Score", href: "/dashboard/leads/analytics", icon: "score" },
  { label: "Follow Up", href: "/dashboard/leads/pipeline", icon: "follow" },
  { label: "Lender", href: "/dashboard/lender", icon: "lender" },
] as const;

const CARD_NORMAL =
  "bg-[#111827]/80 border border-[#1E2A44] rounded-2xl shadow-[0_20px_60px_-35px_rgba(0,0,0,0.85)]";

const CARD_FEATURED =
  "bg-[rgba(22,28,49,0.75)] backdrop-blur-xl border-t-2 border-b border-r border-l-0 border-[#00F2FE] rounded-2xl shadow-[0_-10px_30px_-18px_rgba(0,242,254,0.75),_10px_0_30px_-20px_rgba(0,242,254,0.45),_0_20px_60px_-35px_rgba(0,0,0,0.85)] transition-all duration-300";

const SECTION_GRID =
  "grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-5";
const TOUCH_TARGET =
  "min-h-11 min-w-11 touch-manipulation";

const DASHBOARD_HEADER_ACTION_LINK_BASE =
  "inline-flex shrink-0 min-h-11 items-center justify-center rounded-xl border px-3 text-[11px] font-semibold tracking-wide whitespace-nowrap transition touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00F2FE] sm:px-4 sm:text-xs";

function dashboardHeaderActionLinkClass(isActive: boolean): string {
  if (isActive) {
    return `${DASHBOARD_HEADER_ACTION_LINK_BASE} border-[#00F2FE] bg-[rgba(0,242,254,0.22)] text-[#B8FDFF] shadow-[0_0_16px_rgba(0,242,254,0.2)]`;
  }
  return `${DASHBOARD_HEADER_ACTION_LINK_BASE} border-[#00F2FE]/40 bg-[rgba(0,242,254,0.08)] text-[#00F2FE] hover:border-[#00F2FE]/70 hover:bg-[rgba(0,242,254,0.14)] hover:text-[#B8FDFF] active:scale-[0.98] active:border-[#00F2FE] active:bg-[rgba(0,242,254,0.2)]`;
}

function getLeadInitials(name: string): string {
  const parts = name
    .split(/[\s&]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function formatPipelineVolume(total: number): string {
  if (total <= 0) return "-";
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(total / 1000)}k`;
}

function formatCommissionEstimate(total: number): string {
  if (total <= 0) return "-";
  const estimate = total * 0.025;
  if (estimate >= 1_000_000) return `$${(estimate / 1_000_000).toFixed(1)}M`;
  if (estimate >= 1000) return `$${Math.round(estimate / 1000)}k`;
  return `$${Math.round(estimate)}`;
}

function computeAveragePbi(leads: readonly LeadRecord[]): number {
  if (leads.length === 0) return 0;
  const sum = leads.reduce((acc, lead) => acc + lead.market_readiness_score, 0);
  return Math.round(sum / leads.length);
}

function getActiveLeads(leads: readonly LeadRecord[]): readonly LeadRecord[] {
  return leads.filter((lead) => lead.current_status !== "Closed");
}

function getPriorityLeads(leads: readonly LeadRecord[]): readonly LeadRecord[] {
  return [...leads]
    .sort((a, b) => b.market_readiness_score - a.market_readiness_score)
    .slice(0, 3);
}

function getClosingWatchLeads(leads: readonly LeadRecord[]): readonly LeadRecord[] {
  return leads
    .filter((lead) => lead.current_status === "Under Contract")
    .slice(0, 4);
}

function getActiveSearchLeads(leads: readonly LeadRecord[]): readonly LeadRecord[] {
  return leads
    .filter((lead) => lead.current_status === "Active Searching")
    .slice(0, 4);
}

function getReadyToWriteLeads(leads: readonly LeadRecord[]): readonly LeadRecord[] {
  return leads
    .filter(
      (lead) =>
        lead.has_verified_pre_approval && lead.market_readiness_score >= 80,
    )
    .slice(0, 3);
}

function getFinancingFrictionLeads(leads: readonly LeadRecord[]): readonly LeadRecord[] {
  return leads
    .filter(
      (lead) =>
        !lead.has_verified_pre_approval ||
        lead.ai_extracted_preferences.hurdle_lender,
    )
    .slice(0, 3);
}

function buildLeadTags(lead: LeadRecord): readonly string[] {
  const tags: string[] = [];
  if (lead.has_verified_pre_approval) tags.push("Pre-approved");
  if (isHotBuyer(lead)) tags.push("Hot");
  if (lead.ai_extracted_preferences.hurdle_lender) tags.push("Needs lender");
  if (lead.is_first_time_buyer) tags.push("First-time buyer");
  if (tags.length === 0) tags.push(lead.current_status);
  return tags.slice(0, 3);
}

function buildCommandInsights(leads: readonly LeadRecord[]): CommandInsights {
  const actions = buildAiActions(leads);
  const followUps = getFollowUpLeads(leads);
  const stalled = followUps.find((lead) => !lead.has_verified_pre_approval);

  const nextAction =
    actions[0] !== undefined
      ? `${actions[0].leadName}: ${actions[0].label}`
      : null;

  const conversionWarning = stalled
    ? `${stalled.lead_name} still needs verified pre-approval — follow up before showings slip.`
    : null;

  const second = actions[1];
  const recommendedFollowUp = second
    ? `${second.leadName}: ${second.label}`
    : leads[0]?.ai_summary ?? null;

  return { nextAction, conversionWarning, recommendedFollowUp };
}

function hasAnyInsight(insights: CommandInsights): boolean {
  return Boolean(
    insights.nextAction ?? insights.conversionWarning ?? insights.recommendedFollowUp,
  );
}

function bucketStatus(status: LeadStatus): "new" | "active" | "closed" {
  if (
    status === "New Lead" ||
    status === "No Pre-Approval" ||
    status === "Denied"
  ) {
    return "new";
  }
  if (status === "Closed") return "closed";
  return "active";
}

function buildPipelineSnapshot(leads: readonly LeadRecord[]): readonly PipelineStage[] {
  const totals = {
    new: { count: 0, value: 0 },
    active: { count: 0, value: 0 },
    closed: { count: 0, value: 0 },
  };

  for (const lead of leads) {
    const bucket = bucketStatus(lead.current_status);
    const budget = lead.target_budget ?? 0;
    totals[bucket].count += 1;
    totals[bucket].value += budget;
  }

  return [
    {
      label: "New leads",
      count: totals.new.count,
      volume: formatPipelineVolume(totals.new.value),
    },
    {
      label: "In progress",
      count: totals.active.count,
      volume: formatPipelineVolume(totals.active.value),
    },
    {
      label: "Closed",
      count: totals.closed.count,
      volume: formatPipelineVolume(totals.closed.value),
    },
  ] as const;
}

function ScoreRing({
  score,
  size = 96,
  label = "Buyer Readiness",
  className = "",
}: {
  readonly score: number;
  readonly size?: number;
  readonly label?: string;
  readonly className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={score === 0}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#00F2FE"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="drop-shadow-[0_0_8px_rgba(0,242,254,0.35)]"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{clamped}</span>
        <span className="text-[8px] font-bold tracking-[0.18em] text-[#00F2FE]/80 uppercase">
          {label}
        </span>
      </div>
    </div>
  );
}

function IconGlyph({
  kind,
  className = "h-5 w-5",
}: {
  readonly kind: QuickAction["icon"] | "ai" | "close";
  readonly className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    intake: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    ),
    score: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    ),
    follow: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    ),
    lender: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-6.75 4.5h6.75m-6.75 4.5h6.75m-6.75 4.5h6.75"
      />
    ),
    home: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    ),
    buyers: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    ),
    pipeline: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    ),
    analytics: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    ),
    ai: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    ),
    close: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    ),
  };

  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      {paths[kind]}
    </svg>
  );
}

function EmptyStatePanel({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  readonly title: string;
  readonly body: string;
  readonly actionHref?: string;
  readonly actionLabel?: string;
}) {
  return (
    <div className={`${CARD_NORMAL} min-w-0 p-6 text-center`}>
      <p className="text-base font-semibold text-white">{title}</p>
      <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>{body}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-[#00F2FE]/40 bg-[rgba(0,242,254,0.08)] px-4 text-xs font-semibold tracking-wide text-[#00F2FE] uppercase transition active:scale-[0.98]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

type KpiAccent = "cyan" | "green" | "amber";

function DashboardKpiCard({
  label,
  value,
  subtext,
  icon: Icon,
  accent,
}: {
  readonly label: string;
  readonly value: string;
  readonly subtext?: string;
  readonly icon: LucideIcon;
  readonly accent: KpiAccent;
}) {
  const accentStyles: Record<KpiAccent, { border: string; iconBg: string; iconColor: string }> =
    {
      cyan: {
        border: "rgba(0, 242, 254, 0.35)",
        iconBg: "rgba(0, 242, 254, 0.12)",
        iconColor: "var(--cyan)",
      },
      green: {
        border: "rgba(24, 226, 143, 0.35)",
        iconBg: "rgba(24, 226, 143, 0.12)",
        iconColor: "var(--semantic-success)",
      },
      amber: {
        border: "rgba(251, 191, 36, 0.35)",
        iconBg: "rgba(251, 191, 36, 0.12)",
        iconColor: "var(--gold)",
      },
    };
  const tone = accentStyles[accent];

  return (
    <div
      className={`${CARD_NORMAL} min-w-0 p-4 transition duration-300 ease-in-out hover:-translate-y-1 hover:scale-[1.02]`}
      style={{
        boxShadow: PREMIUM_CARD_SHADOW,
        borderColor: tone.border,
        minWidth: "220px",
        flex: "1 1 220px",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={SECTION_LABEL_CLASS}>{label}</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-[color:var(--text-primary)]">
            {value}
          </p>
          {subtext ? (
            <p className="mt-1 text-xs font-medium text-[color:var(--text-muted)]">{subtext}</p>
          ) : null}
        </div>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
          style={{ background: tone.iconBg, borderColor: tone.border, color: tone.iconColor }}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function CommissionChartPanel({
  pipelineVolume,
  loading,
}: {
  readonly pipelineVolume: number;
  readonly loading: boolean;
}) {
  const projected = formatCommissionEstimate(pipelineVolume);
  const bars = [
    { label: "Wk 1", pct: 42 },
    { label: "Wk 2", pct: 58 },
    { label: "Wk 3", pct: 71 },
    { label: "Wk 4", pct: hasPositiveVolume(pipelineVolume) ? 88 : 24 },
  ];

  return (
    <section
      className={`${CARD_NORMAL} min-w-0 overflow-hidden p-4 sm:p-5`}
      style={{ boxShadow: PREMIUM_CARD_SHADOW }}
    >
      <p className={SECTION_LABEL_CLASS}>Commission</p>
      <h2 className={`mt-1 ${SECTION_TITLE_CLASS}`}>Projected earnings</h2>
      {loading ? (
        <p className={`mt-4 text-sm ${MUTED}`}>Loading commission outlook…</p>
      ) : (
        <>
          <p className="mt-3 text-3xl font-extrabold text-[color:var(--cyan)]">{projected}</p>
          <p className={`mt-1 text-xs ${MUTED}`}>Based on active buyer pipeline volume</p>
          <div className="mt-5 flex h-28 items-end gap-2 sm:gap-3" aria-hidden>
            {bars.map((bar) => (
              <div key={bar.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${bar.pct}%`,
                    background: "linear-gradient(180deg, var(--cyan) 0%, rgba(14, 165, 233, 0.35) 100%)",
                    boxShadow: "0 0 12px rgba(0, 242, 254, 0.25)",
                  }}
                />
                <span className="text-[9px] font-semibold text-[color:var(--text-muted)] uppercase">
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function hasPositiveVolume(total: number): boolean {
  return total > 0;
}

function HotProspectsHeader({ addLeadHref }: { readonly addLeadHref: string }) {
  return (
    <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0">
        <p className={`${SECTION_LABEL_CLASS} mb-1`}>Recent Leads</p>
        <h2 className={SECTION_TITLE_CLASS}>Hot Prospects</h2>
      </div>
      <Link href={addLeadHref} className={ADD_LEAD_BUTTON_CLASS} style={ADD_LEAD_BUTTON_STYLE}>
        + Add Lead
      </Link>
    </div>
  );
}

function LiveStatusBadge() {
  return (
    <div
      className="flex shrink-0 items-center gap-2 rounded-[var(--radius-button)] border px-3 py-1.5"
      style={{
        backgroundColor: "rgba(0, 242, 254, 0.12)",
        borderColor: "rgba(0, 242, 254, 0.35)",
        boxShadow:
          "0 4px 12px rgba(0, 242, 254, 0.2), inset 0 1px 0 rgba(0, 242, 254, 0.1)",
      }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{
          background: "radial-gradient(circle, var(--cyan) 0%, rgba(0, 242, 254, 0.8) 100%)",
          boxShadow: "0 0 12px var(--cyan), 0 0 24px rgba(0, 242, 254, 0.5)",
        }}
        aria-hidden
      />
      <span className="text-xs font-extrabold tracking-[0.06em] text-[color:var(--cyan)] uppercase">
        Live
      </span>
    </div>
  );
}

function PriorityLeadCard({
  lead,
  featured = false,
}: {
  readonly lead: LeadRecord;
  readonly featured?: boolean;
}) {
  const tier = getPotentialHudTier(lead.market_readiness_score);
  const progress = Math.min(100, Math.max(0, lead.market_readiness_score));
  const tags = buildLeadTags(lead);
  const loanType = lead.ai_extracted_preferences.loan_type;

  return (
    <article
      className={`${CARD_NORMAL} relative min-w-0 overflow-hidden p-4 transition duration-300 ease-in-out hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.99] sm:p-5 ${
        featured ? "border-[color:var(--cyan)]/50 ring-1 ring-[color:var(--cyan)]/25" : ""
      }`}
      style={{ boxShadow: PREMIUM_CARD_SHADOW }}
    >
      <div className="relative flex gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#1E2A44] bg-[#0B1020] text-sm font-bold text-[#00F2FE]"
          aria-hidden
        >
          {getLeadInitials(lead.lead_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">{lead.lead_name}</h3>
            <span
              className={`max-w-full truncate rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${tier.className}`}
            >
              {tier.label}
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <div>
              <dt className={`text-[9px] font-semibold tracking-wider uppercase ${MUTED}`}>
                Max budget
              </dt>
              <dd className="font-semibold text-slate-200">
                {formatLeadBudget(lead.target_budget)}
              </dd>
            </div>
            <div>
              <dt className={`text-[9px] font-semibold tracking-wider uppercase ${MUTED}`}>
                Loan type
              </dt>
              <dd className="text-slate-300">{loanType}</dd>
            </div>
            <div className="col-span-2">
              <dt className={`text-[9px] font-semibold tracking-wider uppercase ${MUTED}`}>
                Timeline
              </dt>
              <dd className="text-slate-300">{lead.purchase_timeline}</dd>
            </div>
          </dl>
          <div className="mt-3">
            <div className={`mb-1 flex justify-between text-[9px] font-semibold tracking-wider uppercase ${MUTED}`}>
              <span>Buyer Readiness</span>
              <span className="text-[#00F2FE]/90">{progress}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[#0B1020]">
              <div
                className="h-full rounded-full bg-[#00F2FE] shadow-[0_0_6px_rgba(0,242,254,0.35)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#1E2A44] bg-[#0B1020] px-2 py-0.5 text-[9px] font-semibold text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function AiInsightsContent({
  insights,
  loading,
  includeFollowUp = false,
}: {
  readonly insights: CommandInsights;
  readonly loading: boolean;
  readonly includeFollowUp?: boolean;
}) {
  if (loading) {
    return <p className={`text-sm leading-relaxed ${MUTED}`}>Loading AI recommendations…</p>;
  }

  if (!hasAnyInsight(insights)) {
    return (
      <EmptyStatePanel
        title="AI Priority Feed empty"
        body="Lead intelligence will appear here once buyers enter the pipeline and activity is captured."
        actionHref="/dashboard/leads/intake"
        actionLabel="Add buyers"
      />
    );
  }

  return (
    <div className="space-y-3">
      {insights.nextAction ? (
        <div className={`${CARD_NORMAL} min-w-0 p-4`}>
          <p className="mb-1.5 flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[#00F2FE] uppercase">
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#00F2FE] shadow-[0_0_6px_rgba(0,242,254,0.5)]" />
            Next best action
          </p>
          <p className="text-sm leading-relaxed break-words text-slate-200">{insights.nextAction}</p>
        </div>
      ) : null}
      {insights.conversionWarning ? (
        <div className={`${CARD_NORMAL} min-w-0 border-amber-900/50 p-4`}>
          <p className="mb-1.5 text-[10px] font-bold tracking-[0.16em] text-amber-300/90 uppercase">
            Conversion Risk
          </p>
          <p className="text-sm leading-relaxed break-words text-amber-100/80">
            {insights.conversionWarning}
          </p>
        </div>
      ) : null}
      {includeFollowUp && insights.recommendedFollowUp ? (
        <div className={`${CARD_NORMAL} min-w-0 p-4`}>
          <p className={`mb-1.5 text-[10px] font-bold tracking-[0.16em] uppercase ${MUTED}`}>
            Recommended follow-up
          </p>
          <p className="text-sm leading-relaxed break-words text-slate-300">
            {insights.recommendedFollowUp}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function AiRecommendationsSection({
  insights,
  loading,
  onOpenDrawer,
  showOpenButton = true,
}: {
  readonly insights: CommandInsights;
  readonly loading: boolean;
  readonly onOpenDrawer?: () => void;
  readonly showOpenButton?: boolean;
}) {
  return (
    <div className="min-w-0">
      <AiInsightsContent insights={insights} loading={loading} />
      {showOpenButton && onOpenDrawer ? (
        <button
          type="button"
          onClick={onOpenDrawer}
          className={`mt-3 w-full rounded-xl border border-[#00F2FE]/30 bg-[rgba(0,242,254,0.06)] py-3 text-xs font-semibold tracking-wide text-[#00F2FE] uppercase transition active:scale-[0.98] ${TOUCH_TARGET}`}
        >
          Open AI assistant
        </button>
      ) : null}
    </div>
  );
}

function AiAssistantPanel({
  insights,
  loading,
  titleId,
}: {
  readonly insights: CommandInsights;
  readonly loading: boolean;
  readonly titleId: string;
}) {
  return (
    <aside
      className={`${CARD_NORMAL} flex min-h-0 min-w-0 flex-col overflow-hidden lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)]`}
      aria-labelledby={titleId}
    >
      <div className="shrink-0 border-b border-[#1E2A44] px-4 py-4 sm:px-5">
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#00F2FE]/90 uppercase">
          AI assistant
        </p>
        <h2 id={titleId} className="mt-1 text-lg font-semibold text-[#F8FAFC]">
          Priority feed
        </h2>
        <p className={`mt-1 text-xs leading-relaxed ${MUTED}`}>
          Next moves and conversion risks for your active buyers.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5">
        <AiInsightsContent insights={insights} loading={loading} includeFollowUp />
      </div>
    </aside>
  );
}

function AiDrawer({
  open,
  onClose,
  titleId,
  insights,
  loading,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly titleId: string;
  readonly insights: CommandInsights;
  readonly loading: boolean;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close AI assistant"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg rounded-t-2xl border border-[#1E2A44] border-b-0 bg-[#111827]/95 px-5 pt-3 pb-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#1E2A44]" aria-hidden />
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#00F2FE]/90 uppercase">
              AI assistant
            </p>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              Your next moves
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1E2A44] bg-[#0B1020] text-slate-300"
            aria-label="Close drawer"
          >
            <IconGlyph kind="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[min(52vh,420px)] overflow-x-hidden overflow-y-auto pr-1">
          <AiInsightsContent insights={insights} loading={loading} includeFollowUp />
        </div>
      </div>
    </>
  );
}

function SectionTitle({
  title,
  actionHref,
  actionLabel,
  addLeadHref,
}: {
  readonly title: string;
  readonly actionHref?: string;
  readonly actionLabel?: string;
  readonly addLeadHref?: string;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h2 className={SECTION_HEADING}>{title}</h2>
      {addLeadHref ? (
        <Link href={addLeadHref} className={ADD_LEAD_BUTTON_CLASS} style={ADD_LEAD_BUTTON_STYLE}>
          + Add Lead
        </Link>
      ) : null}
      {!addLeadHref && actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="shrink-0 py-1 text-[10px] font-semibold text-[#00F2FE] sm:text-xs"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function PendingTasksPanel({
  actions,
  loading,
}: {
  readonly actions: readonly LeadInsightAction[];
  readonly loading: boolean;
}) {
  const mediumTasks = actions.filter((action) => action.priority !== "high");

  if (loading) {
    return <p className={`text-sm ${MUTED}`}>Loading pending items…</p>;
  }
  if (mediumTasks.length === 0) {
    return <p className={`text-sm ${MUTED}`}>No medium-priority tasks in queue.</p>;
  }

  return (
    <ul className="space-y-3">
      {mediumTasks.map((action) => (
        <li
          key={action.id}
          className={`${CARD_NORMAL} rounded-xl border border-[color:var(--line)] p-3 transition duration-300 ease-in-out hover:translate-x-1`}
          style={{ boxShadow: PREMIUM_CARD_SHADOW }}
        >
          <p className="text-xs font-semibold text-[color:var(--text-primary)]">{action.label}</p>
          <p className={`mt-1 text-[11px] ${MUTED}`}>{action.leadName}</p>
        </li>
      ))}
    </ul>
  );
}

function CompactLeadRow({ lead }: { readonly lead: LeadRecord }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#1E2A44] bg-[#0B1020]/60 px-3 py-2.5">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1E2A44] bg-[#050713] text-xs font-bold text-[#00F2FE]"
        aria-hidden
      >
        {getLeadInitials(lead.lead_name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#F8FAFC]">{lead.lead_name}</p>
        <p className={`truncate text-[10px] ${MUTED}`}>{lead.current_status}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-semibold text-[#F8FAFC]">
          {formatLeadBudget(lead.target_budget)}
        </p>
        <p className="text-[10px] text-[#00F2FE]/80">{lead.market_readiness_score}%</p>
      </div>
    </div>
  );
}

function TodaysExecutionPanel({
  actions,
  loading,
}: {
  readonly actions: readonly LeadInsightAction[];
  readonly loading: boolean;
}) {
  if (loading) {
    return <p className={`text-sm ${MUTED}`}>Loading today&apos;s execution list…</p>;
  }
  if (actions.length === 0) {
    return (
      <EmptyStatePanel
        title="Execution list clear"
        body="Next-step actions appear here when buyers need follow-through on your pipeline."
        actionHref="/dashboard/leads/pipeline"
        actionLabel="Open pipeline"
      />
    );
  }
  return (
    <ul className="space-y-2">
      {actions.map((action) => (
        <li
          key={action.id}
          className={`${CARD_NORMAL} flex gap-3 p-3`}
        >
          <span
            className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
              action.priority === "high"
                ? "bg-[#00F2FE] shadow-[0_0_6px_rgba(0,242,254,0.45)]"
                : "bg-[#94A3B8]"
            }`}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#F8FAFC]">{action.leadName}</p>
            <p className={`mt-0.5 text-sm leading-relaxed ${MUTED}`}>{action.label}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ClosingWatchPanel({
  leads,
  loading,
}: {
  readonly leads: readonly LeadRecord[];
  readonly loading: boolean;
}) {
  if (loading) {
    return <p className={`text-sm ${MUTED}`}>Loading closing watch…</p>;
  }
  if (leads.length === 0) {
    return (
      <EmptyStatePanel
        title="Closing Watch quiet"
        body="Under-contract buyers will surface here for milestone tracking."
        actionHref="/dashboard/leads/pipeline"
        actionLabel="View pipeline"
      />
    );
  }
  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <CompactLeadRow key={lead.id} lead={lead} />
      ))}
    </div>
  );
}

function ActiveSearchPanel({
  leads,
  loading,
}: {
  readonly leads: readonly LeadRecord[];
  readonly loading: boolean;
}) {
  if (loading) {
    return <p className={`text-sm ${MUTED}`}>Loading active search…</p>;
  }
  if (leads.length === 0) {
    return (
      <EmptyStatePanel
        title="No Active Search buyers"
        body="Buyers actively touring will appear here once their status moves to Active Search."
      />
    );
  }
  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <CompactLeadRow key={lead.id} lead={lead} />
      ))}
    </div>
  );
}

function MarketOpportunityPanel({
  leads,
  loading,
}: {
  readonly leads: readonly LeadRecord[];
  readonly loading: boolean;
}) {
  if (loading) {
    return <p className={`text-sm ${MUTED}`}>Loading market signals…</p>;
  }
  if (leads.length === 0) {
    return (
      <EmptyStatePanel
        title="No market signals yet"
        body="High-readiness buyers and target areas will populate as your pipeline grows."
        actionHref="/dashboard/leads/intake"
        actionLabel="Add buyers"
      />
    );
  }
  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className={`${CARD_NORMAL} flex items-center justify-between gap-3 p-3`}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#F8FAFC]">
              {getLeadAreaLabel(lead)}
            </p>
            <p className={`mt-0.5 truncate text-xs ${MUTED}`}>{lead.lead_name}</p>
          </div>
          <span className="shrink-0 rounded-md border border-[#00F2FE]/30 bg-[rgba(0,242,254,0.08)] px-2 py-0.5 text-[10px] font-bold text-[#00F2FE]">
            {lead.market_readiness_score}%
          </span>
        </div>
      ))}
    </div>
  );
}

function FinancingFrictionPanel({
  leads,
  loading,
}: {
  readonly leads: readonly LeadRecord[];
  readonly loading: boolean;
}) {
  if (loading) {
    return <p className={`text-sm ${MUTED}`}>Loading financing friction…</p>;
  }
  if (leads.length === 0) {
    return (
      <p className={`rounded-xl border border-[#1E2A44] bg-[#0B1020]/50 px-3 py-2.5 text-xs ${MUTED}`}>
        No financing friction flagged on active buyers.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2.5"
        >
          <p className="text-xs font-semibold text-amber-100/90">{lead.lead_name}</p>
          <p className="mt-0.5 text-[11px] text-amber-200/70">
            {!lead.has_verified_pre_approval
              ? "Pre-approval still needed"
              : "Lender coordination flagged"}
          </p>
        </div>
      ))}
    </div>
  );
}

function ReadyToWritePanel({
  leads,
  loading,
}: {
  readonly leads: readonly LeadRecord[];
  readonly loading: boolean;
}) {
  if (loading) {
    return <p className={`text-sm ${MUTED}`}>Loading ready-to-write buyers…</p>;
  }
  if (leads.length === 0) {
    return (
      <p className={`rounded-xl border border-[#1E2A44] bg-[#0B1020]/50 px-3 py-2.5 text-xs ${MUTED}`}>
        No buyers marked Ready to Write yet.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <CompactLeadRow key={lead.id} lead={lead} />
      ))}
    </div>
  );
}

function DashboardLeadsOsScreen() {
  const drawerTitleId = useId();
  const [aiOpen, setAiOpen] = useState(false);
  const { leads, loading, statusMessage } = useLeads();

  const closeAi = useCallback(() => setAiOpen(false), []);
  const openAi = useCallback(() => setAiOpen(true), []);

  const activeLeads = useMemo(() => getActiveLeads(leads), [leads]);
  const attentionCount = useMemo(() => getFollowUpLeads(leads).length, [leads]);
  const avgPbi = useMemo(() => computeAveragePbi(activeLeads), [activeLeads]);
  const pipelineVolume = useMemo(() => getTotalPipelineVolume(activeLeads), [activeLeads]);
  const priorityLeads = useMemo(() => getPriorityLeads(activeLeads), [activeLeads]);
  const pipelineSnapshot = useMemo(() => buildPipelineSnapshot(leads), [leads]);
  const insights = useMemo(() => buildCommandInsights(leads), [leads]);
  const hasLeads = activeLeads.length > 0;

  const executionActions = useMemo(() => buildAiActions(leads), [leads]);
  const closingWatchLeads = useMemo(() => getClosingWatchLeads(activeLeads), [activeLeads]);
  const activeSearchLeads = useMemo(() => getActiveSearchLeads(activeLeads), [activeLeads]);
  const marketSignalLeads = useMemo(() => getHotBuyers(activeLeads), [activeLeads]);
  const financingFrictionLeads = useMemo(
    () => getFinancingFrictionLeads(activeLeads),
    [activeLeads],
  );
  const readyToWriteLeads = useMemo(() => getReadyToWriteLeads(activeLeads), [activeLeads]);

  const quickStats = useMemo((): readonly QuickStat[] => {
    const potentialCount = getHotBuyers(activeLeads).length;
    return [
      { label: "Buyer Readiness", value: hasLeads ? String(avgPbi) : "-" },
      { label: "Pipeline", value: formatPipelineVolume(pipelineVolume) },
      { label: "Potential Buyers", value: hasLeads ? String(potentialCount) : "-" },
      { label: "Commission", value: formatCommissionEstimate(pipelineVolume) },
    ];
  }, [activeLeads, avgPbi, hasLeads, pipelineVolume]);

  useEffect(() => {
    if (!aiOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAi();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [aiOpen, closeAi]);

  const welcomeLine = loading
    ? "Loading your pipeline…"
    : hasLeads
      ? attentionCount > 0
        ? `${attentionCount} ${attentionCount === 1 ? "buyer needs" : "buyers need"} your attention today.`
        : "Your pipeline is on track — here's what's happening today."
      : "Add buyers to activate your command board.";

  return (
    <>
      <div
        className="relative min-h-dvh w-full min-w-0 overflow-x-hidden"
        style={{ fontFamily: "var(--font-geist-sans), Inter, system-ui, sans-serif" }}
      >
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={AMBIENT_OVERLAY_STYLE}
          aria-hidden
        />
      <div className="relative z-10 flex w-full min-w-0 flex-wrap items-start gap-4 md:gap-6">
        <main className="min-w-0 flex-1" style={{ minWidth: "320px" }}>
            <div className="flex w-full min-w-0 flex-col">
          <DashboardUtilityBar />
          <div className="mt-4 flex min-w-0 flex-col gap-4 md:gap-6">
          <header className="flex min-w-0 flex-col gap-3 pt-1">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#1E2A44] lg:hidden">
                <Image
                  src={BRAND_LOGO_SRC}
                  alt={BRAND_LOGO_ALT}
                  fill
                  className="object-cover"
                  sizes="40px"
                  unoptimized
                />
              </div>
              <h1
                className="flex min-w-0 flex-wrap items-baseline gap-3"
                style={{ fontSize: "clamp(32px, 5vw, 42px)", lineHeight: 1.1 }}
              >
                <span className="dashboard-title-script text-[clamp(42px,6vw,56px)] tracking-[0.02em]">
                  Realtor
                </span>
                <span className="dashboard-title-bold text-[clamp(32px,5vw,42px)] tracking-[-0.03em]">
                  Dashboard
                </span>
              </h1>
              <LiveStatusBadge />
              <ScoreRing
                score={hasLeads ? avgPbi : 0}
                size={56}
                label="Buyer Readiness"
                className="ml-auto hidden shrink-0 md:flex"
              />
              <form action="/api/auth/signout" method="POST" className="lg:hidden">
                <button
                  type="submit"
                  className={`rounded-lg border border-[#1E2A44] bg-[#0B1020] px-2.5 py-1.5 text-[10px] font-semibold text-[#94A3B8] transition hover:text-[#F8FAFC] ${TOUCH_TARGET}`}
                >
                  Sign out
                </button>
              </form>
            </div>
            <p className="text-[15px] font-medium text-[color:var(--text-muted)]">
              Welcome back! {welcomeLine}
            </p>
          </header>

        {statusMessage ? (
          <p
            className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90"
            role="status"
          >
            {statusMessage}
          </p>
        ) : null}

            <section className="min-w-0">
              <p className={`${SECTION_LABEL_CLASS} mb-3`}>Key Metrics</p>
              <div className="flex min-w-0 flex-wrap gap-3 md:gap-4">
                <DashboardKpiCard
                  label={quickStats[0]?.label ?? "Buyer Readiness"}
                  value={quickStats[0]?.value ?? "-"}
                  icon={Users}
                  accent="green"
                />
                <DashboardKpiCard
                  label={quickStats[1]?.label ?? "Pipeline"}
                  value={quickStats[1]?.value ?? "-"}
                  icon={Home}
                  accent="cyan"
                />
                <DashboardKpiCard
                  label={quickStats[2]?.label ?? "Potential Buyers"}
                  value={quickStats[2]?.value ?? "-"}
                  icon={Users}
                  accent="green"
                />
                <DashboardKpiCard
                  label="Pending Pipeline"
                  value="$42K"
                  subtext="5 in Escrow"
                  icon={TrendingUp}
                  accent="amber"
                />
              </div>
            </section>

            <PipelineStatusTracker />

            <div className="flex w-full min-w-0 flex-wrap gap-4 md:gap-6">
              <div className="min-w-0 flex-1 space-y-5 lg:space-y-6" style={{ minWidth: "320px" }}>
              <section className="min-w-0">
                <HotProspectsHeader addLeadHref="/dashboard/leads/new" />
                {loading ? (
                  <p className={`text-sm ${MUTED}`}>Loading priority buyers…</p>
                ) : priorityLeads.length > 0 ? (
                  <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
                    {priorityLeads.map((lead, index) => (
                      <PriorityLeadCard key={lead.id} lead={lead} featured={index === 0} />
                    ))}
                  </div>
                ) : (
                  <EmptyStatePanel
                    title="Priority list empty"
                    body="Your highest-readiness buyers will rank here automatically."
                    actionHref="/dashboard/leads/intake"
                    actionLabel="Add buyers"
                  />
                )}
              </section>

              <ActivityFeed activities={ACTIVITY_FEED_SAMPLE} />

            <CommissionChartPanel pipelineVolume={pipelineVolume} loading={loading} />

            <div className={SECTION_GRID}>
              <section className="min-w-0">
                <SectionTitle title="Today's Execution List" />
                <TodaysExecutionPanel actions={executionActions} loading={loading} />
              </section>

              <section className="min-w-0">
                <SectionTitle
                  title="Closing Watch"
                  actionHref="/dashboard/leads/pipeline"
                  actionLabel="View pipeline"
                />
                <ClosingWatchPanel leads={closingWatchLeads} loading={loading} />
              </section>

              <section className="min-w-0 lg:hidden">
                <SectionTitle title="AI Priority Feed" />
                <AiRecommendationsSection
                  insights={insights}
                  loading={loading}
                  onOpenDrawer={openAi}
                />
              </section>

              <section className="min-w-0">
                <SectionTitle title="Active Search" />
                <ActiveSearchPanel leads={activeSearchLeads} loading={loading} />
              </section>

              <section className="min-w-0">
                <SectionTitle title="Market Opportunity Signals" />
                <MarketOpportunityPanel leads={marketSignalLeads} loading={loading} />
              </section>

              <section className="min-w-0">
                <SectionTitle title="Financing Friction" />
                <FinancingFrictionPanel leads={financingFrictionLeads} loading={loading} />
              </section>

              <section className="min-w-0">
                <SectionTitle title="Ready to Write" />
                <ReadyToWritePanel leads={readyToWriteLeads} loading={loading} />
              </section>
              <section className="min-w-0 md:col-span-2">
                <SectionTitle
                  title="Pipeline snapshot"
                  actionHref="/dashboard/leads/pipeline"
                  actionLabel="View pipeline"
                />
                {loading ? (
                  <p className={`text-sm ${MUTED}`}>Loading pipeline…</p>
                ) : leads.length === 0 ? (
                  <EmptyStatePanel
                    title="Pipeline empty"
                    body="Connect intake or add buyers to activate command insights."
                    actionHref="/dashboard/leads/intake"
                    actionLabel="Add buyers"
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-3 sm:gap-3">
                    {pipelineSnapshot.map((stage) => (
                      <div key={stage.label} className={`${CARD_NORMAL} p-3 text-center`}>
                        <p className={`text-[9px] font-semibold tracking-wider uppercase ${MUTED}`}>
                          {stage.label}
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#F8FAFC]">{stage.count}</p>
                        <p className={`mt-0.5 text-[10px] ${MUTED}`}>{stage.volume}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="min-w-0 pb-2 md:col-span-2 lg:hidden">
                <SectionTitle title="Quick launch" />
                <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-4 sm:gap-3">
                  {QUICK_ACTIONS.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className={`${CARD_NORMAL} flex min-h-[5.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 text-center transition active:scale-95 sm:min-h-24`}
                    >
                      <span className={`flex items-center justify-center rounded-xl border border-[#1E2A44] bg-[#0B1020] text-[#00F2FE] ${TOUCH_TARGET}`}>
                        <IconGlyph kind={action.icon} className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] font-semibold text-[#F8FAFC] sm:text-xs">
                        {action.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
              </div>

              <div className="w-full min-w-0 space-y-4 md:space-y-6 lg:w-[320px]">
                <div>
                  <p className={`${SECTION_LABEL_CLASS} mb-1`}>Critical Deadlines</p>
                  <h2 className={`${SECTION_TITLE_CLASS} mb-3`}>Urgent Milestones</h2>
                  <UrgentMilestones milestones={URGENT_MILESTONES_SAMPLE} />
                </div>
                <div>
                  <p className={`${SECTION_LABEL_CLASS} mb-1`}>Tasks &amp; Appointments</p>
                  <h2 className={`${SECTION_TITLE_CLASS} mb-3`}>Pending Items</h2>
                  <PendingTasksPanel actions={executionActions} loading={loading} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>

    <button
      type="button"
      onClick={openAi}
      aria-expanded={aiOpen}
      aria-controls={drawerTitleId}
      className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center justify-center rounded-full border border-[#00F2FE]/50 bg-[#00F2FE] text-[#080C1A] shadow-[0_0_20px_rgba(0,242,254,0.4)] transition active:scale-95 lg:hidden ${TOUCH_TARGET}`}
      aria-label="Open AI assistant"
    >
      <IconGlyph kind="ai" className="h-6 w-6" />
    </button>

    <AiDrawer
      open={aiOpen}
      onClose={closeAi}
      titleId={drawerTitleId}
      insights={insights}
      loading={loading}
    />
  </>
  );
}

export default function DashboardPage() {
  return (
    <LeadsProvider>
      <DashboardLeadsOsScreen />
    </LeadsProvider>
  );
}

