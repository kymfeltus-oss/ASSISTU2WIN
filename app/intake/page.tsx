import QRIntakeProcessor from "@/components/qr-intake-processor";
import { Suspense } from "react";

function IntakeLoading() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4"
      aria-busy="true"
      aria-label="Loading intake form"
    >
      <p className="text-sm text-[color:var(--text-muted)]">Loading…</p>
    </div>
  );
}

export default function PublicIntakePage() {
  return (
    <Suspense fallback={<IntakeLoading />}>
      <QRIntakeProcessor />
    </Suspense>
  );
}
