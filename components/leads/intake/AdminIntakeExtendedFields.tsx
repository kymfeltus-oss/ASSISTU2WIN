"use client";

import {
  IntakeField,
  IntakeSection,
  IntakeSelect,
  IntakeTextarea,
  IntakeToggle,
  IntakeTwoCol,
} from "@/components/leads/intake/admin-intake-ui";
import type { LeadCommunicationPreferences } from "@/lib/leads/admin-intake-fields";
import { EMPTY_COMMUNICATION_PREFERENCES } from "@/lib/leads/admin-intake-fields";

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

export function AdminIntakeExtendedFields({
  state,
  showLeadSourceOther,
  onChange,
  onCommunicationToggle,
}: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-3 md:gap-4">
      <IntakeSection title="Co-Buyer Information">
        <IntakeTwoCol>
          <IntakeField label="Co-buyer name" value={state.coBuyerName} onChange={(v) => onChange({ coBuyerName: v })} />
          <IntakeField
            label="Relationship"
            value={state.coBuyerRelationship}
            onChange={(v) => onChange({ coBuyerRelationship: v })}
            placeholder="Spouse, partner…"
          />
          <IntakeField label="Co-buyer email" type="email" value={state.coBuyerEmail} onChange={(v) => onChange({ coBuyerEmail: v })} />
          <IntakeField label="Co-buyer phone" type="tel" value={state.coBuyerPhone} onChange={(v) => onChange({ coBuyerPhone: v })} />
        </IntakeTwoCol>
      </IntakeSection>

      <IntakeSection title="Address & Source Details">
        <div className="space-y-3">
          {showLeadSourceOther ? (
            <IntakeField
              label="Lead source (other)"
              value={state.leadSourceOther}
              onChange={(v) => onChange({ leadSourceOther: v })}
            />
          ) : null}
          <IntakeField label="Street address" value={state.streetAddress} onChange={(v) => onChange({ streetAddress: v })} />
          <IntakeTwoCol>
            <IntakeField label="City" value={state.city} onChange={(v) => onChange({ city: v })} />
            <IntakeField label="State" value={state.state} onChange={(v) => onChange({ state: v })} />
            <IntakeField label="Zip code" value={state.zipCode} onChange={(v) => onChange({ zipCode: v })} />
            <IntakeSelect
              label="Current housing"
              value={state.currentHousingStatus}
              onChange={(v) => onChange({ currentHousingStatus: v })}
            >
              <option value="">Select…</option>
              <option value="Renting">Renting</option>
              <option value="Own">Own</option>
              <option value="Living with Family">Living with Family</option>
              <option value="Other">Other</option>
            </IntakeSelect>
          </IntakeTwoCol>
        </div>
      </IntakeSection>

      <IntakeSection title="Finance & Friction Details">
        <IntakeTwoCol>
          <IntakeField label="DTI ratio (%)" type="number" value={state.dtiRatio} onChange={(v) => onChange({ dtiRatio: v })} />
          <IntakeSelect
            label="Credit score range"
            value={state.creditScoreRange}
            onChange={(v) => onChange({ creditScoreRange: v })}
          >
            <option value="">Select…</option>
            <option value="740+">740+</option>
            <option value="700-739">700-739</option>
            <option value="660-699">660-699</option>
            <option value="620-659">620-659</option>
            <option value="Below 620">Below 620</option>
          </IntakeSelect>
          <IntakeField label="Down payment ($)" type="number" value={state.downPaymentAmount} onChange={(v) => onChange({ downPaymentAmount: v })} />
          <IntakeField label="Monthly comfort ($)" type="number" value={state.monthlyPaymentComfort} onChange={(v) => onChange({ monthlyPaymentComfort: v })} />
          <IntakeField label="Employment" value={state.employmentStatus} onChange={(v) => onChange({ employmentStatus: v })} />
          <IntakeField label="Lender name" value={state.lenderName} onChange={(v) => onChange({ lenderName: v })} />
        </IntakeTwoCol>
      </IntakeSection>

      <IntakeSection title="Communication Plan">
        <IntakeTwoCol>
          <IntakeSelect
            label="Preferred channel"
            value={state.preferredCommunicationChannel}
            onChange={(v) => onChange({ preferredCommunicationChannel: v })}
            className="sm:col-span-2"
          >
            <option value="Text">Text</option>
            <option value="Call">Call</option>
            <option value="Email">Email</option>
          </IntakeSelect>
          <IntakeField
            label="Contact window"
            value={state.preferredContactWindow}
            onChange={(v) => onChange({ preferredContactWindow: v })}
            placeholder="Morning, evenings…"
          />
          <div className="space-y-2 sm:col-span-2">
            <IntakeToggle
              label="Welcome email"
              checked={state.welcomeEmailEnabled}
              onChange={(v) => onChange({ welcomeEmailEnabled: v })}
            />
            <IntakeToggle
              label="Buyer consultation invite"
              checked={state.communicationPreferences.buyer_consultation_invite_enabled}
              onChange={(v) => onCommunicationToggle("buyer_consultation_invite_enabled", v)}
            />
            <IntakeToggle
              label="Pre-approval reminder"
              checked={state.communicationPreferences.pre_approval_reminder_enabled}
              onChange={(v) => onCommunicationToggle("pre_approval_reminder_enabled", v)}
            />
            <IntakeToggle
              label="Market update email"
              checked={state.communicationPreferences.market_update_email_enabled}
              onChange={(v) => onCommunicationToggle("market_update_email_enabled", v)}
            />
            <IntakeToggle
              label="Representation agreement reminder"
              checked={state.communicationPreferences.representation_agreement_reminder_enabled}
              onChange={(v) => onCommunicationToggle("representation_agreement_reminder_enabled", v)}
            />
            <IntakeToggle
              label="Inactive lead re-engagement"
              checked={state.communicationPreferences.inactive_lead_reengagement_enabled}
              onChange={(v) => onCommunicationToggle("inactive_lead_reengagement_enabled", v)}
            />
          </div>
          <IntakeTextarea
            label="Communication notes"
            value={state.customCommunicationNotes}
            onChange={(v) => onChange({ customCommunicationNotes: v })}
            rows={2}
            className="sm:col-span-2"
          />
        </IntakeTwoCol>
      </IntakeSection>

      <IntakeSection title="Follow-Up Intelligence">
        <IntakeTwoCol>
          <IntakeField
            label="Follow-up frequency"
            value={state.followUpFrequency}
            onChange={(v) => onChange({ followUpFrequency: v })}
            placeholder="Weekly, bi-weekly…"
          />
          <IntakeField
            label="First follow-up date"
            type="date"
            value={state.firstFollowUpDate}
            onChange={(v) => onChange({ firstFollowUpDate: v })}
          />
        </IntakeTwoCol>
      </IntakeSection>
    </div>
  );
}
