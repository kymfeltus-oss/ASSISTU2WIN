"use client";

import { cn } from "@/lib/utils";
import type { LeadRecord } from "@/lib/leads/types";
import {
  AlertTriangle,
  Copy,
  DollarSign,
  Link2,
  Phone,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Row shape for the analysis workspace (ecosystem + legacy Supabase columns). */
export type AnalysisWorkspaceLead = {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly target_zip_code: string | null;
  readonly purchasing_power_limit: number | null;
  readonly target_budget: number | null;
  readonly current_status: string;
  readonly milestone: string | null;
  readonly timeline: string | null;
  readonly purchase_timeline: string | null;
  readonly notes: string | null;
  readonly ai_summary: string | null;
  readonly has_verified_pre_approval: boolean;
  readonly lead_score: number | null;
  readonly market_readiness_score: number | null;
  readonly roadblocks: readonly string[] | null;
  readonly hurdle_lender: boolean;
  readonly hurdle_home_sale: boolean;
  readonly hurdle_down_payment: boolean;
};

export type LeadAnalysisWorkspaceProps = {
  readonly leads: readonly AnalysisWorkspaceLead[];
  /** Lead UUID used when building `/api/track-click` URLs (defaults to first active buyer). */
  readonly trackingLeadId?: string;
};

type CopyState = "idle" | "copied";

type BlockageBreakdown = {
  readonly financingCreditPct: number;
  readonly structuralPct: number;
  readonly flaggedPct: number;
  readonly financingCreditCount: number;
  readonly structuralCount: number;
  readonly flaggedCount: number;
};

const URGENCY_KEYWORDS = [
  "urgent",
  "urgently",
  "asap",
  "lease ending",
  "lease expiring",
  "relocating",
  "relocation",
  "school",
  "deadline",
] as const;

const FINANCING_NOTE_KEYWORDS = [
  "credit challenge",
  "low score",
  "bad credit",
  "pre-approval",
  "preapproval",
  "lender",
  "financing",
  "underwrite",
] as const;

const STRUCTURAL_NOTE_KEYWORDS = [
  "must sell",
  "home sale",
  "contingent",
  "down payment",
  "appraisal",
  "inspection",
] as const;

const COMMISSION_RATE = 0.03;

function isActiveLead(lead: AnalysisWorkspaceLead): boolean {
  const status = (lead.milestone ?? lead.current_status).trim();
  return status !== "Closed";
}

function resolveDisplayName(lead: AnalysisWorkspaceLead): string {
  return lead.name.trim() || "Active buyer";
}

function resolvePhone(lead: AnalysisWorkspaceLead): string {
  return lead.phone?.trim() ?? "";
}

function resolveZip(lead: AnalysisWorkspaceLead): string {
  return lead.target_zip_code?.trim() ?? "—";
}

function resolvePurchasingPower(lead: AnalysisWorkspaceLead): number {
  const power = lead.purchasing_power_limit ?? lead.target_budget ?? 0;
  return Number.isFinite(power) && power > 0 ? power : 0;
}

function resolveNotesText(lead: AnalysisWorkspaceLead): string {
  return (lead.notes ?? lead.ai_summary ?? "").toLowerCase();
}

function resolveTimeline(lead: AnalysisWorkspaceLead): string {
  return (lead.timeline ?? lead.purchase_timeline ?? "").trim();
}

function isImmediateTimeline(lead: AnalysisWorkspaceLead): boolean {
  const timeline = resolveTimeline(lead).toLowerCase();
  return timeline === "immediate" || timeline.includes("under 30");
}

function notesContainKeyword(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function hasFinancingBlockage(lead: AnalysisWorkspaceLead): boolean {
  const notes = resolveNotesText(lead);
  return (
    !lead.has_verified_pre_approval ||
    lead.hurdle_lender ||
    notesContainKeyword(notes, FINANCING_NOTE_KEYWORDS)
  );
}

function hasStructuralBlockage(lead: AnalysisWorkspaceLead): boolean {
  const notes = resolveNotesText(lead);
  const roadblockText = (lead.roadblocks ?? []).join(" ").toLowerCase();
  return (
    lead.hurdle_home_sale ||
    lead.hurdle_down_payment ||
    notesContainKeyword(notes, STRUCTURAL_NOTE_KEYWORDS) ||
    notesContainKeyword(roadblockText, STRUCTURAL_NOTE_KEYWORDS)
  );
}

function hasAnyRoadblock(lead: AnalysisWorkspaceLead): boolean {
  return hasFinancingBlockage(lead) || hasStructuralBlockage(lead);
}

function isHighUrgencyLead(lead: AnalysisWorkspaceLead): boolean {
  if (!isActiveLead(lead)) {
    return false;
  }
  const notes = resolveNotesText(lead);
  const score = lead.lead_score ?? lead.market_readiness_score ?? 0;
  return (
    isImmediateTimeline(lead) ||
    notesContainKeyword(notes, URGENCY_KEYWORDS) ||
    score >= 85
  );
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatFullCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function pct(count: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((count / total) * 100);
}

function buildTrackingUrl(
  origin: string,
  leadId: string,
  zipCode: string,
): string {
  const zipSegment = encodeURIComponent(zipCode.trim() || "local");
  const redirect = `/market-report/${zipSegment}`;
  const params = new URLSearchParams({
    leadId,
    redirect,
  });
  return `${origin}/api/track-click?${params.toString()}`;
}

function buildTelUri(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

function buildSmsUri(phone: string, name: string): string {
  const digits = phone.replace(/\s/g, "");
  const body = `Hi ${name}, Derrick here — ready when you are to review homes in your target area.`;
  return `sms:${digits}?body=${encodeURIComponent(body)}`;
}

/** Map legacy `LeadRecord` rows into workspace analysis shape. */
export function mapLeadRecordsToWorkspace(
  leads: readonly LeadRecord[],
): AnalysisWorkspaceLead[] {
  return leads.map((lead) => ({
    id: lead.id,
    name: lead.lead_name,
    phone: lead.phone_number,
    target_zip_code: null,
    purchasing_power_limit: lead.target_budget,
    target_budget: lead.target_budget,
    current_status: lead.current_status,
    milestone: lead.current_status,
    timeline: lead.purchase_timeline,
    purchase_timeline: lead.purchase_timeline,
    notes: lead.ai_summary,
    ai_summary: lead.ai_summary,
    has_verified_pre_approval: lead.has_verified_pre_approval,
    lead_score: lead.market_readiness_score,
    market_readiness_score: lead.market_readiness_score,
    roadblocks: null,
    hurdle_lender: lead.ai_extracted_preferences.hurdle_lender,
    hurdle_home_sale: lead.ai_extracted_preferences.hurdle_home_sale,
    hurdle_down_payment: lead.ai_extracted_preferences.hurdle_down_payment,
  }));
}

export function LeadAnalysisWorkspace({
  leads,
  trackingLeadId,
}: LeadAnalysisWorkspaceProps) {
  const [origin, setOrigin] = useState("");
  const [zipInput, setZipInput] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const activeLeads = useMemo(
    () => leads.filter(isActiveLead),
    [leads],
  );

  const resolvedTrackingLeadId = useMemo(() => {
    if (trackingLeadId?.trim()) {
      return trackingLeadId.trim();
    }
    const urgent = activeLeads.find(isHighUrgencyLead);
    if (urgent) {
      return urgent.id;
    }
    return activeLeads[0]?.id ?? "";
  }, [activeLeads, trackingLeadId]);

  const metrics = useMemo(() => {
    const total = activeLeads.length;
    const divisor = total > 0 ? total : 1;

    const pipelineVolume = activeLeads.reduce(
      (sum, lead) => sum + resolvePurchasingPower(lead),
      0,
    );
    const projectedCommission = pipelineVolume * COMMISSION_RATE;

    let financingCreditCount = 0;
    let structuralCount = 0;
    let flaggedCount = 0;

    for (const lead of activeLeads) {
      const financing = hasFinancingBlockage(lead);
      const structural = hasStructuralBlockage(lead);
      if (financing) {
        financingCreditCount += 1;
      }
      if (structural) {
        structuralCount += 1;
      }
      if (financing || structural || (lead.roadblocks?.length ?? 0) > 0) {
        flaggedCount += 1;
      }
    }

    const blockage: BlockageBreakdown = {
      financingCreditPct: pct(financingCreditCount, divisor),
      structuralPct: pct(structuralCount, divisor),
      flaggedPct: pct(flaggedCount, divisor),
      financingCreditCount,
      structuralCount,
      flaggedCount,
    };

    const urgentLeads = activeLeads.filter(isHighUrgencyLead);

    return {
      total,
      pipelineVolume,
      projectedCommission,
      blockage,
      urgentLeads,
    };
  }, [activeLeads]);

  const sanitizedZip = zipInput.replace(/\D/g, "").slice(0, 5);
  const trackedLink = useMemo(() => {
    if (!origin || !resolvedTrackingLeadId || sanitizedZip.length < 5) {
      return "";
    }
    return buildTrackingUrl(origin, resolvedTrackingLeadId, sanitizedZip);
  }, [origin, resolvedTrackingLeadId, sanitizedZip]);

  const handleCopyTrackedLink = useCallback(async () => {
    if (!trackedLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(trackedLink);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch (error: unknown) {
      console.error("[LEAD_ANALYSIS_COPY_LINK]", { error });
    }
  }, [trackedLink]);

  return (
    <div className="w-full space-y-6 font-sans text-slate-100">
      {/* Module A — KPI panel */}
      <section className="grid gap-4 md:grid-cols-2">
        <article className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl shadow-black/20">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl"
          />
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Market capital velocity
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {formatCompactCurrency(metrics.pipelineVolume)}
              </p>
              <p className="mt-1 text-xs text-slate-400">Pipeline volume</p>
              <p className="mt-3 text-sm text-slate-500">
                {formatFullCurrency(metrics.pipelineVolume)} across{" "}
                {metrics.total} active {metrics.total === 1 ? "file" : "files"}
              </p>
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl shadow-black/20">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl"
          />
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
              <DollarSign className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-emerald-400/80">
                Projected revenue forecast
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-300 sm:text-4xl">
                {formatCompactCurrency(metrics.projectedCommission)}
              </p>
              <p className="mt-1 text-xs text-emerald-400/70">
                3% gross commission baseline
              </p>
              <p className="mt-3 text-sm text-slate-500">
                Potential earnings milestone on current active buyer volume
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* Module B — ecosystem blockages */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden />
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300/90">
              Ecosystem blockage identifiers
            </h2>
          </div>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
            {metrics.blockage.flaggedPct}% flagged
          </span>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <BlockageMeter
            label="Financing & credit friction"
            pct={metrics.blockage.financingCreditPct}
            count={metrics.blockage.financingCreditCount}
            total={metrics.total}
            accentClass="bg-amber-400"
            borderClass="border-amber-500/25"
          />
          <BlockageMeter
            label="Structural dependencies"
            pct={metrics.blockage.structuralPct}
            count={metrics.blockage.structuralCount}
            total={metrics.total}
            accentClass="bg-orange-500"
            borderClass="border-orange-500/25"
          />
        </div>
      </section>

      {/* Module C — high-urgency action grid */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <header className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
            High-urgency target velocity
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Immediate timelines and urgency signals in conversation logs
          </p>
        </header>

        <ul className="space-y-2">
          {metrics.urgentLeads.map((lead) => {
            const name = resolveDisplayName(lead);
            const phone = resolvePhone(lead);
            const zip = resolveZip(lead);
            const hasPhone = phone.length > 0;

            return (
              <li
                key={lead.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    ZIP {zip}
                    {isImmediateTimeline(lead) ? " · Immediate window" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {hasPhone ? (
                    <>
                      <a
                        href={buildTelUri(phone)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-4 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/40 hover:text-cyan-100"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden />
                        Call
                      </a>
                      <a
                        href={buildSmsUri(phone, name)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-950/40 px-4 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-900/50"
                      >
                        Text
                      </a>
                    </>
                  ) : (
                    <span className="text-xs text-amber-400/90">No phone on file</span>
                  )}
                </div>
              </li>
            );
          })}
          {metrics.urgentLeads.length === 0 ? (
            <li className="rounded-xl border border-dashed border-slate-700 py-8 text-center text-sm text-slate-500">
              No immediate-velocity buyers flagged right now.
            </li>
          ) : null}
        </ul>
      </section>

      {/* Module D — market activity linker */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <header className="mb-4 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-cyan-400" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Dynamic market activity linker
          </h2>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label
              htmlFor="workspace-zip-link"
              className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
            >
              Target ZIP
            </label>
            <input
              id="workspace-zip-link"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={zipInput}
              onChange={(event) =>
                setZipInput(event.target.value.replace(/\D/g, "").slice(0, 5))
              }
              placeholder="75024"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-cyan-500/0 transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <button
            type="button"
            disabled={!trackedLink}
            onClick={() => void handleCopyTrackedLink()}
            className={cn(
              "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition",
              trackedLink
                ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-teal-400"
                : "cursor-not-allowed border border-slate-800 bg-slate-950 text-slate-600",
            )}
          >
            <Copy className="h-4 w-4" aria-hidden />
            {copyState === "copied" ? "Copied!" : "Copy Tracked Link"}
          </button>
        </div>

        <p className="mt-3 break-all text-xs text-slate-500">
          {trackedLink ||
            (resolvedTrackingLeadId
              ? "Enter a 5-digit ZIP to generate a tracked market report link."
              : "Add an active buyer to enable tracked outbound links.")}
        </p>

        {!resolvedTrackingLeadId ? (
          <p className="mt-2 text-xs text-amber-400/90">
            Tracking requires at least one active buyer record.
          </p>
        ) : null}
      </section>
    </div>
  );
}

type BlockageMeterProps = {
  readonly label: string;
  readonly pct: number;
  readonly count: number;
  readonly total: number;
  readonly accentClass: string;
  readonly borderClass: string;
};

function BlockageMeter({
  label,
  pct,
  count,
  total,
  accentClass,
  borderClass,
}: BlockageMeterProps) {
  return (
    <div className={cn("rounded-xl border bg-slate-950/50 p-4", borderClass)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="font-semibold text-amber-200">
          {pct}% ({count}/{total})
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={cn("h-full rounded-full transition-all", accentClass)}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}
