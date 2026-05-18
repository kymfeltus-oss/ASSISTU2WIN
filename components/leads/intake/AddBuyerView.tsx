"use client";

import { useLeads } from "@/components/leads/LeadsProvider";
import {
  AdminIntakeExtendedFields,
  createEmptyAdminIntakeExtendedState,
} from "@/components/leads/intake/AdminIntakeExtendedFields";
import { AdminIntakeSidePanel } from "@/components/leads/intake/AdminIntakeSidePanel";
import { adminIntakeTheme } from "@/components/leads/intake/admin-intake-theme";
import {
  IntakeChip,
  IntakeField,
  IntakeSelect,
  IntakeTextarea,
  IntakeTwoCol,
} from "@/components/leads/intake/admin-intake-ui";
import {
  computePotentialBuyerIndex,
  PURCHASE_TIMELINES,
  parsePurchaseTimeline,
  type PurchaseTimeline,
} from "@/lib/leads/potential-index";
import { adminIntakeFormToRequestBody } from "@/lib/leads/admin-intake-fields";
import { formatUsPhoneInput, usPhoneDigitsOnly } from "@/lib/format/us-phone";
import { formatProperWordsInput } from "@/lib/format/proper-text";
import {
  hasVerifiedPreApprovalForIntakeStatus,
  INTAKE_PIPELINE_STATUS_OPTIONS,
  shouldDefaultLoanTypeToCash,
  type IntakePipelineStatus,
} from "@/lib/leads/intake-pipeline-status";
import type { LoanType } from "@/lib/leads/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type IntakeLoan = Extract<LoanType, "Conventional" | "FHA" | "Cash">;

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
  const { refreshLeads, setStatusMessage, statusMessage } = useLeads();
  const [buyerName, setBuyerName] = useState("");
  const [buyerSource, setBuyerSource] = useState<(typeof SOURCES)[number]>("Referral");
  const [buyerBudget, setBuyerBudget] = useState(450_000);
  const [loanType, setLoanType] = useState<IntakeLoan>("Conventional");
  const [initialStatus, setInitialStatus] =
    useState<IntakePipelineStatus>("No Pre-Approval");
  const [phoneContact, setPhoneContact] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [purchaseTimeline, setPurchaseTimeline] =
    useState<PurchaseTimeline>("1-3 Months");
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [hasPreApproval, setHasPreApproval] = useState(false);
  const [manualNotes, setManualNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [extended, setExtended] = useState(createEmptyAdminIntakeExtendedState);

  useEffect(() => {
    setHasPreApproval(hasVerifiedPreApprovalForIntakeStatus(initialStatus));
    if (shouldDefaultLoanTypeToCash(initialStatus)) {
      setLoanType("Cash");
    }
  }, [initialStatus]);

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
          leadName: formatProperWordsInput(trimmedName),
          leadSource: buyerSource,
          targetBudget: buyerBudget,
          currentStatus: initialStatus,
          phoneNumber: (() => {
            const digits = usPhoneDigitsOnly(phoneContact);
            return digits.length > 0 ? formatUsPhoneInput(digits) : null;
          })(),
          emailAddress: emailContact.trim() || null,
          loanType,
          followupDelayDays: 0,
          isFirstTimeBuyer: isFirstTime,
          hasVerifiedPreApproval:
            hasPreApproval || hasVerifiedPreApprovalForIntakeStatus(initialStatus),
          purchaseTimeline,
          manualNotes: manualNotes.trim() || null,
          ...adminIntakeFormToRequestBody(extended),
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
    <div className={`${adminIntakeTheme.shell} ${adminIntakeTheme.page}`}>
      <header className="mb-3 min-w-0">
        <p className={adminIntakeTheme.sectionTitle}>Lead intake</p>
        <h1 className={`mt-0.5 ${adminIntakeTheme.pageTitle}`}>Add New Lead</h1>
      </header>

      {statusMessage ? (
        <p
          className="mb-3 rounded-xl border border-[#18E28F]/30 bg-[rgba(24,226,143,0.08)] px-3 py-2 text-xs text-[#9CF0C8]"
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}

      <div className={adminIntakeTheme.layoutGrid}>
        <form onSubmit={(e) => void handleSubmit(e)} className={adminIntakeTheme.formStack}>
          {localError ? <p className={adminIntakeTheme.error}>{localError}</p> : null}

          <section className={adminIntakeTheme.featured}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p
                className={`text-[10px] font-bold tracking-[0.18em] uppercase ${adminIntakeTheme.accentCyan}`}
              >
                Primary buyer file
              </p>
              <MobileScore readiness={readiness} />
            </div>

            <IntakeTwoCol>
              <IntakeField
                label="Lead / Client Name"
                value={buyerName}
                onChange={setBuyerName}
                wordFormat="proper-words"
                required
                className="sm:col-span-2"
              />
              <IntakeSelect label="Lead source" value={buyerSource} onChange={(v) => setBuyerSource(v as (typeof SOURCES)[number])}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </IntakeSelect>
              <IntakeSelect
                label="Pipeline status"
                value={initialStatus}
                onChange={(v) => setInitialStatus(v as IntakePipelineStatus)}
              >
                {INTAKE_PIPELINE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </IntakeSelect>
              <IntakeField
                label="Phone"
                type="tel"
                value={phoneContact}
                onChange={setPhoneContact}
                wordFormat="phone"
                placeholder="555-555-0100"
              />
              <IntakeField
                label="Email"
                type="email"
                value={emailContact}
                onChange={setEmailContact}
                wordFormat="email"
              />
            </IntakeTwoCol>

            <div className={`${adminIntakeTheme.innerWell} mt-3`}>
              <div className="flex items-center justify-between gap-2">
                <span className={adminIntakeTheme.label}>Max budget</span>
                <span className={`text-sm font-bold tabular-nums ${adminIntakeTheme.accentGreen}`}>
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
                className="mt-2.5 w-full accent-[#00F2FE]"
                aria-label="Max budget"
              />
            </div>

            <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
              <LoanBlock loanType={loanType} onSelect={setLoanType} />
              <IntakeSelect
                label="Purchase timeline"
                value={purchaseTimeline}
                onChange={(v) => setPurchaseTimeline(parsePurchaseTimeline(v))}
              >
                {PURCHASE_TIMELINES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </IntakeSelect>
            </div>

            <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
              <IntakeChip
                label="First-time buyer"
                active={isFirstTime}
                onClick={() => setIsFirstTime((v) => !v)}
              />
              <IntakeChip
                label="Verified pre-approval"
                active={hasPreApproval}
                onClick={() => setHasPreApproval((v) => !v)}
              />
            </div>

            <IntakeTextarea
              label="Latest touchpoint / conversation log"
              value={manualNotes}
              onChange={setManualNotes}
              wordFormat="sentence"
              placeholder="Lease end, relocation, schools, lender notes…"
              className="mt-3"
            />
          </section>

          <AdminIntakeExtendedFields
            state={extended}
            showLeadSourceOther={buyerSource === "Other"}
            onChange={(patch) => setExtended((current) => ({ ...current, ...patch }))}
            onCommunicationToggle={(key, enabled) =>
              setExtended((current) => ({
                ...current,
                communicationPreferences: {
                  ...current.communicationPreferences,
                  [key]: enabled,
                },
              }))
            }
          />

          <button type="submit" disabled={isSubmitting} className={adminIntakeTheme.btnPrimary}>
            {isSubmitting ? "Adding…" : "Add to pipeline"}
          </button>
        </form>

        <AdminIntakeSidePanel
          readiness={readiness}
          buyerName={buyerName}
          loanType={loanType}
          purchaseTimeline={purchaseTimeline}
          hasPreApproval={hasPreApproval}
        />
      </div>
    </div>
  );
}

function MobileScore({ readiness }: { readonly readiness: number }) {
  return (
    <div className="hidden shrink-0 sm:block lg:hidden">
      <p className={`text-lg font-bold tabular-nums ${adminIntakeTheme.accentCyan}`}>
        {readiness}%
      </p>
      <p className={`text-[9px] uppercase tracking-wide ${adminIntakeTheme.sectionSubtitle}`}>
        Buyer index
      </p>
    </div>
  );
}

function LoanBlock({
  loanType,
  onSelect,
}: {
  readonly loanType: IntakeLoan;
  readonly onSelect: (value: IntakeLoan) => void;
}) {
  return (
    <div className="min-w-0">
      <span className={adminIntakeTheme.label}>Loan type</span>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {(["Conventional", "FHA", "Cash"] as const).map((t) => (
          <IntakeChip key={t} label={t} active={loanType === t} onClick={() => onSelect(t)} />
        ))}
      </div>
    </div>
  );
}
