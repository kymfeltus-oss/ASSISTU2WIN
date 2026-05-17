"use client";

import { spatial } from "@/components/leads/spatial/spatial-styles";
import type { LeadCommunicationPreferences } from "@/lib/leads/admin-intake-fields";
import { EMPTY_COMMUNICATION_PREFERENCES } from "@/lib/leads/admin-intake-fields";
import type { ReactNode } from "react";

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white focus:border-cyan-400/40 focus:outline-none";

const SECTION_CLASS = "space-y-4 rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/[0.06]";

export type AdminIntakeExtendedFormState = {
  readonly coBuyerName: string;
  readonly coBuyerEmail: string;
  readonly coBuyerPhone: string;
  readonly coBuyerRelationship: string;
  readonly leadSourceOther: string;
  readonly streetAddress: string;
  readonly city: string;
  readonly state: string;
  readonly zipCode: string;
  readonly currentHousingStatus: string;
  readonly dtiRatio: string;
  readonly creditScoreRange: string;
  readonly downPaymentAmount: string;
  readonly monthlyPaymentComfort: string;
  readonly employmentStatus: string;
  readonly lenderName: string;
  readonly welcomeEmailEnabled: boolean;
  readonly followUpFrequency: string;
  readonly firstFollowUpDate: string;
  readonly preferredCommunicationChannel: string;
  readonly preferredContactWindow: string;
  readonly customCommunicationNotes: string;
  readonly communicationPreferences: LeadCommunicationPreferences;
};

export function createEmptyAdminIntakeExtendedState(): AdminIntakeExtendedFormState {
  return {
    coBuyerName: "",
    coBuyerEmail: "",
    coBuyerPhone: "",
    coBuyerRelationship: "",
    leadSourceOther: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    currentHousingStatus: "",
    dtiRatio: "",
    creditScoreRange: "",
    downPaymentAmount: "",
    monthlyPaymentComfort: "",
    employmentStatus: "",
    lenderName: "",
    welcomeEmailEnabled: false,
    followUpFrequency: "",
    firstFollowUpDate: "",
    preferredCommunicationChannel: "Text",
    preferredContactWindow: "",
    customCommunicationNotes: "",
    communicationPreferences: { ...EMPTY_COMMUNICATION_PREFERENCES },
  };
}

type Props = {
  readonly state: AdminIntakeExtendedFormState;
  readonly showLeadSourceOther: boolean;
  readonly onChange: (patch: Partial<AdminIntakeExtendedFormState>) => void;
  readonly onCommunicationToggle: (
    key: keyof LeadCommunicationPreferences,
    enabled: boolean,
  ) => void;
};

function TwoColGrid({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: string;
  readonly placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={spatial.label}>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
      />
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white/[0.02] px-3 py-2 ring-1 ring-white/[0.06]">
      <span className="text-xs text-slate-300">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-cyan-400"
      />
    </label>
  );
}

