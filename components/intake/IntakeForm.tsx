"use client";

import { SuccessScreen } from "@/components/intake/SuccessScreen";
import {
  IntakeField,
  IntakeSection,
  IntakeTextarea,
  IntakeToggle,
  IntakeTwoCol,
} from "@/components/leads/intake/admin-intake-ui";
import { setLeadIdCookieClient } from "@/lib/scan/lead-cookie-client";
import { formatUsPhoneInput, usPhoneDigitsOnly } from "@/lib/format/us-phone";
import {
  defaultCommunicationPlanData,
  type CommunicationPlanData,
} from "@/lib/leads/communication-plan";
import {
  buildQrIntakePrefillNotes,
  type QrIntakeUrlParams,
} from "@/lib/qr-service";
import { useState } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

type IntakeFormProps = {
  readonly qrParams?: QrIntakeUrlParams;
};

function buildInitialCommPlan(qrParams: QrIntakeUrlParams): CommunicationPlanData {
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

export function IntakeForm({ qrParams }: IntakeFormProps) {
  const resolvedQr = qrParams ?? {
    source: null,
    location: null,
    autoWelcome: true,
    marketUpdate: true,
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [commPlan, setCommPlan] = useState<CommunicationPlanData>(() =>
    buildInitialCommPlan(resolvedQr),
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

    const isPending = commPlan.repAgreementPending;
    const notes = commPlan.customCommunicationNotes.trim();

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_name: name.trim(),
          email_address: email.trim(),
          phone_number: formattedPhone,
          preferred_communication_channel: commPlan.preferredCommunicationChannel,
          preferred_contact_window: commPlan.preferredContactWindow.trim(),
          custom_communication_notes: notes.length > 0 ? notes : undefined,
          welcome_email_enabled: commPlan.welcomeEmailEnabled,
          communication_preferences: commPlan.communicationPreferences,
          rep_agreement_pending: isPending,
          campaignId: resolvedQr.source ?? undefined,
          location: resolvedQr.location ?? undefined,
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof (payload as { message: unknown }).message === "string"
            ? (payload as { message: string }).message
            : "Unable to save your information.";
        setSubmitState("error");
        setErrorMessage(message);
        return;
      }

      if (
        typeof payload === "object" &&
        payload !== null &&
        "ok" in payload &&
        (payload as { ok: unknown }).ok === true &&
        "leadId" in payload &&
        typeof (payload as { leadId: unknown }).leadId === "string"
      ) {
        const leadId = (payload as { leadId: string }).leadId;
        setLeadIdCookieClient(leadId);
        setSubmittedLeadId(leadId);
        setSubmitState("success");
        return;
      }

      setSubmitState("error");
      setErrorMessage("Unexpected response from the server.");
    } catch (error: unknown) {
      console.error("[INTAKE_FORM_SUBMIT]", { error });
      setSubmitState("error");
      setErrorMessage("Network error. Please try again.");
    }
  }

  if (submitState === "success" && submittedLeadId) {
    return <SuccessScreen name={name.trim()} />;
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
              <IntakeToggle
                label="Representation agreement"
                checked={commPlan.repAgreementPending}
                onChange={(checked) =>
                  setCommPlan((current) => ({
                    ...current,
                    repAgreementPending: checked,
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
