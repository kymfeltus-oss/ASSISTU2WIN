"use client";

import {
  computeMobileLeadScore,
  FINANCING_OPTIONS,
  ROADBLOCK_OPTIONS,
  URGENCY_OPTIONS,
  type MobileFinancing,
  type MobileRoadblock,
  type MobileUrgency,
} from "@/lib/leads/mobile-intake-score";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/leads/types";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

const MOBILE_LEAD_SOURCE = "Mobile Quick Intake";

type SubmitStatus = "idle" | "loading" | "success" | "error";

type MobileIntakeFormState = {
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly targetZipCode: string;
  readonly budget: string;
  readonly financing: MobileFinancing;
  readonly urgency: MobileUrgency;
  readonly milestone: LeadStatus;
  readonly isFirstTimeBuyer: boolean;
  readonly hasVerifiedPreApproval: boolean;
  readonly selectedRoadblocks: readonly MobileRoadblock[];
};

const INITIAL_FORM: MobileIntakeFormState = {
  name: "",
  phone: "",
  email: "",
  targetZipCode: "",
  budget: "",
  financing: "Conventional",
  urgency: "Medium",
  milestone: "New Lead",
  isFirstTimeBuyer: false,
  hasVerifiedPreApproval: false,
  selectedRoadblocks: [],
};

const microLabelClass =
  "text-xs font-semibold uppercase tracking-wider text-slate-400";

const fieldClassName =
  "min-h-11 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20";

function mapUrgencyToPurchaseTimeline(urgency: MobileUrgency): string {
  switch (urgency) {
    case "High":
      return "Immediate (Under 30 Days)";
    case "Medium":
      return "1-3 Months";
    case "Low":
      return "Just Browsing";
    default:
      return "1-3 Months";
  }
}

function buildMobileIntakePreferences(
  form: MobileIntakeFormState,
): Record<string, unknown> {
  const zip = form.targetZipCode.trim();
  return {
    loan_type: form.financing,
    target_neighborhoods: zip.length > 0 ? [zip] : [],
    min_bedrooms: null,
    pre_approval_status: form.hasVerifiedPreApproval ? "Verified" : null,
    hurdle_lender: form.selectedRoadblocks.includes("Credit repair needed"),
    hurdle_home_sale: form.selectedRoadblocks.includes(
      "Must sell current home first",
    ),
    hurdle_down_payment: false,
  };
}

