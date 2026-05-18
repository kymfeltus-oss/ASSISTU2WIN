"use client";

import {
  IntakeField,
  IntakeSelect,
  IntakeTextarea,
  IntakeToggle,
  IntakeTwoCol,
} from "@/components/leads/intake/admin-intake-ui";
import { adminIntakeTheme } from "@/components/leads/intake/admin-intake-theme";
import type { LeadCommunicationPreferences } from "@/lib/leads/admin-intake-fields";
import {
  COMMUNICATION_CHANNELS,
  type CommunicationPlanData,
} from "@/lib/leads/communication-plan";

type CommunicationPlanFieldsProps = {
  readonly value: CommunicationPlanData;
  readonly onChange: (next: CommunicationPlanData) => void;
  readonly disabled?: boolean;
  /** Full dashboard editor — all automation toggles. */
  readonly variant?: "full" | "public";
};

export function CommunicationPlanFields({
  value,
  onChange,
  disabled = false,
  variant = "full",
}: CommunicationPlanFieldsProps) {
  const showAutomationToggles = variant === "full";
  const patch = (partial: Partial<CommunicationPlanData>) => {
    onChange({ ...value, ...partial });
  };

  const patchPreference = (
    key: keyof LeadCommunicationPreferences,
    checked: boolean,
  ) => {
    onChange({
      ...value,
      communicationPreferences: {
        ...value.communicationPreferences,
        [key]: checked,
      },
    });
  };

  return (
    <div className={`${adminIntakeTheme.panel} p-4 sm:p-5`}>
      <header className={adminIntakeTheme.sectionHeader}>
        <h2 className={adminIntakeTheme.sectionTitle}>Communication Plan</h2>
      </header>

      <IntakeTwoCol>
        <IntakeSelect
          label="Preferred channel"
          value={value.preferredCommunicationChannel}
          onChange={(channel) =>
            patch({
              preferredCommunicationChannel: COMMUNICATION_CHANNELS.includes(
                channel as (typeof COMMUNICATION_CHANNELS)[number],
              )
                ? (channel as CommunicationPlanData["preferredCommunicationChannel"])
                : "Text",
            })
          }
          className="sm:col-span-2"
        >
          {COMMUNICATION_CHANNELS.map((channel) => (
            <option key={channel} value={channel}>
              {channel}
            </option>
          ))}
        </IntakeSelect>

        <IntakeField
          label="Contact window"
          value={value.preferredContactWindow}
          onChange={(v) => patch({ preferredContactWindow: v })}
          wordFormat="proper-words"
          placeholder="Morning, evenings…"
          className="sm:col-span-2"
        />

        <div className="space-y-2 sm:col-span-2">
          <IntakeToggle
            label="Welcome email"
            checked={value.welcomeEmailEnabled}
            onChange={(checked) => patch({ welcomeEmailEnabled: checked })}
          />
          {variant === "public" ? (
            <IntakeToggle
              label="Market update emails"
              checked={value.communicationPreferences.market_update_email_enabled}
              onChange={(checked) =>
                patchPreference("market_update_email_enabled", checked)
              }
            />
          ) : null}
          {showAutomationToggles ? (
            <>
              <IntakeToggle
                label="Consultation invite"
                checked={
                  value.communicationPreferences.buyer_consultation_invite_enabled
                }
                onChange={(checked) =>
                  patchPreference("buyer_consultation_invite_enabled", checked)
                }
              />
              <IntakeToggle
                label="Eligibility reminder"
                checked={value.communicationPreferences.pre_approval_reminder_enabled}
                onChange={(checked) =>
                  patchPreference("pre_approval_reminder_enabled", checked)
                }
              />
              <IntakeToggle
                label="Market update email"
                checked={value.communicationPreferences.market_update_email_enabled}
                onChange={(checked) =>
                  patchPreference("market_update_email_enabled", checked)
                }
              />
              <IntakeToggle
                label="Representation agreement reminder"
                checked={
                  value.communicationPreferences
                    .representation_agreement_reminder_enabled
                }
                onChange={(checked) =>
                  patchPreference(
                    "representation_agreement_reminder_enabled",
                    checked,
                  )
                }
              />
              <IntakeToggle
                label="Inactive lead re-engagement"
                checked={
                  value.communicationPreferences.inactive_lead_reengagement_enabled
                }
                onChange={(checked) =>
                  patchPreference("inactive_lead_reengagement_enabled", checked)
                }
              />
            </>
          ) : null}
        </div>

        <IntakeTextarea
          label="Latest touchpoint / conversation log"
          value={value.customCommunicationNotes}
          onChange={(v) => patch({ customCommunicationNotes: v })}
          wordFormat="sentence"
          rows={3}
          className="sm:col-span-2"
        />
      </IntakeTwoCol>

      {disabled ? (
        <p className="mt-3 text-[11px] text-[#94A3B8]">Saving…</p>
      ) : null}
    </div>
  );
}
