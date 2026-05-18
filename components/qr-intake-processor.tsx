"use client";

import { IntakeSuccess } from "@/components/intake/IntakeSuccess";
import {
  IntakeField,
  IntakeSection,
  IntakeTextarea,
  IntakeToggle,
  IntakeTwoCol,
} from "@/components/leads/intake/admin-intake-ui";
import { submitPublicLeadIntake } from "@/lib/communication-service";
import { setLeadIdCookieClient } from "@/lib/scan/lead-cookie-client";
import { formatUsPhoneInput, usPhoneDigitsOnly } from "@/lib/format/us-phone";
import {
  defaultCommunicationPlanData,
  type CommunicationPlanData,
} from "@/lib/leads/communication-plan";
import {
  buildQrIntakePrefillNotes,
  parseQrIntakeSearchParams,
} from "@/lib/qr-service";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

function buildInitialCommPlan(
  qrParams: ReturnType<typeof parseQrIntakeSearchParams>,
): CommunicationPlanData {
  const base = defaultCommunicationPlanData();
  const prefill = buildQrIntakePrefillNotes(qrParams);
  return {
    ...base,
    welcomeEmailEnabled: true,
    communicationPreferences: {
      ...base.communicationPreferences,
      market_update_email_enabled: qrParams.marketUpdate,
    },
    customCommunicationNotes: prefill.length > 0 ? prefill : base.customCommunicationNotes,
  };
}

export default function QRIntakeProcessor() {
  const searchParams = useSearchParams();
  const qrParams = useMemo(
    () => parseQrIntakeSearchParams(searchParams),
    [searchParams],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [commPlan, setCommPlan] = useState<CommunicationPlanData>(() =>
    buildInitialCommPlan(qrParams),
  );
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("submitting");
    setErrorMessage(null);

    const digits = usPhoneDigitsOnly(phone);
    const formattedPhone =
      digits.length > 0 ? formatUsPhoneInput(digits) : phone.trim();

    const result = await submitPublicLeadIntake({
      name: name.trim(),
      email: email.trim(),
      phone: formattedPhone,
      preferred_channel: commPlan.preferredCommunicationChannel,
      contact_window: commPlan.preferredContactWindow.trim(),
      notes:
        commPlan.customCommunicationNotes.trim().length > 0
          ? commPlan.customCommunicationNotes.trim()
          : undefined,
      optInToUpdates:
        commPlan.communicationPreferences.market_update_email_enabled,
      welcomeEmailEnabled: commPlan.welcomeEmailEnabled,
      communication_preferences: commPlan.communicationPreferences,
      repAgreementPending: commPlan.repAgreementPending,
      campaignId: qrParams.source ?? undefined,
      location: qrParams.location ?? undefined,
    });

    if (result.ok) {
      setLeadIdCookieClient(result.leadId);
      setSubmittedLeadId(result.leadId);
      setSubmitState("success");
      return;
    }

    setSubmitState("error");
    setErrorMessage(result.message);
  }

  if (submitState === "success" && submittedLeadId) {
    return <IntakeSuccess leadId={submittedLeadId} clientName={name.trim()} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-10">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <IntakeSection title="Your info">
          <IntakeTwoCol>
            <IntakeField
              label="Lead / Client Name"
              value={name}
              onChange={setName}
              required
              wordFormat="proper-words"
              placeholder="John & Mary Smith"
              className="sm:col-span-2"
            />
            <IntakeField
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              required
              wordFormat="email"
            />
            <IntakeField
              label="Phone"
              value={phone}
              onChange={(v) => setPhone(formatUsPhoneInput(v))}
              type="tel"
              required
              placeholder="555-555-0100"
            />
          </IntakeTwoCol>
        </IntakeSection>

        <IntakeSection title="Communication preferences">
          <IntakeTwoCol>
            <IntakeTextarea
              label="Communication Notes"
              value={commPlan.customCommunicationNotes}
              onChange={(value) =>
                setCommPlan((current) => ({
                  ...current,
                  customCommunicationNotes: value,
                }))
              }
              rows={3}
              className="sm:col-span-2"
            />
            <div className="space-y-2 sm:col-span-2">
              <IntakeToggle
                label="Welcome email"
                checked={commPlan.welcomeEmailEnabled}
                onChange={(checked) =>
                  setCommPlan((current) => ({
                    ...current,
                    welcomeEmailEnabled: checked,
                  }))
                }
              />
              <IntakeToggle
                label="Market update email"
                checked={commPlan.communicationPreferences.market_update_email_enabled}
                onChange={(checked) =>
                  setCommPlan((current) => ({
                    ...current,
                    communicationPreferences: {
                      ...current.communicationPreferences,
                      market_update_email_enabled: checked,
                    },
                  }))
                }
              />
            </div>
          </IntakeTwoCol>
        </IntakeSection>

        {errorMessage ? (
          <p className="text-sm text-red-400" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitState === "submitting"}
          className="w-full rounded-xl bg-[#00F2FE] px-4 py-3 text-sm font-semibold text-[#080C1A] transition hover:bg-[#00F2FE]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitState === "submitting" ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
