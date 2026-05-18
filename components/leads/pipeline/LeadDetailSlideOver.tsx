"use client";

import { GlassPanel } from "@/components/leads/spatial/GlassPanel";
import { ReadinessRing } from "@/components/leads/spatial/ReadinessRing";
import { spatial } from "@/components/leads/spatial/spatial-styles";
import {
  computePotentialBuyerIndex,
  PURCHASE_TIMELINES,
  parsePurchaseTimeline,
  type LeadOperationalHurdles,
  type PurchaseTimeline,
} from "@/lib/leads/potential-index";
import CommunicationPlan from "@/components/CommunicationPlan";
import { formatLeadBudget } from "@/lib/leads/lead-insights";
import { communicationPlanFromLead } from "@/lib/leads/communication-plan";
import {
  LEAD_STATUSES,
  type LeadRecord,
  type LeadStatus,
} from "@/lib/leads/types";
import { useEffect, useMemo, useState } from "react";

type DetailTab =
  | "overview"
  | "activity"
  | "profile"
  | "financing"
  | "documents"
  | "timeline";

const DETAIL_TABS: readonly { readonly id: DetailTab; readonly label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "profile", label: "Buyer Profile" },
  { id: "financing", label: "Financing" },
  { id: "documents", label: "Documents" },
  { id: "timeline", label: "Timeline" },
];

type LeadDetailSlideOverProps = {
  readonly lead: LeadRecord;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSaved: (lead: LeadRecord) => void;
  readonly statusMessage: string | null;
  readonly setStatusMessage: (message: string | null) => void;
};