export function AdminIntakeExtendedFields({
  state,
  showLeadSourceOther,
  onChange,
  onCommunicationToggle,
}: Props) {
  return (
    <>
      <details className={SECTION_CLASS} open>
        <summary className="cursor-pointer text-xs font-semibold tracking-wide text-cyan-300/90 uppercase">
          Co-buyer
        </summary>
        <TwoColGrid className="mt-4">
          <Field label="Co-buyer name" value={state.coBuyerName} onChange={(v) => onChange({ coBuyerName: v })} />
          <Field label="Co-buyer email" type="email" value={state.coBuyerEmail} onChange={(v) => onChange({ coBuyerEmail: v })} />
          <Field label="Co-buyer phone" type="tel" value={state.coBuyerPhone} onChange={(v) => onChange({ coBuyerPhone: v })} />
          <Field
            label="Relationship"
            value={state.coBuyerRelationship}
            onChange={(v) => onChange({ coBuyerRelationship: v })}
            placeholder="Spouse, partner…"
          />
        </TwoColGrid>
      </details>

      <details className={SECTION_CLASS}>
        <summary className="cursor-pointer text-xs font-semibold tracking-wide text-cyan-300/90 uppercase">
          Location & housing
        </summary>
        <div className="mt-4 space-y-4">
          {showLeadSourceOther ? (
            <Field
              label="Lead source (other)"
              value={state.leadSourceOther}
              onChange={(v) => onChange({ leadSourceOther: v })}
            />
          ) : null}
          <Field label="Street address" value={state.streetAddress} onChange={(v) => onChange({ streetAddress: v })} />
          <TwoColGrid>
            <Field label="City" value={state.city} onChange={(v) => onChange({ city: v })} />
            <Field label="State" value={state.state} onChange={(v) => onChange({ state: v })} />
            <Field label="Zip code" value={state.zipCode} onChange={(v) => onChange({ zipCode: v })} />
          </TwoColGrid>
          <label className="block space-y-1.5">
            <span className={spatial.label}>Current housing</span>
            <select
              value={state.currentHousingStatus}
              onChange={(e) => onChange({ currentHousingStatus: e.target.value })}
              className={INPUT_CLASS}
            >
              <option value="">—</option>
              <option value="Renting">Renting</option>
              <option value="Own">Own</option>
              <option value="Living with Family">Living with Family</option>
              <option value="Other">Other</option>
            </select>
          </label>
        </div>
      </details>

      <details className={SECTION_CLASS}>
        <summary className="cursor-pointer text-xs font-semibold tracking-wide text-cyan-300/90 uppercase">
          Financing profile
        </summary>
        <TwoColGrid className="mt-4">
          <Field label="DTI ratio (%)" type="number" value={state.dtiRatio} onChange={(v) => onChange({ dtiRatio: v })} />
          <label className="block space-y-1.5">
            <span className={spatial.label}>Credit score range</span>
            <select
              value={state.creditScoreRange}
              onChange={(e) => onChange({ creditScoreRange: e.target.value })}
              className={INPUT_CLASS}
            >
              <option value="">—</option>
              <option value="740+">740+</option>
              <option value="700-739">700-739</option>
              <option value="660-699">660-699</option>
              <option value="620-659">620-659</option>
              <option value="Below 620">Below 620</option>
            </select>
          </label>
          <Field label="Down payment ($)" type="number" value={state.downPaymentAmount} onChange={(v) => onChange({ downPaymentAmount: v })} />
          <Field label="Monthly comfort ($)" type="number" value={state.monthlyPaymentComfort} onChange={(v) => onChange({ monthlyPaymentComfort: v })} />
          <Field label="Employment" value={state.employmentStatus} onChange={(v) => onChange({ employmentStatus: v })} />
          <Field label="Lender name" value={state.lenderName} onChange={(v) => onChange({ lenderName: v })} />
        </TwoColGrid>
      </details>

      <details className={SECTION_CLASS}>
        <summary className="cursor-pointer text-xs font-semibold tracking-wide text-cyan-300/90 uppercase">
          Communication plan
        </summary>
        <TwoColGrid className="mt-4">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={spatial.label}>Preferred channel</span>
            <select
              value={state.preferredCommunicationChannel}
              onChange={(e) => onChange({ preferredCommunicationChannel: e.target.value })}
              className={INPUT_CLASS}
            >
              <option value="Text">Text</option>
              <option value="Call">Call</option>
              <option value="Email">Email</option>
            </select>
          </label>
          <Field label="Contact window" value={state.preferredContactWindow} onChange={(v) => onChange({ preferredContactWindow: v })} placeholder="Morning, evenings…" />
          <Field label="Follow-up frequency" value={state.followUpFrequency} onChange={(v) => onChange({ followUpFrequency: v })} />
          <Field label="First follow-up" type="date" value={state.firstFollowUpDate} onChange={(v) => onChange({ firstFollowUpDate: v })} />
          <div className="space-y-2 sm:col-span-2">
            <ToggleRow label="Welcome email" checked={state.welcomeEmailEnabled} onChange={(v) => onChange({ welcomeEmailEnabled: v })} />
            <ToggleRow
              label="Buyer consultation invite"
              checked={state.communicationPreferences.buyer_consultation_invite_enabled}
              onChange={(v) => onCommunicationToggle("buyer_consultation_invite_enabled", v)}
            />
            <ToggleRow
              label="Pre-approval reminder"
              checked={state.communicationPreferences.pre_approval_reminder_enabled}
              onChange={(v) => onCommunicationToggle("pre_approval_reminder_enabled", v)}
            />
            <ToggleRow
              label="Market update email"
              checked={state.communicationPreferences.market_update_email_enabled}
              onChange={(v) => onCommunicationToggle("market_update_email_enabled", v)}
            />
            <ToggleRow
              label="Representation agreement reminder"
              checked={state.communicationPreferences.representation_agreement_reminder_enabled}
              onChange={(v) => onCommunicationToggle("representation_agreement_reminder_enabled", v)}
            />
            <ToggleRow
              label="Inactive lead re-engagement"
              checked={state.communicationPreferences.inactive_lead_reengagement_enabled}
              onChange={(v) => onCommunicationToggle("inactive_lead_reengagement_enabled", v)}
            />
          </div>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={spatial.label}>Communication notes</span>
            <textarea
              value={state.customCommunicationNotes}
              onChange={(e) => onChange({ customCommunicationNotes: e.target.value })}
              rows={2}
              className={INPUT_CLASS}
            />
          </label>
        </TwoColGrid>
      </details>
    </>
  );
}
