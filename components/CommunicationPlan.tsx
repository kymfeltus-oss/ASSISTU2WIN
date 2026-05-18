"use client";

import {
  communicationPlanToDbUpdate,
  COMMUNICATION_CHANNELS,
  type CommunicationPlanData,
} from "@/lib/leads/communication-plan";
import type { LeadCommunicationPreferences } from "@/lib/leads/admin-intake-fields";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

type CommunicationPlanProps = {
  readonly leadId: string;
  readonly initialData: CommunicationPlanData;
  readonly onSaved?: (data: CommunicationPlanData) => void;
};

type PreferenceToggleKey = keyof Pick<
  LeadCommunicationPreferences,
  | "buyer_consultation_invite_enabled"
  | "pre_approval_reminder_enabled"
  | "market_update_email_enabled"
>;

const PREFERENCE_TOGGLES: readonly {
  readonly key: PreferenceToggleKey;
  readonly label: string;
}[] = [
  { key: "buyer_consultation_invite_enabled", label: "Consultation invite" },
  { key: "pre_approval_reminder_enabled", label: "Eligibility reminder" },
  { key: "market_update_email_enabled", label: "Market update email" },
] as const;

function AssistU2WinToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked
          ? "border-cyan-500/40 bg-cyan-500/10 hover:border-cyan-400/55"
          : "border-slate-700 bg-slate-900/60 hover:border-slate-600"
      }`}
    >
      <span className="text-xs font-medium text-slate-100">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-cyan-500" : "bg-slate-700"
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export default function CommunicationPlan({
  leadId,
  initialData,
  onSaved,
}: CommunicationPlanProps) {
  const supabase = createClient();
  const [settings, setSettings] = useState<CommunicationPlanData>(initialData);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(settings);

  useEffect(() => {
    setSettings(initialData);
    latestRef.current = initialData;
  }, [initialData, leadId]);

  useEffect(() => {
    latestRef.current = settings;
  }, [settings]);

  const persist = useCallback(
    async (next: CommunicationPlanData) => {
      setSaving(true);
      setErrorMessage(null);

      try {
        const { error } = await supabase
          .from("leads")
          .update(communicationPlanToDbUpdate(next))
          .eq("id", leadId);

        if (error) {
          console.error("[COMMUNICATION_PLAN_UPDATE]", {
            leadId,
            message: error.message,
          });
          setErrorMessage("Unable to save communication plan.");
          return;
        }

        onSaved?.(next);
      } catch (error: unknown) {
        console.error("[COMMUNICATION_PLAN_UPDATE_EXCEPTION]", { leadId, error });
        setErrorMessage("Unable to save communication plan.");
      } finally {
        setSaving(false);
      }
    },
    [leadId, onSaved, supabase],
  );

  const applyChange = useCallback(
    (next: CommunicationPlanData, immediate: boolean) => {
      setSettings(next);
      latestRef.current = next;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      if (immediate) {
        void persist(next);
        return;
      }

      debounceRef.current = setTimeout(() => {
        void persist(next);
      }, 500);
    },
    [persist],
  );

  const patch = useCallback(
    (partial: Partial<CommunicationPlanData>, immediate = false) => {
      applyChange({ ...latestRef.current, ...partial }, immediate);
    },
    [applyChange],
  );

  const patchPreference = useCallback(
    (key: PreferenceToggleKey, checked: boolean) => {
      applyChange(
        {
          ...latestRef.current,
          communicationPreferences: {
            ...latestRef.current.communicationPreferences,
            [key]: checked,
          },
        },
        true,
      );
    },
    [applyChange],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="min-w-0 max-w-2xl rounded-2xl border border-slate-700/80 bg-[#0f172a] p-4 shadow-lg sm:p-5">
      <header className="mb-4 border-b border-slate-700/60 pb-3">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
          AssistU2Win
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-100">Communication Plan</h2>
        <p className="mt-1 text-xs text-slate-400">
          Outreach toggles save to this lead immediately.
        </p>
      </header>

      <div className="space-y-4">
        <label className="block min-w-0">
          <span className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Preferred channel
          </span>
          <select
            value={settings.preferredCommunicationChannel}
            disabled={saving}
            onChange={(event) => {
              const channel = event.target.value;
              patch(
                {
                  preferredCommunicationChannel: COMMUNICATION_CHANNELS.includes(
                    channel as (typeof COMMUNICATION_CHANNELS)[number],
                  )
                    ? (channel as CommunicationPlanData["preferredCommunicationChannel"])
                    : "Text",
                },
                true,
              );
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/50"
          >
            {COMMUNICATION_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
        </label>

        <label className="block min-w-0">
          <span className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Contact window
          </span>
          <input
            type="text"
            value={settings.preferredContactWindow}
            disabled={saving}
            placeholder="Morning, evenings…"
            onChange={(event) => patch({ preferredContactWindow: event.target.value }, false)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-500/50"
          />
        </label>

        <div className="space-y-2">
          <AssistU2WinToggle
            label="Welcome email"
            checked={settings.welcomeEmailEnabled}
            disabled={saving}
            onChange={(checked) => patch({ welcomeEmailEnabled: checked }, true)}
          />
          <AssistU2WinToggle
            label="Representation agreement"
            checked={settings.repAgreementPending}
            disabled={saving}
            onChange={(checked) => patch({ repAgreementPending: checked }, true)}
          />
          {PREFERENCE_TOGGLES.map((toggle) => (
            <AssistU2WinToggle
              key={toggle.key}
              label={toggle.label}
              checked={settings.communicationPreferences[toggle.key]}
              disabled={saving}
              onChange={(checked) => patchPreference(toggle.key, checked)}
            />
          ))}
        </div>

        <label className="block min-w-0">
          <span className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Latest touchpoint / conversation log
          </span>
          <textarea
            value={settings.customCommunicationNotes}
            disabled={saving}
            rows={3}
            onChange={(event) =>
              patch({ customCommunicationNotes: event.target.value }, false)
            }
            className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-500/50"
          />
        </label>
      </div>

      {saving ? (
        <p className="mt-3 text-[11px] text-slate-500" aria-live="polite">
          Saving…
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
