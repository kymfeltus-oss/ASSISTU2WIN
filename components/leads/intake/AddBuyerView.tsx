"use client";

import { GlassPanel } from "@/components/leads/spatial/GlassPanel";
import { ReadinessRing } from "@/components/leads/spatial/ReadinessRing";
import { useLeads } from "@/components/leads/LeadsProvider";
import { spatial } from "@/components/leads/spatial/spatial-styles";
import {
  computePotentialBuyerIndex,
  PURCHASE_TIMELINES,
  parsePurchaseTimeline,
  type PurchaseTimeline,
} from "@/lib/leads/potential-index";
import type { LeadStatus, LoanType } from "@/lib/leads/types";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

type IntakeLoan = Extract<LoanType, "Conventional" | "FHA" | "Cash">;
type IntakeStatus = Extract<LeadStatus, "New Lead" | "Pre-Approved">;

const SOURCES = [
  "Referral",
  "Professional Network",
  "Open House",
  "Online Lead",
  "Past Client",
  "Other",
] as const;

export function AddBuyerView() {
  const router = useRouter();
  const { refreshLeads, setStatusMessage } = useLeads();
  const [buyerName, setBuyerName] = useState("");
  const [buyerSource, setBuyerSource] = useState<(typeof SOURCES)[number]>("Referral");
  const [buyerBudget, setBuyerBudget] = useState(450_000);
  const [loanType, setLoanType] = useState<IntakeLoan>("Conventional");
  const [initialStatus, setInitialStatus] = useState<IntakeStatus>("New Lead");
  const [phoneContact, setPhoneContact] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [purchaseTimeline, setPurchaseTimeline] =
    useState<PurchaseTimeline>("1-3 Months");
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [hasPreApproval, setHasPreApproval] = useState(false);
  const [manualNotes, setManualNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const readiness = useMemo(
    () =>
      computePotentialBuyerIndex(initialStatus, purchaseTimeline, hasPreApproval, {
        notesText: manualNotes,
      }),
    [initialStatus, purchaseTimeline, hasPreApproval, manualNotes],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = buyerName.trim();
    if (!trimmedName) {
      setLocalError("Buyer name required.");
      return;
    }
    setIsSubmitting(true);
    setLocalError(null);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/leads/manual-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: trimmedName,
          leadSource: buyerSource,
          targetBudget: buyerBudget,
          currentStatus: initialStatus,
          phoneNumber: phoneContact.trim() || null,
          emailAddress: emailContact.trim() || null,
          loanType,
          followupDelayDays: 0,
          isFirstTimeBuyer: isFirstTime,
          hasVerifiedPreApproval: hasPreApproval,
          purchaseTimeline,
          manualNotes: manualNotes.trim() || null,
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
            : "Failed to add buyer.";
        setLocalError(message);
        return;
      }
      await refreshLeads();
      setStatusMessage("Buyer added.");
      router.push("/dashboard/leads/pipeline");
    } catch (error: unknown) {
      console.error("[LEAD_CREATE_EXCEPTION]", { error });
      setLocalError("Failed to add buyer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 sm:px-8">
      <section className="mb-8 space-y-2 pt-2">
        <p className={spatial.label}>Add buyer</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">New buyer intake</h1>
        <p className={spatial.body}>Quiet, focused capture — then back to your pipeline.</p>
      </section>

      <GlassPanel className="p-6 sm:p-8">
        {localError ? (
          <p className="mb-4 text-xs text-rose-300/90">{localError}</p>
        ) : null}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={spatial.label}>Buyer name</span>
              <input
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
              />
            </label>
            <label className="block space-y-1.5">
              <span className={spatial.label}>Source</span>
              <select
                value={buyerSource}
                onChange={(e) =>
                  setBuyerSource(e.target.value as (typeof SOURCES)[number])
                }
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={spatial.label}>Phone</span>
              <input
                type="tel"
                value={phoneContact}
                onChange={(e) => setPhoneContact(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white"
              />
            </label>
            <label className="block space-y-1.5">
              <span className={spatial.label}>Email</span>
              <input
                type="email"
                value={emailContact}
                onChange={(e) => setEmailContact(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white"
              />
            </label>
          </div>

          <div className="rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/[0.06]">
            <div className="mb-2 flex justify-between">
              <span className={spatial.label}>Max budget</span>
              <span className="text-sm font-semibold text-emerald-300">
                ${buyerBudget.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={150_000}
              max={1_500_000}
              step={50_000}
              value={buyerBudget}
              onChange={(e) => setBuyerBudget(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <ReadinessRing score={readiness} size={100} />
            <div className="grid flex-1 grid-cols-2 gap-2">
              {(["Conventional", "FHA", "Cash"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLoanType(t)}
                  className={`rounded-xl py-2 text-xs font-semibold ${
                    loanType === t
                      ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30"
                      : "bg-white/[0.03] text-slate-500"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <select
            value={purchaseTimeline}
            onChange={(e) => setPurchaseTimeline(parsePurchaseTimeline(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white"
          >
            {PURCHASE_TIMELINES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <textarea
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
            placeholder="Notes (lease end, relocation, schools…)"
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder:text-slate-600"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-cyan-500/90 py-3.5 text-xs font-semibold tracking-wide text-[#060a14] uppercase disabled:opacity-50"
          >
            {isSubmitting ? "Adding…" : "Add to pipeline"}
          </button>
        </form>
      </GlassPanel>
    </div>
  );
}
