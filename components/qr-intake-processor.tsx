"use client";

import { CommunicationPlanFields } from "@/components/leads/CommunicationPlanFields";
import {
  IntakeField,
  IntakeSection,
  IntakeTwoCol,
} from "@/components/leads/intake/admin-intake-ui";
import { submitPublicLeadIntake } from "@/lib/communication-service";
import { formatUsPhoneInput, usPhoneDigitsOnly } from "@/lib/format/us-phone";
import { BRAND_LOGO_ALT, BRAND_LOGO_SRC } from "@/lib/branding";
import {
  defaultCommunicationPlanData,
  type CommunicationPlanData,
} from "@/lib/leads/communication-plan";
import {
  buildQrIntakePrefillNotes,
  parseQrIntakeSearchParams,
} from "@/lib/qr-service";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

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
    defaultCommunicationPlanData(),
  );
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const prefill = buildQrIntakePrefillNotes(qrParams);
    setCommPlan((prev) => ({
      ...prev,
      welcomeEmailEnabled: qrParams.autoWelcome,
      communicationPreferences: {
        ...prev.communicationPreferences,
        market_update_email_enabled: qrParams.marketUpdate,
      },
      customCommunicationNotes:
        prefill.length > 0 ? prefill : prev.customCommunicationNotes,
    }));
  }, [qrParams]);

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
      campaignId: qrParams.source ?? undefined,
      location: qrParams.location ?? undefined,
    });

    if (result.ok) {
      setSubmitState("success");
      return;
    }

    setSubmitState("error");
    setErrorMessage(result.message);
  }

  if (submitState === "success") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-10">
        <Image
          src={BRAND_LOGO_SRC}
          alt={BRAND_LOGO_ALT}
          width={160}
          height={48}
          className="h-auto w-40 object-contain"
          priority
        />
        <div className="w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--panel)] p-6 text-center shadow-lg">
          <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">
            You&apos;re on the list
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            We received your details. Your agent will follow up soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <Image
          src={BRAND_LOGO_SRC}
          alt={BRAND_LOGO_ALT}
          width={180}
          height={54}
          className="h-auto w-44 object-contain"
          priority
        />
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">
            Start your home search
          </h1>
          {qrParams.source ? (
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Source: {qrParams.source}
              {qrParams.location ? ` · ${qrParams.location}` : ""}
            </p>
          ) : null}
        </div>
      </header>

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

        <CommunicationPlanFields
          value={commPlan}
          onChange={setCommPlan}
          variant="public"
        />

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