export function LeadDetailSlideOver({
  lead,
  open,
  onClose,
  onSaved,
  statusMessage,
  setStatusMessage,
}: LeadDetailSlideOverProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [editStatus, setEditStatus] = useState<LeadStatus>(lead.current_status);
  const [editBudget, setEditBudget] = useState(Number(lead.target_budget ?? 0));
  const [editTimeline, setEditTimeline] = useState<PurchaseTimeline>(
    parsePurchaseTimeline(lead.purchase_timeline),
  );
  const [editFirstTime, setEditFirstTime] = useState(lead.is_first_time_buyer);
  const [editPreApproval, setEditPreApproval] = useState(lead.has_verified_pre_approval);
  const [hurdleLender, setHurdleLender] = useState(
    lead.ai_extracted_preferences.hurdle_lender,
  );
  const [hurdleHomeSale, setHurdleHomeSale] = useState(
    lead.ai_extracted_preferences.hurdle_home_sale,
  );
  const [hurdleDownPayment, setHurdleDownPayment] = useState(
    lead.ai_extracted_preferences.hurdle_down_payment,
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditStatus(lead.current_status);
    setEditBudget(Number(lead.target_budget ?? 0));
    setEditTimeline(parsePurchaseTimeline(lead.purchase_timeline));
    setEditFirstTime(lead.is_first_time_buyer);
    setEditPreApproval(lead.has_verified_pre_approval);
    setHurdleLender(lead.ai_extracted_preferences.hurdle_lender);
    setHurdleHomeSale(lead.ai_extracted_preferences.hurdle_home_sale);
    setHurdleDownPayment(lead.ai_extracted_preferences.hurdle_down_payment);
    setActiveTab("overview");
  }, [lead]);

  const hurdles = useMemo(
    (): LeadOperationalHurdles => ({
      hurdleLender,
      hurdleHomeSale,
      hurdleDownPayment,
    }),
    [hurdleLender, hurdleHomeSale, hurdleDownPayment],
  );

  const liveScore = useMemo(
    () =>
      computePotentialBuyerIndex(editStatus, editTimeline, editPreApproval, {
        notesText: lead.raw_transcript ?? "",
        hurdles,
      }),
    [editStatus, editTimeline, editPreApproval, lead.raw_transcript, hurdles],
  );

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStatus: editStatus,
          targetBudget: editBudget,
          isFirstTimeBuyer: editFirstTime,
          hasVerifiedPreApproval: editPreApproval,
          purchaseTimeline: editTimeline,
          hurdleLender,
          hurdleHomeSale,
          hurdleDownPayment,
          notesText: lead.raw_transcript ?? "",
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "message" in result &&
          typeof (result as { message: unknown }).message === "string"
            ? (result as { message: string }).message
            : "Save failed.";
        setStatusMessage(message);
        return;
      }
      const score =
        typeof result === "object" &&
        result !== null &&
        "potentialBuyerIndex" in result &&
        typeof (result as { potentialBuyerIndex: unknown }).potentialBuyerIndex === "number"
          ? (result as { potentialBuyerIndex: number }).potentialBuyerIndex
          : liveScore;

      onSaved({
        ...lead,
        current_status: editStatus,
        target_budget: editBudget,
        is_first_time_buyer: editFirstTime,
        has_verified_pre_approval: editPreApproval,
        purchase_timeline: editTimeline,
        market_readiness_score: score,
        ai_extracted_preferences: {
          ...lead.ai_extracted_preferences,
          hurdle_lender: hurdleLender,
          hurdle_home_sale: hurdleHomeSale,
          hurdle_down_payment: hurdleDownPayment,
        },
      });
      setStatusMessage("Saved.");
    } catch (error: unknown) {
      console.error("[LEAD_UPDATE_EXCEPTION]", { error });
      setStatusMessage("Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close panel"
        className="fixed inset-0 z-40 bg-[#060a14]/70 backdrop-blur-sm md:bg-black/50"
        onClick={onClose}
      />
      <aside className="fixed top-0 right-0 z-50 flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-white/[0.06] bg-[#0a101c]/95 shadow-[-24px_0_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <p className={spatial.label}>Buyer profile</p>
            <h2 className="text-xl font-semibold text-white">{lead.lead_name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300"
          >
            Close
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 py-3">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase transition-all ${
                activeTab === tab.id
                  ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/25"
                  : "text-[var(--spatial-text-muted)] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {statusMessage ? (
            <p className="text-xs text-cyan-300/90">{statusMessage}</p>
          ) : null}

          {activeTab === "overview" ? (
            <>
              <div className="flex justify-center py-2">
                <ReadinessRing score={liveScore} size={120} />
              </div>
              <GlassPanel variant="soft" className="p-4">
                <p className={spatial.label}>AI insight</p>
                <p className="mt-2 text-sm text-slate-300">
                  {lead.ai_summary ?? "No summary yet."}
                </p>
              </GlassPanel>
              {lead.ai_next_best_action ? (
                <GlassPanel variant="soft" className="p-4">
                  <p className={spatial.label}>Next action</p>
                  <p className="mt-2 text-sm text-cyan-100/90">{lead.ai_next_best_action}</p>
                </GlassPanel>
              ) : null}
            </>
          ) : null}

          {activeTab === "activity" ? (
            <GlassPanel variant="soft" className="space-y-3 p-4 text-sm text-slate-300">
              <p>Engagement count · {lead.buyer_engagement_count}</p>
              <p>Created · {new Date(lead.created_at).toLocaleDateString()}</p>
              <p>Updated · {new Date(lead.updated_at).toLocaleDateString()}</p>
            </GlassPanel>
          ) : null}

          {activeTab === "profile" ? (
            <>
              <GlassPanel variant="soft" className="space-y-3 p-4 text-sm">
                <p className="text-slate-300">Phone · {lead.phone_number ?? "—"}</p>
                <p className="text-slate-300">Email · {lead.email_address ?? "—"}</p>
                <p className="text-slate-300">Source · {lead.lead_source}</p>
                <label className="block">
                  <span className={spatial.label}>Status</span>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as LeadStatus)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white"
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </GlassPanel>
              <CommunicationPlan
                key={lead.id}
                leadId={lead.id}
                initialData={communicationPlanFromLead(lead)}
                onSaved={(data) => {
                  onSaved({
                    ...lead,
                    welcome_email_enabled: data.welcomeEmailEnabled,
                    preferred_communication_channel: data.preferredCommunicationChannel,
                    preferred_contact_window:
                      data.preferredContactWindow.trim().length > 0
                        ? data.preferredContactWindow
                        : null,
                    custom_communication_notes:
                      data.customCommunicationNotes.trim().length > 0
                        ? data.customCommunicationNotes
                        : null,
                    communication_preferences: data.communicationPreferences,
                  });
                }}
              />
            </>
          ) : null}

          {activeTab === "financing" ? (
            <GlassPanel variant="soft" className="space-y-3 p-4">
              <p className="text-sm text-slate-300">
                Loan · {lead.ai_extracted_preferences.loan_type}
              </p>
              <p className="text-sm text-emerald-300">{formatLeadBudget(editBudget)}</p>
              <label className="block">
                <span className={spatial.label}>Max budget</span>
                <input
                  type="number"
                  step={10000}
                  value={editBudget}
                  onChange={(e) => setEditBudget(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className={spatial.label}>Pre-approval verified</span>
                <select
                  value={editPreApproval ? "yes" : "no"}
                  onChange={(e) => setEditPreApproval(e.target.value === "yes")}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
              {[
                { label: "Lender verification needed", state: hurdleLender, toggle: () => setHurdleLender((v) => !v) },
                { label: "Home sale contingency", state: hurdleHomeSale, toggle: () => setHurdleHomeSale((v) => !v) },
                { label: "Down payment gap", state: hurdleDownPayment, toggle: () => setHurdleDownPayment((v) => !v) },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.toggle}
                  className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-all ${
                    item.state
                      ? "bg-rose-950/30 text-rose-300 ring-1 ring-rose-500/20"
                      : "bg-white/[0.03] text-slate-400 ring-1 ring-white/[0.06]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </GlassPanel>
          ) : null}

          {activeTab === "documents" ? (
            <GlassPanel variant="soft" className="p-6 text-center text-sm text-[var(--spatial-text-muted)]">
              Document vault connects in a future release. Pre-approval letters and contracts will live here.
            </GlassPanel>
          ) : null}

          {activeTab === "timeline" ? (
            <GlassPanel variant="soft" className="space-y-3 p-4">
              <label className="block">
                <span className={spatial.label}>Purchase timeline</span>
                <select
                  value={editTimeline}
                  onChange={(e) =>
                    setEditTimeline(parsePurchaseTimeline(e.target.value))
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white"
                >
                  {PURCHASE_TIMELINES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={spatial.label}>First-time buyer</span>
                <select
                  value={editFirstTime ? "yes" : "no"}
                  onChange={(e) => setEditFirstTime(e.target.value === "yes")}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
            </GlassPanel>
          ) : null}
        </div>

        <div className="border-t border-white/[0.06] p-4">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="w-full rounded-full bg-cyan-500/90 py-3 text-xs font-semibold tracking-wide text-[#060a14] uppercase transition-all hover:bg-cyan-400 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </aside>
    </>
  );
}
