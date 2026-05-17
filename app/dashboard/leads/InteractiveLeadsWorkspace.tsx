"use client";

import { LeadAnalysisView } from "./LeadAnalysisView";
import { PotentialHudBadge } from "@/components/leads/PotentialHudBadge";
import {
  computePotentialBuyerIndex,
  PURCHASE_TIMELINES,
  parsePurchaseTimeline,
  type LeadOperationalHurdles,
  type PurchaseTimeline,
} from "@/lib/leads/potential-index";
import {
  coerceLeadRow,
  LEAD_STATUSES,
  type LeadRecord,
  type LeadStatus,
  type LoanType,
} from "@/lib/leads/types";
import { AppBrand } from "@/components/AppBrand";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

type ActiveTab = "intake" | "pipeline" | "analysis";

type IntakeLoanOption = Extract<LoanType, "Conventional" | "FHA" | "Cash">;

type IntakeStatusOption = Extract<LeadStatus, "New Lead" | "Pre-Approved">;

const LEAD_SOURCE_OPTIONS = [
  "Referral",
  "Professional Network",
  "Open House",
  "Online Lead",
  "Past Client",
  "Other",
] as const;

type LeadSourceOption = (typeof LEAD_SOURCE_OPTIONS)[number];

function parseLeadSourceOption(value: string): LeadSourceOption {
  return (LEAD_SOURCE_OPTIONS as readonly string[]).includes(value)
    ? (value as LeadSourceOption)
    : "Referral";
}

const INTAKE_LOAN_OPTIONS: readonly IntakeLoanOption[] = [
  "Conventional",
  "FHA",
  "Cash",
];

const INTAKE_STATUS_OPTIONS: readonly IntakeStatusOption[] = [
  "New Lead",
  "Pre-Approved",
];

const FOLLOWUP_DELAY_OPTIONS = [
  { label: "Instant", days: 0 },
  { label: "1 Day", days: 1 },
  { label: "3 Days", days: 3 },
] as const;

type FollowupDelayDays = (typeof FOLLOWUP_DELAY_OPTIONS)[number]["days"];

function formatBudget(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "$0";
  return `$${value.toLocaleString()}`;
}

const selectFieldClass =
  "w-full rounded-xl border border-[#1E293B] bg-[#070B16] p-3 text-sm text-white focus:border-cyan-500 focus:outline-none";

const compactSelectClass =
  "w-full rounded-xl border border-[#1E293B] bg-[#070B16] p-3 text-xs text-white focus:border-cyan-500 focus:outline-none";

function yesNoLabel(value: boolean): "Yes" | "No" {
  return value ? "Yes" : "No";
}

function parseYesNoSelect(value: string): boolean {
  return value === "Yes";
}

