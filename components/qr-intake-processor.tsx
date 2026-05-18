"use client";

import { IntakeForm } from "@/components/intake/IntakeForm";
import { parseQrIntakeSearchParams } from "@/lib/qr-service";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function QRIntakeProcessor() {
  const searchParams = useSearchParams();
  const qrParams = useMemo(
    () => parseQrIntakeSearchParams(searchParams),
    [searchParams],
  );

  return <IntakeForm qrParams={qrParams} />;
}
