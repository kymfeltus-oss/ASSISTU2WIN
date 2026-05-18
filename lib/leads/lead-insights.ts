import type { LeadRecord } from "@/lib/leads/types";

export type LeadInsightAction = {
  readonly id: string;
  readonly leadId: string;
  readonly leadName: string;
  readonly label: string;
  readonly priority: "high" | "medium";
};

export function formatLeadBudget(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `$${Math.round(value / 1_000)}k`;
}

export function getLeadAreaLabel(lead: LeadRecord): string {
  const neighborhoods = lead.ai_extracted_preferences.target_neighborhoods;
  if (neighborhoods.length > 0) return neighborhoods[0] ?? "DFW";
  return "DFW Metro";
}

export function isHotBuyer(lead: LeadRecord): boolean {
  return lead.market_readiness_score >= 70;
}

export function pickFeaturedLead(leads: readonly LeadRecord[]): LeadRecord | null {
  if (leads.length === 0) return null;
  const sorted = [...leads].sort(
    (a, b) => b.market_readiness_score - a.market_readiness_score,
  );
  return sorted[0] ?? null;
}

export function getHotBuyers(leads: readonly LeadRecord[]): readonly LeadRecord[] {
  return leads.filter(isHotBuyer).slice(0, 6);
}

export function getFollowUpLeads(leads: readonly LeadRecord[]): readonly LeadRecord[] {
  return leads
    .filter(
      (lead) =>
        !lead.has_verified_pre_approval ||
        lead.ai_extracted_preferences.hurdle_lender ||
        lead.current_status === "New Lead" ||
        lead.current_status === "No Pre-Approval",
    )
    .slice(0, 5);
}

export function buildAiActions(leads: readonly LeadRecord[]): readonly LeadInsightAction[] {
  const actions: LeadInsightAction[] = [];

  for (const lead of leads) {
    if (lead.ai_next_best_action) {
      actions.push({
        id: `${lead.id}-nba`,
        leadId: lead.id,
        leadName: lead.lead_name,
        label: lead.ai_next_best_action,
        priority: lead.market_readiness_score >= 80 ? "high" : "medium",
      });
    } else if (!lead.has_verified_pre_approval) {
      actions.push({
        id: `${lead.id}-pre`,
        leadId: lead.id,
        leadName: lead.lead_name,
        label: "Request verified pre-approval letter",
        priority: "high",
      });
    }

    if (actions.length >= 4) break;
  }

  return actions;
}

export function getTotalPipelineVolume(leads: readonly LeadRecord[]): number {
  return leads.reduce((sum, lead) => sum + Number(lead.target_budget ?? 0), 0);
}
