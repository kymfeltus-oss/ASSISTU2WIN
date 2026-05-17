"use client";

import { GlassPanel } from "@/components/leads/spatial/GlassPanel";
import { ReadinessRing } from "@/components/leads/spatial/ReadinessRing";
import { formatLeadBudget, getLeadAreaLabel } from "@/lib/leads/lead-insights";
import type { LeadRecord } from "@/lib/leads/types";

type LeadGalleryCardProps = {
  readonly lead: LeadRecord;
  readonly selected: boolean;
  readonly onSelect: () => void;
};

export function LeadGalleryCard({ lead, selected, onSelect }: LeadGalleryCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full text-left"
    >
      <GlassPanel
        interactive
        className={`relative overflow-hidden p-5 transition-all duration-500 ${
          selected
            ? "ring-1 ring-cyan-400/35 shadow-[0_0_40px_-12px_rgba(34,211,238,0.35)]"
            : ""
        }`}
      >
        <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-cyan-400/5 blur-2xl transition-opacity group-hover:opacity-100 opacity-0" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="truncate text-lg font-semibold tracking-tight text-white">
              {lead.lead_name}
            </h3>
            <p className="text-xs text-[var(--spatial-text-secondary)]">
              {getLeadAreaLabel(lead)} · {lead.ai_extracted_preferences.loan_type}
            </p>
            <p className="text-sm font-semibold text-emerald-300/90">
              {formatLeadBudget(lead.target_budget)}
            </p>
            <p className="text-[11px] text-[var(--spatial-text-muted)]">
              Source · {lead.lead_source}
            </p>
          </div>
          <ReadinessRing score={lead.market_readiness_score} size={72} />
        </div>
        {lead.ai_summary ? (
          <p className="mt-4 line-clamp-2 text-xs leading-relaxed text-slate-400">
            {lead.ai_summary}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-cyan-200/90 uppercase">
            {lead.current_status}
          </span>
          {lead.phone_number ? (
            <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-400">
              Call
            </span>
          ) : null}
          {lead.email_address ? (
            <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-400">
              Email
            </span>
          ) : null}
        </div>
      </GlassPanel>
    </button>
  );
}