type PillOptionProps<T extends string> = {
  readonly options: readonly T[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly columns?: 2 | 3;
  readonly compact?: boolean;
};

function PillSelector<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
  compact = false,
}: PillOptionProps<T>) {
  return (
    <div
      className={cn(
        "grid gap-2 rounded-xl border border-slate-800/80 bg-slate-900/60 p-2",
        columns === 2 ? "grid-cols-2" : "grid-cols-3",
      )}
    >
      {options.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-lg border px-2 py-2.5 text-center font-medium transition-all duration-200 active:scale-[0.98]",
              compact ? "text-[11px] leading-tight" : "text-xs sm:text-sm",
              isActive
                ? "border-emerald-500/50 bg-emerald-600/20 text-emerald-400 shadow-[0_0_20px_-6px_rgba(16,185,129,0.45)]"
                : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-600 hover:text-slate-200",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

type ToggleSwitchProps = {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
};

function ToggleSwitch({ id, label, checked, onChange }: ToggleSwitchProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 transition hover:border-slate-700"
    >
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-slate-700 bg-slate-950 transition peer-checked:border-emerald-500/50 peer-checked:bg-emerald-600/30"
        />
        <span
          aria-hidden
          className="pointer-events-none relative ml-1 h-5 w-5 rounded-full bg-slate-500 shadow transition-all duration-200 peer-checked:translate-x-5 peer-checked:bg-emerald-400"
        />
      </span>
    </label>
  );
}

export function MobileIntakeForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const leadScore = useMemo(
    () =>
      computeMobileLeadScore({
        financing: form.financing,
        urgency: form.urgency,
        selectedRoadblocks: form.selectedRoadblocks,
      }),
    [form.financing, form.urgency, form.selectedRoadblocks],
  );

  const toggleRoadblock = (roadblock: MobileRoadblock) => {
    setForm((current) => {
      const isSelected = current.selectedRoadblocks.includes(roadblock);
      return {
        ...current,
        selectedRoadblocks: isSelected
          ? current.selectedRoadblocks.filter((item) => item !== roadblock)
          : [...current.selectedRoadblocks, roadblock],
      };
    });
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setStatus("error");
      setErrorMessage("Lead / Client Name is required.");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user?.id) {
        setStatus("error");
        setErrorMessage("Sign in required to save a lead.");
        return;
      }

      const parsedBudget = form.budget.trim()
        ? Number.parseFloat(form.budget.replace(/,/g, ""))
        : null;

      if (form.budget.trim() && (parsedBudget === null || Number.isNaN(parsedBudget))) {
        setStatus("error");
        setErrorMessage("Enter a valid target budget.");
        return;
      }

      const roadblockSummary =
        form.selectedRoadblocks.length > 0
          ? `Mobile intake roadblocks: ${form.selectedRoadblocks.join("; ")}`
          : null;

      const { error: insertError } = await supabase.from("leads").insert({
        profile_id: user.id,
        lead_name: trimmedName,
        lead_source: MOBILE_LEAD_SOURCE,
        phone_number: form.phone.trim() || null,
        email_address: form.email.trim() || null,
        target_budget: parsedBudget,
        loan_type: form.financing,
        purchase_timeline: mapUrgencyToPurchaseTimeline(form.urgency),
        current_status: form.milestone,
        market_readiness_score: leadScore,
        is_ai_parsed: false,
        is_first_time_buyer: form.isFirstTimeBuyer,
        has_verified_pre_approval: form.hasVerifiedPreApproval,
        ai_extracted_preferences: buildMobileIntakePreferences(form),
        ai_summary: roadblockSummary,
      });

      if (insertError) {
        console.error("[MOBILE_INTAKE_INSERT]", { message: insertError.message });
        setStatus("error");
        setErrorMessage(insertError.message || "Unable to save lead.");
        return;
      }

      setStatus("success");
      resetForm();

      window.setTimeout(() => {
        setStatus("idle");
      }, 2200);
    } catch (error: unknown) {
      console.error("[MOBILE_INTAKE_EXCEPTION]", { error });
      setStatus("error");
      setErrorMessage("Unexpected error saving lead.");
    }
  };

  const isSubmitting = status === "loading";
  const isSuccess = status === "success";

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex w-full flex-col gap-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800/60 pb-4">
        <div className="space-y-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-cyan-400/80">
            Intake console
          </p>
          <h2 className="text-base font-semibold text-white sm:text-lg">
            Capture active buyer
          </h2>
        </div>
        <div className="rounded-full border border-emerald-500/30 bg-emerald-600/10 px-3 py-1.5 text-center">
          <p className={microLabelClass}>Potential index</p>
          <p className="text-lg font-bold tabular-nums text-emerald-400">{leadScore}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label className={microLabelClass} htmlFor="mobile-intake-name">
            Lead / Client Name
          </label>
          <input
            id="mobile-intake-name"
            type="text"
            required
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            className={fieldClassName}
            autoComplete="name"
            placeholder="John & Mary Smith"
          />
        </div>

        <div className="space-y-2">
          <label className={microLabelClass} htmlFor="mobile-intake-phone">
            Phone
          </label>
          <input
            id="mobile-intake-phone"
            type="tel"
            value={form.phone}
            onChange={(event) =>
              setForm((current) => ({ ...current, phone: event.target.value }))
            }
            className={fieldClassName}
            autoComplete="tel"
            placeholder="(555) 555-0100"
          />
        </div>

        <div className="space-y-2">
          <label className={microLabelClass} htmlFor="mobile-intake-email">
            Email
          </label>
          <input
            id="mobile-intake-email"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            className={fieldClassName}
            autoComplete="email"
            placeholder="buyer@email.com"
          />
        </div>

        <div className="space-y-2">
          <label className={microLabelClass} htmlFor="mobile-intake-zip">
            Target ZIP
          </label>
          <input
            id="mobile-intake-zip"
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={form.targetZipCode}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                targetZipCode: event.target.value.replace(/\D/g, "").slice(0, 5),
              }))
            }
            className={fieldClassName}
            placeholder="75024"
          />
        </div>
      </div>

      <div className="w-full space-y-2">
        <label className={microLabelClass} htmlFor="mobile-intake-budget">
          Target Budget / Price Range
        </label>
        <input
          id="mobile-intake-budget"
          type="text"
          inputMode="decimal"
          value={form.budget}
          onChange={(event) =>
            setForm((current) => ({ ...current, budget: event.target.value }))
          }
          className={fieldClassName}
          placeholder="450000"
        />
      </div>

      <div className="w-full space-y-2">
        <span className={microLabelClass}>Loan type</span>
        <PillSelector
          options={FINANCING_OPTIONS}
          value={form.financing}
          onChange={(financing) =>
            setForm((current) => ({ ...current, financing }))
          }
        />
      </div>

      <div className="w-full space-y-2">
        <span className={microLabelClass}>Timeline urgency</span>
        <PillSelector
          options={URGENCY_OPTIONS}
          value={form.urgency}
          onChange={(urgency) => setForm((current) => ({ ...current, urgency }))}
        />
      </div>

      <div className="w-full space-y-2">
        <span className={microLabelClass}>Pipeline milestone</span>
        <PillSelector
          options={LEAD_STATUSES}
          value={form.milestone}
          onChange={(milestone) =>
            setForm((current) => ({ ...current, milestone }))
          }
          columns={2}
          compact
        />
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        <ToggleSwitch
          id="mobile-intake-ftb"
          label="First-time homebuyer"
          checked={form.isFirstTimeBuyer}
          onChange={(isFirstTimeBuyer) =>
            setForm((current) => ({ ...current, isFirstTimeBuyer }))
          }
        />
        <ToggleSwitch
          id="mobile-intake-pre"
          label="Verified pre-approval"
          checked={form.hasVerifiedPreApproval}
          onChange={(hasVerifiedPreApproval) =>
            setForm((current) => ({ ...current, hasVerifiedPreApproval }))
          }
        />
      </div>

      <fieldset className="w-full space-y-2">
        <legend className={microLabelClass}>Roadblocks</legend>
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
          {ROADBLOCK_OPTIONS.map((roadblock) => {
            const isSelected = form.selectedRoadblocks.includes(roadblock);
            return (
              <button
                key={roadblock}
                type="button"
                onClick={() => toggleRoadblock(roadblock)}
                className={cn(
                  "rounded-full border px-3 py-2 text-left text-xs font-medium leading-snug transition-all duration-200 active:scale-[0.98] sm:text-sm",
                  isSelected
                    ? "border-emerald-500/50 bg-emerald-600/20 text-emerald-300"
                    : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-600 hover:text-slate-200",
                )}
              >
                {roadblock}
              </button>
            );
          })}
        </div>
      </fieldset>

      {errorMessage ? (
        <p className="text-sm text-rose-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isSuccess ? (
        <p className="text-center text-sm font-medium text-emerald-400" role="status">
          Lead saved — ready for the next buyer.
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-1 border-t border-slate-800/60 bg-slate-950/80 pt-4 backdrop-blur-md">
        <button
          type="submit"
          disabled={isSubmitting || !form.name.trim()}
          className={cn(
            "relative flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-semibold text-white transition-all duration-200",
            "disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500",
            isSubmitting || isSuccess
              ? "bg-emerald-700"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99]",
            isSubmitting && "animate-pulse",
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Saving file…
            </>
          ) : isSuccess ? (
            "Saved to pipeline"
          ) : (
            "Save active buyer"
          )}
          {!isSubmitting && !isSuccess ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-60"
            />
          ) : null}
        </button>
      </div>
    </form>
  );
}
