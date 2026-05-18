"use client";

import { SuccessScreen } from "@/components/intake/SuccessScreen";

type IntakeSuccessProps = {
  readonly leadId: string;
  readonly clientName?: string;
};

/** @deprecated Use SuccessScreen */
export function IntakeSuccess({ clientName }: IntakeSuccessProps) {
  const displayName =
    clientName && clientName.trim().length > 0 ? clientName.trim() : "there";
  return <SuccessScreen name={displayName} />;
}
