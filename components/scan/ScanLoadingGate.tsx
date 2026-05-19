"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const LOADING_DURATION_MS = 1500;

type ScanLoadingGateProps = {
  readonly destination: string;
};

/**
 * Premium AI loading beat — server picks destination; client navigates after pulse.
 */
export function ScanLoadingGate({ destination }: ScanLoadingGateProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace(destination);
    }, LOADING_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [destination, router]);

  return (
    <div className="scan-cinematic-page relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      <div className="scan-cinematic-glow pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="scan-laser-pulse-ring relative flex items-center justify-center rounded-3xl p-6"
        role="status"
        aria-live="polite"
        aria-label="AssistU2Win is preparing your experience"
      >
        <BrandLogo variant="scan" priority showLoadError />
      </div>
      <p className="relative z-10 mt-8 text-[10px] font-semibold tracking-[0.22em] text-[#00F2FE]/70 uppercase">
        Initializing command
      </p>
    </div>
  );
}