export function InteractiveLeadsWorkspace() {
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<ActiveTab>("pipeline");
  const [leads, setLeads] = useState<readonly LeadRecord[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [buyerName, setBuyerName] = useState("");
  const [buyerSource, setBuyerSource] = useState<LeadSourceOption>("Referral");
  const [buyerBudget, setBuyerBudget] = useState(450_000);
  const [loanType, setLoanType] = useState<IntakeLoanOption>("Conventional");
  const [initialStatus, setInitialStatus] = useState<IntakeStatusOption>("New Lead");
  const [phoneContact, setPhoneContact] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [followupDelay, setFollowupDelay] = useState<FollowupDelayDays>(0);
  const [purchaseTimeline, setPurchaseTimeline] =
    useState<PurchaseTimeline>("1-3 Months");
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [hasPreApproval, setHasPreApproval] = useState(false);
  const [manualNotes, setManualNotes] = useState("");

  const [hurdleLender, setHurdleLender] = useState(false);
  const [hurdleHomeSale, setHurdleHomeSale] = useState(false);
  const [hurdleDownPayment, setHurdleDownPayment] = useState(false);

  const [selectedZipCode, setSelectedZipCode] = useState("75024");
  const [generatedReportLink, setGeneratedReportLink] = useState<string | null>(null);

  const [editStatus, setEditStatus] = useState<LeadStatus>("New Lead");
  const [editBudget, setEditBudget] = useState(450_000);
  const [editTimeline, setEditTimeline] = useState<PurchaseTimeline>("1-3 Months");
  const [editFirstTime, setEditFirstTime] = useState(false);
  const [editPreApproval, setEditPreApproval] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const editHurdles = useMemo(
    (): LeadOperationalHurdles => ({
      hurdleLender,
      hurdleHomeSale,
      hurdleDownPayment,
    }),
    [hurdleLender, hurdleHomeSale, hurdleDownPayment],
  );

  const intakePotentialIndex = useMemo(
    () =>
      computePotentialBuyerIndex(initialStatus, purchaseTimeline, hasPreApproval, {
        notesText: manualNotes,
      }),
    [initialStatus, purchaseTimeline, hasPreApproval, manualNotes],
  );

  const editPotentialIndex = useMemo(
    () =>
      computePotentialBuyerIndex(editStatus, editTimeline, editPreApproval, {
        notesText: selectedLead?.raw_transcript ?? "",
        hurdles: editHurdles,
      }),
    [editStatus, editTimeline, editPreApproval, selectedLead?.raw_transcript, editHurdles],
  );

  const fetchLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[LEADS_FETCH_FAILURE]", { message: error.message });
        setStatusMessage("Unable to load leads. Confirm admin access.");
        return;
      }

      const mapped = (data ?? []).map((row) =>
        coerceLeadRow(row as Record<string, unknown>),
      );
      setLeads(mapped);
      setSelectedLead((prev) => {
        if (prev) {
          return mapped.find((l) => l.id === prev.id) ?? mapped[0] ?? null;
        }
        return mapped[0] ?? null;
      });
    } catch (error: unknown) {
      console.error("[LEADS_FETCH_EXCEPTION]", { error });
      setStatusMessage("Unable to load leads.");
    }
  }, [supabase]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (selectedLead) {
      setEditStatus(selectedLead.current_status);
      setEditBudget(Number(selectedLead.target_budget ?? 450_000));
      setEditTimeline(parsePurchaseTimeline(selectedLead.purchase_timeline));
      setEditFirstTime(selectedLead.is_first_time_buyer);
      setEditPreApproval(selectedLead.has_verified_pre_approval);
      setHurdleLender(selectedLead.ai_extracted_preferences.hurdle_lender);
      setHurdleHomeSale(selectedLead.ai_extracted_preferences.hurdle_home_sale);
      setHurdleDownPayment(selectedLead.ai_extracted_preferences.hurdle_down_payment);
    }
  }, [selectedLead]);

  const handleCreateLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = buyerName.trim();
    if (!trimmedName) {
      setStatusMessage("Buyer name required.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const trimmedEmail = emailContact.trim();
    const trimmedPhone = phoneContact.trim();

    try {
      const intakeResponse = await fetch("/api/leads/manual-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: trimmedName,
          leadSource: buyerSource,
          targetBudget: buyerBudget,
          currentStatus: initialStatus,
          phoneNumber: trimmedPhone || null,
          emailAddress: trimmedEmail || null,
          loanType,
          followupDelayDays: followupDelay,
          isFirstTimeBuyer: isFirstTime,
          hasVerifiedPreApproval: hasPreApproval,
          purchaseTimeline,
          manualNotes: manualNotes.trim() || null,
        }),
      });

      const intakeResult: unknown = await intakeResponse.json().catch(() => null);

      if (!intakeResponse.ok) {
        const failure =
          typeof intakeResult === "object" &&
          intakeResult !== null &&
          "message" in intakeResult &&
          typeof (intakeResult as { message: unknown }).message === "string"
            ? (intakeResult as { message: string }).message
            : "Failed to create lead.";
        setStatusMessage(
          intakeResponse.status === 401
            ? "Sign in required to create a lead."
            : `Insert failed: ${failure}`,
        );
        return;
      }

      const leadId =
        typeof intakeResult === "object" &&
        intakeResult !== null &&
        "leadId" in intakeResult &&
        typeof (intakeResult as { leadId: unknown }).leadId === "string"
          ? (intakeResult as { leadId: string }).leadId
          : null;

      const scheduledFollowupDays =
        typeof intakeResult === "object" &&
        intakeResult !== null &&
        "scheduledFollowupDays" in intakeResult &&
        typeof (intakeResult as { scheduledFollowupDays: unknown }).scheduledFollowupDays ===
          "number"
          ? (intakeResult as { scheduledFollowupDays: number }).scheduledFollowupDays
          : 0;

      if (leadId && trimmedEmail.length > 0 && followupDelay === 0) {
        void fetch("/api/messaging-broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadName: trimmedName,
            emailAddress: trimmedEmail,
            phoneNumber: trimmedPhone || null,
          }),
        }).catch((broadcastError: unknown) => {
          console.error("[WELCOME_BROADCAST_TRIGGER_FAILURE]", {
            broadcastError,
          });
        });
      } else if (trimmedPhone.length > 0 || followupDelay === 0) {
        void fetch("/api/messaging-broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadName: trimmedName,
            emailAddress: trimmedEmail || null,
            phoneNumber: trimmedPhone || null,
          }),
        }).catch((broadcastError: unknown) => {
          console.error("[WELCOME_BROADCAST_TRIGGER_FAILURE]", { broadcastError });
        });
      }

      setBuyerName("");
      setPhoneContact("");
      setEmailContact("");
      setFollowupDelay(0);
      setPurchaseTimeline("1-3 Months");
      setIsFirstTime(false);
      setHasPreApproval(false);
      setManualNotes("");
      await fetchLeads();
      setActiveTab("pipeline");
      setStatusMessage(
        scheduledFollowupDays > 0 && trimmedEmail.length > 0
          ? `Buyer added. Follow-up scheduled in ${scheduledFollowupDays} day(s).`
          : "Buyer added.",
      );
    } catch (error: unknown) {
      console.error("[LEAD_CREATE_EXCEPTION]", { error });
      setStatusMessage("Failed to create lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLead = async () => {
    if (!selectedLead) return;

    setIsSaving(true);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/leads/${selectedLead.id}`, {
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
          notesText: selectedLead.raw_transcript ?? "",
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
            : "Failed to save buyer profile.";
        setStatusMessage(message);
        return;
      }

      const potentialBuyerIndex =
        typeof result === "object" &&
        result !== null &&
        "potentialBuyerIndex" in result &&
        typeof (result as { potentialBuyerIndex: unknown }).potentialBuyerIndex ===
          "number"
          ? (result as { potentialBuyerIndex: number }).potentialBuyerIndex
          : editPotentialIndex;

      const updatedLead: LeadRecord = {
        ...selectedLead,
        current_status: editStatus,
        target_budget: editBudget,
        is_first_time_buyer: editFirstTime,
        has_verified_pre_approval: editPreApproval,
        purchase_timeline: editTimeline,
        market_readiness_score: potentialBuyerIndex,
        ai_extracted_preferences: {
          ...selectedLead.ai_extracted_preferences,
          hurdle_lender: hurdleLender,
          hurdle_home_sale: hurdleHomeSale,
          hurdle_down_payment: hurdleDownPayment,
        },
      };

      setLeads((prev) =>
        prev.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)),
      );
      setSelectedLead(updatedLead);
      setIsMobileDrawerOpen(false);
      setStatusMessage("Saved.");
    } catch (error: unknown) {
      console.error("[LEAD_UPDATE_EXCEPTION]", { error });
      setStatusMessage("Failed to save buyer profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectLeadOnMobile = (lead: LeadRecord) => {
    setSelectedLead(lead);
    setIsMobileDrawerOpen(true);
  };

  const intakePanelClass =
    activeTab === "intake"
      ? "pointer-events-auto translate-x-0 opacity-100"
      : "pointer-events-none -translate-x-4 opacity-0";

  const pipelinePanelClass =
    activeTab === "pipeline"
      ? "pointer-events-auto translate-x-0 opacity-100"
      : "pointer-events-none translate-x-4 opacity-0";

  const analysisPanelClass =
    activeTab === "analysis"
      ? "pointer-events-auto translate-x-0 opacity-100"
      : "pointer-events-none translate-x-4 opacity-0";

  const handleGenerateMarketReport = () => {
    const zip = selectedZipCode.trim() || "75024";
    setGeneratedReportLink(
      `https://www.google.com/search?q=${encodeURIComponent(`DFW housing market report ${zip}`)}`,
    );
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#060813] font-sans text-[#F1F5F9] antialiased">
      <header className="z-20 flex flex-col items-center justify-between gap-4 border-b border-[#1E293B]/70 bg-[#0A0E1A]/90 px-4 py-4 shadow-xl sm:flex-row sm:px-6">
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
          <AppBrand variant="compact" />
          <Link
            href="/dashboard"
            className="rounded-lg border border-[#334155] px-2.5 py-1 text-[9px] font-bold tracking-wider text-slate-300 uppercase hover:text-white sm:hidden"
          >
            Exit
          </Link>
        </div>

        <div className="flex w-full rounded-xl border border-[#1E293B] bg-[#111726] p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab("intake");
              setStatusMessage(null);
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all duration-200 sm:flex-initial sm:px-6 ${
              activeTab === "intake"
                ? "bg-cyan-500 text-[#060813] shadow-lg shadow-cyan-500/20"
                : "text-[#64748B] hover:text-[#CBD5E1]"
            }`}
          >
            Intake
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("pipeline");
              setStatusMessage(null);
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all duration-200 sm:flex-initial sm:px-6 ${
              activeTab === "pipeline"
                ? "bg-cyan-500 text-[#060813] shadow-lg shadow-cyan-500/20"
                : "text-[#64748B] hover:text-[#CBD5E1]"
            }`}
          >
            Active Buyers ({leads.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("analysis");
              setStatusMessage(null);
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all duration-200 sm:flex-initial sm:px-6 ${
              activeTab === "analysis"
                ? "bg-cyan-500 text-[#060813] shadow-lg shadow-cyan-500/20"
                : "text-[#64748B] hover:text-[#CBD5E1]"
            }`}
          >
            Lead Analysis
          </button>
        </div>

        <Link
          href="/dashboard"
          className="hidden rounded-lg border border-[#334155] px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-300 uppercase hover:text-white sm:inline-block"
        >
          Exit
        </Link>
      </header>

      {statusMessage ? (
        <p
          className={`border-b px-4 py-2 text-center text-xs sm:px-6 ${
            statusMessage.toLowerCase().includes("failed") ||
            statusMessage.toLowerCase().includes("error")
              ? "border-red-900/50 bg-red-950/30 text-red-300"
              : "border-[#1E293B] bg-cyan-950/20 text-cyan-200"
          }`}
        >
          {statusMessage}
        </p>
      ) : null}

      <main className="relative flex-1 overflow-hidden">
        {/* Intake suite */}
        <div
          className={`absolute inset-0 overflow-y-auto p-4 transition-all duration-300 md:p-8 ${intakePanelClass}`}
        >
          <div className="relative mx-auto max-w-3xl rounded-2xl border border-[#1E293B]/60 bg-[#0B1120] p-6 shadow-2xl md:p-8">
            <div className="absolute top-0 left-0 h-[3px] w-full bg-gradient-to-r from-cyan-500 to-purple-600" />

            <div className="mb-6">
              <h2 className="text-lg font-black tracking-tight text-white">
                Onboard New Buyer
              </h2>
              <p className="mt-1 text-xs text-[#64748B]">
                Quick-tap intake optimized for desktop and mobile viewports.
              </p>
            </div>

            <form onSubmit={(e) => void handleCreateLead(e)} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    Buyer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g., John & Mary Smith"
                    className="w-full rounded-xl border border-[#1E293B] bg-[#070B16] p-3 text-sm text-white transition-colors focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    Source
                  </label>
                  <select
                    value={buyerSource}
                    onChange={(e) =>
                      setBuyerSource(parseLeadSourceOption(e.target.value))
                    }
                    className="w-full rounded-xl border border-[#1E293B] bg-[#070B16] p-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Referral">Referral</option>
                    <option value="Professional Network">Professional Network</option>
                    <option value="Open House">Open House</option>
                    <option value="Online Lead">Online Lead</option>
                    <option value="Past Client">Past Client</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    value={phoneContact}
                    onChange={(e) => setPhoneContact(e.target.value)}
                    placeholder="(214) 555-0192"
                    className="w-full rounded-xl border border-[#1E293B] bg-[#070B16] p-3 text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    value={emailContact}
                    onChange={(e) => setEmailContact(e.target.value)}
                    placeholder="smith.team@domain.com"
                    className="w-full rounded-xl border border-[#1E293B] bg-[#070B16] p-3 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-[#1E293B]/60 bg-[#070B16] p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    Max Budget
                  </label>
                  <span className="text-base font-black tracking-tight text-emerald-400">
                    {formatBudget(buyerBudget)}
                  </span>
                </div>
                <input
                  type="range"
                  min={150_000}
                  max={1_500_000}
                  step={50_000}
                  value={buyerBudget}
                  onChange={(e) => setBuyerBudget(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#1E293B] accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] font-medium tracking-wide text-[#475569]">
                  <span>$150K</span>
                  <span>$500K</span>
                  <span>$1.0M</span>
                  <span>$1.5M</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    First-Time Homebuyer?
                  </label>
                  <select
                    value={yesNoLabel(isFirstTime)}
                    onChange={(e) => setIsFirstTime(parseYesNoSelect(e.target.value))}
                    className={selectFieldClass}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    Verified Pre-Approval In-Hand?
                  </label>
                  <select
                    value={yesNoLabel(hasPreApproval)}
                    onChange={(e) => setHasPreApproval(parseYesNoSelect(e.target.value))}
                    className={selectFieldClass}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    Purchase Timeline
                  </label>
                  <select
                    value={purchaseTimeline}
                    onChange={(e) =>
                      setPurchaseTimeline(parsePurchaseTimeline(e.target.value))
                    }
                    className={selectFieldClass}
                  >
                    {PURCHASE_TIMELINES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-[#1E293B]/60 bg-[#070B16] p-4">
                <span className="mb-2 block text-[10px] font-bold tracking-wider text-[#64748B] uppercase">
                  Computed Urgency Indicator
                </span>
                <PotentialHudBadge score={intakePotentialIndex} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    Loan Type
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {INTAKE_LOAN_OPTIONS.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLoanType(type)}
                        className={`rounded-lg border py-2 text-[11px] font-bold transition-all ${
                          loanType === type
                            ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                            : "border-[#1E293B] bg-[#070B16] text-[#64748B]"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {INTAKE_STATUS_OPTIONS.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setInitialStatus(status)}
                        className={`rounded-lg border py-2 text-[11px] font-bold transition-all ${
                          initialStatus === status
                            ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                            : "border-[#1E293B] bg-[#070B16] text-[#64748B]"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    Follow-up
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {FOLLOWUP_DELAY_OPTIONS.map((item) => (
                      <button
                        key={item.days}
                        type="button"
                        onClick={() => setFollowupDelay(item.days)}
                        className={`rounded-lg border py-2 text-[11px] font-bold transition-all ${
                          followupDelay === item.days
                            ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                            : "border-[#1E293B] bg-[#070B16] text-[#64748B]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                  Discovery Notes
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g., Lease expiring soon, needs 4 beds in Plano."
                  className="w-full resize-none rounded-xl border border-[#1E293B] bg-[#070B16] p-3 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-cyan-500 py-4 text-xs font-black tracking-widest text-[#060813] uppercase shadow-[0_4px_25px_rgba(34,211,238,0.15)] transition-all hover:bg-cyan-600 disabled:bg-[#1E293B] disabled:text-slate-400"
              >
                {isSubmitting ? "Saving…" : "Add Buyer"}
              </button>
            </form>
          </div>
        </div>

        {/* Pipeline */}
        <div
          className={`absolute inset-0 flex flex-col transition-all duration-300 md:flex-row ${pipelinePanelClass}`}
        >
          {isMobileDrawerOpen ? (
            <button
              type="button"
              aria-label="Close inspector"
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setIsMobileDrawerOpen(false)}
            />
          ) : null}

          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
            {leads.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#1E293B] p-6 text-center">
                <h3 className="text-xs font-bold tracking-widest text-[#64748B] uppercase">
                  No active buyers
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("intake")}
                  className="mt-3 text-xs font-bold text-cyan-400 uppercase hover:text-cyan-300"
                >
                  Add buyer
                </button>
              </div>
            ) : (
              <>
                <div className="hidden overflow-hidden rounded-xl border border-[#1E293B]/60 bg-[#0B1120] shadow-2xl md:block">
                  <table className="min-w-full text-left text-xs">
                    <thead className="border-b border-[#1E293B] bg-[#111827] font-bold tracking-wider text-[#94A3B8] uppercase">
                      <tr>
                        <th className="px-6 py-4">Buyer</th>
                        <th className="px-6 py-4">Source</th>
                        <th className="px-6 py-4">Max Budget</th>
                        <th className="px-6 py-4">Potential Buyer Index</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]/50 bg-[#0B1120]/40 text-[#CBD5E1]">
                      {leads.map((lead) => {
                        const isSelected = selectedLead?.id === lead.id;
                        return (
                          <tr
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "border-l-2 border-cyan-400 bg-cyan-500/5 text-white"
                                : "hover:bg-[#1E293B]/40"
                            }`}
                          >
                            <td className="px-6 py-4 text-sm font-bold text-white">
                              {lead.lead_name}
                            </td>
                            <td className="px-6 py-4 font-medium text-[#64748B]">
                              {lead.lead_source}
                            </td>
                            <td className="px-6 py-4 font-extrabold text-emerald-400">
                              {formatBudget(lead.target_budget)}
                            </td>
                            <td className="px-6 py-4">
                              <PotentialHudBadge score={lead.market_readiness_score} />
                            </td>
                            <td className="px-6 py-4">
                              <span className="rounded-full border border-cyan-500/20 bg-[#1E293B] px-3 py-1 text-[10px] font-bold tracking-wide text-cyan-400 uppercase">
                                {lead.current_status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 md:hidden">
                  {leads.map((lead) => {
                    const isSelected = selectedLead?.id === lead.id;
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => selectLeadOnMobile(lead)}
                        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-cyan-500 bg-[#0B1120] shadow-md shadow-cyan-500/5"
                            : "border-[#1E293B] bg-[#0B1120]"
                        }`}
                      >
                        <div>
                          <h4 className="text-sm font-extrabold text-white">
                            {lead.lead_name}
                          </h4>
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-medium text-[#64748B]">
                            <span>{lead.lead_source}</span>
                            <span>•</span>
                            <span className="font-bold text-emerald-400">
                              {formatBudget(lead.target_budget)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <PotentialHudBadge score={lead.market_readiness_score} />
                          <span className="inline-block rounded-lg border border-[#334155] bg-[#1E293B] px-2.5 py-1 text-[9px] font-extrabold tracking-wider text-slate-300 uppercase">
                            {lead.current_status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <aside
            className={`fixed top-0 right-0 z-50 flex h-full w-full flex-col justify-between overflow-y-auto border-l border-[#1E293B] bg-[#0A0E1A] p-6 transition-transform duration-300 md:static md:w-[440px] md:translate-x-0 md:p-8 ${
              isMobileDrawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {selectedLead ? (
              <div className="flex h-full flex-col justify-between space-y-6">
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
                  <div>
                    <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase">
                      Buyer Profile
                    </span>
                    <h2 className="mt-0.5 text-lg font-black tracking-tight text-white">
                      {selectedLead.lead_name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="rounded-xl border border-[#334155] bg-[#1E293B] px-3 py-1.5 text-xs font-bold text-white md:hidden"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    AI Summary
                  </h3>
                  <div className="rounded-xl border border-purple-900/30 bg-purple-950/20 p-4 text-xs leading-relaxed text-purple-200">
                    {selectedLead.ai_summary ??
                      "—"}
                  </div>
                </div>

                {selectedLead.ai_next_best_action ? (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-xs text-cyan-100">
                    <span className="mb-1 block font-bold tracking-wide text-cyan-400 uppercase">
                      Next Step
                    </span>
                    {selectedLead.ai_next_best_action}
                  </div>
                ) : null}

                <div className="rounded-xl border border-[#1E293B]/60 bg-[#070B16] p-4 text-center">
                  <span className="block text-[9px] font-bold tracking-wide text-[#64748B] uppercase">
                    Potential Buyer Index
                  </span>
                  <div className="mt-2 flex justify-center">
                    <PotentialHudBadge score={editPotentialIndex} />
                  </div>
                </div>

                <div className="space-y-2.5 rounded-xl border border-[#1E293B] bg-[#0B1120] p-4">
                  <div>
                    <h4 className="text-xs font-black tracking-wide text-purple-400 uppercase">
                      Active Roadblocks
                    </h4>
                    <p className="text-[10px] text-[#475569]">
                      Check blockages to recalculate potential on save.
                    </p>
                  </div>
                  {[
                    {
                      active: hurdleLender,
                      toggle: () => setHurdleLender((v) => !v),
                      label: "Lacks verified lender pre-approval",
                    },
                    {
                      active: hurdleHomeSale,
                      toggle: () => setHurdleHomeSale((v) => !v),
                      label: "Contingent on selling current home",
                    },
                    {
                      active: hurdleDownPayment,
                      toggle: () => setHurdleDownPayment((v) => !v),
                      label: "Insufficient down payment sourced",
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.toggle}
                      className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-xs font-bold transition-all ${
                        item.active
                          ? "border-red-500/50 bg-red-950/20 text-red-400"
                          : "border-[#1E293B] bg-[#070B16] text-[#94A3B8]"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border text-[9px] ${
                          item.active
                            ? "border-red-400 bg-red-500 text-white"
                            : "border-[#1E293B]"
                        }`}
                      >
                        {item.active ? "×" : ""}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-4 rounded-xl border border-[#1E293B] bg-[#0B1120] p-4">
                  <h4 className="text-xs font-black tracking-wider text-cyan-400 uppercase">
                    Edit Buyer Profile
                  </h4>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-[#64748B]">
                      Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as LeadStatus)}
                      className={selectFieldClass}
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-[#64748B]">
                      Max Budget ($)
                    </label>
                    <input
                      type="number"
                      value={editBudget}
                      onChange={(e) => setEditBudget(Number(e.target.value))}
                      className="w-full rounded-lg border border-[#1E293B] bg-[#070B16] p-3 text-xs font-bold text-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-[#64748B]">
                      First-Time Homebuyer?
                    </label>
                    <select
                      value={yesNoLabel(editFirstTime)}
                      onChange={(e) => setEditFirstTime(parseYesNoSelect(e.target.value))}
                      className={selectFieldClass}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-[#64748B]">
                      Verified Pre-Approval In-Hand?
                    </label>
                    <select
                      value={yesNoLabel(editPreApproval)}
                      onChange={(e) => setEditPreApproval(parseYesNoSelect(e.target.value))}
                      className={selectFieldClass}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-[#64748B]">
                      Purchase Timeline
                    </label>
                    <select
                      value={editTimeline}
                      onChange={(e) =>
                        setEditTimeline(parsePurchaseTimeline(e.target.value))
                      }
                      className={selectFieldClass}
                    >
                      {PURCHASE_TIMELINES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleUpdateLead()}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] py-3 text-xs font-bold text-white uppercase transition-all hover:bg-cyan-500 hover:text-[#060813] disabled:opacity-60"
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold tracking-wide text-[#94A3B8] uppercase">
                    Buyer Details
                  </h3>
                  <div className="space-y-3 rounded-xl border border-[#1E293B] bg-[#0B1120] p-4 text-xs text-[#CBD5E1]">
                    <div className="flex justify-between border-b border-[#1E293B]/50 pb-2">
                      <span className="text-[#64748B]">Loan Type</span>
                      <span className="font-extrabold text-cyan-400 uppercase">
                        {selectedLead.ai_extracted_preferences.loan_type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Areas</span>
                      <span className="max-w-[55%] text-right font-bold text-white">
                        {selectedLead.ai_extracted_preferences.target_neighborhoods
                          .length > 0
                          ? selectedLead.ai_extracted_preferences.target_neighborhoods.join(
                              ", ",
                            )
                          : "DFW Metropolitan"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Index Score</span>
                      <span className="font-bold text-cyan-400">
                        {selectedLead.market_readiness_score}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="my-auto text-center text-xs font-medium tracking-widest text-[#475569] uppercase">
                Select a buyer.
              </p>
            )}
          </aside>
        </div>

        <div
          className={`absolute inset-0 overflow-y-auto transition-all duration-300 ${analysisPanelClass}`}
        >
          <LeadAnalysisView
            leads={leads}
            selectedZipCode={selectedZipCode}
            onZipCodeChange={setSelectedZipCode}
            generatedReportLink={generatedReportLink}
            onGenerateReport={handleGenerateMarketReport}
          />
        </div>
      </main>
    </div>
  );
}
