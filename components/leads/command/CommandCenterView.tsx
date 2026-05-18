"use client";

import { GlassPanel } from "@/components/leads/spatial/GlassPanel";
import { ReadinessRing } from "@/components/leads/spatial/ReadinessRing";
import { spatial } from "@/components/leads/spatial/spatial-styles";
import { useLeads } from "@/components/leads/LeadsProvider";
import {
  buildAiActions,
  formatLeadBudget,
  getFollowUpLeads,
  getHotBuyers,
  getLeadAreaLabel,
  getTotalPipelineVolume,
  pickFeaturedLead,
} from "@/lib/leads/lead-insights";
import Link from "next/link";
import { useMemo } from "react";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function CommandCenterView() {
  const { leads, loading, statusMessage, setSelectedLead } = useLeads();

  const featured = useMemo(() => pickFeaturedLead(leads), [leads]);
  const hotBuyers = useMemo(() => getHotBuyers(leads), [leads]);
  const followUps = useMemo(() => getFollowUpLeads(leads), [leads]);
  const aiActions = useMemo(() => buildAiActions(leads), [leads]);
  const totalVolume = useMemo(() => getTotalPipelineVolume(leads), [leads]);

  if (loading) {
    return (
      <p className="px-8 py-16 text-sm text-[var(--spatial-text-secondary)]">
        Loading your workspace…
      </p>
    );
  }

  return (
    <div className="app-page space-y-10 pb-20">
      {statusMessage ? (
        <p className="text-center text-xs text-cyan-300/90">{statusMessage}</p>
      ) : null}

      <section className="space-y-2 pt-2">
        <p className={spatial.label}>Leads command center</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {greeting()}
        </h1>
        <p className={`max-w-xl ${spatial.body}`}>
          What needs your attention right now — one buyer, one move, one calm view.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: "Active buyers", value: String(leads.length) },
          {
            label: "Hot buyers",
            value: String(hotBuyers.length),
          },
          {
            label: "Pipeline volume",
            value: formatLeadBudget(totalVolume),
          },
          {
            label: "Follow-ups",
            value: String(followUps.length),
          },
        ].map((kpi) => (
          <GlassPanel key={kpi.label} variant="soft" className="p-4">
            <p className={spatial.label}>{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {kpi.value}
            </p>
          </GlassPanel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr] lg:gap-8">
        {featured ? (
          <GlassPanel
            interactive
            className="relative overflow-hidden p-8 sm:p-10 lg:min-h-[420px]"
          >
            <div
              className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl"
              aria-hidden
            />
            <p className={spatial.label}>Featured buyer</p>
            <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {featured.lead_name}
                </h2>
                <p className="text-base text-[var(--spatial-text-secondary)]">
                  {getLeadAreaLabel(featured)} · {featured.ai_extracted_preferences.loan_type} ·{" "}
                  {formatLeadBudget(featured.target_budget)}
                </p>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 engagement-pulse" />
                  <span className="text-xs text-cyan-300/90">Live engagement signal</span>
                </div>
                <div className="max-w-md rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                  <p className={spatial.label}>AI suggested next action</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">
                    {featured.ai_next_best_action ??
                      "Schedule a lender check-in and confirm pre-approval status."}
                  </p>
                </div>
                <Link
                  href="/dashboard/leads/pipeline"
                  onClick={() => setSelectedLead(featured)}
                  className="inline-flex rounded-full bg-white/[0.08] px-5 py-2.5 text-xs font-semibold tracking-wide text-white ring-1 ring-cyan-400/30 transition-all hover:bg-white/[0.12]"
                >
                  Open buyer profile
                </Link>
              </div>
              <ReadinessRing score={featured.market_readiness_score} size={148} />
            </div>
          </GlassPanel>
        ) : (
          <GlassPanel className="flex min-h-[320px] items-center justify-center p-10">
            <div className="text-center">
              <p className="text-sm text-[var(--spatial-text-secondary)]">
                No buyers yet.
              </p>
              <Link
                href="/dashboard/leads/intake"
                className="mt-4 inline-block text-xs font-semibold text-cyan-400 uppercase tracking-wide"
              >
                Add your first buyer
              </Link>
            </div>
          </GlassPanel>
        )}

        <div className="space-y-4">
          <GlassPanel variant="soft" className="p-5">
            <p className={spatial.label}>Hot buyers</p>
            <ul className="mt-4 space-y-3">
              {hotBuyers.length === 0 ? (
                <li className="text-xs text-[var(--spatial-text-muted)]">None yet.</li>
              ) : (
                hotBuyers.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href="/dashboard/leads/pipeline"
                      onClick={() => setSelectedLead(lead)}
                      className="flex items-center justify-between rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="text-sm font-medium text-white">{lead.lead_name}</span>
                      <span className="text-xs font-semibold text-cyan-300">
                        {lead.market_readiness_score}%
                      </span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </GlassPanel>

          <GlassPanel variant="soft" className="p-5">
            <p className={spatial.label}>Follow-ups due</p>
            <ul className="mt-4 space-y-3">
              {followUps.length === 0 ? (
                <li className="text-xs text-[var(--spatial-text-muted)]">All caught up.</li>
              ) : (
                followUps.map((lead) => (
                  <li key={lead.id} className="text-sm text-slate-300">
                    <span className="font-medium text-white">{lead.lead_name}</span>
                    <span className="mt-0.5 block text-[11px] text-[var(--spatial-text-muted)]">
                      {lead.has_verified_pre_approval
                        ? "Status check recommended"
                        : "Pre-approval pending"}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </GlassPanel>
        </div>
      </div>

      <GlassPanel variant="soft" className="p-6">
        <p className={spatial.label}>AI recommended actions</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {aiActions.length === 0 ? (
            <p className="text-sm text-[var(--spatial-text-muted)]">
              Actions will appear as your pipeline grows.
            </p>
          ) : (
            aiActions.map((action) => (
              <Link
                key={action.id}
                href="/dashboard/leads/pipeline"
                className="rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent p-4 ring-1 ring-white/[0.06] transition-all hover:ring-cyan-400/20"
              >
                <p className="text-[10px] font-semibold tracking-wide text-cyan-300/80 uppercase">
                  {action.leadName}
                </p>
                <p className="mt-2 text-sm text-slate-200">{action.label}</p>
              </Link>
            ))
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
