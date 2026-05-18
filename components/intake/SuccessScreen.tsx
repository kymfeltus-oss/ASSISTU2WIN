"use client";

import { CheckCircle } from "lucide-react";
import Link from "next/link";

type SuccessScreenProps = {
  readonly name: string;
};

/**
 * Post-intake success — single Laser Cyan download CTA (no Fast Track).
 */
export function SuccessScreen({ name }: SuccessScreenProps) {
  const displayName = name.trim().length > 0 ? name.trim() : "there";

  return (
    <div className="intake-success-enter mx-auto flex min-h-[60dvh] w-full max-w-lg flex-col items-center justify-center space-y-8 p-8">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full blur-xl"
          style={{ background: "rgba(0, 242, 254, 0.2)" }}
          aria-hidden
        />
        <CheckCircle
          className="relative z-10 h-20 w-20 text-[#00F2FE]"
          strokeWidth={1.5}
          aria-hidden
        />
      </div>

      <div className="space-y-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          You&apos;re on the list
        </h2>
        <p className="mx-auto max-w-sm text-slate-400">
          Thank you,{" "}
          <span className="font-semibold text-[#00F2FE]">{displayName}</span>. Your
          details are secured. The final step is to access your dashboard.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4 pt-4">
        <p className="text-center text-xs font-medium tracking-widest text-slate-500 uppercase">
          Official Access
        </p>

        <Link
          href="/download-app"
          className="flex w-full items-center justify-center rounded-xl bg-[#00F2FE] py-4 font-bold text-[#080C1A] shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all hover:bg-[#00F2FE]/90 active:scale-95"
        >
          Download the mobile app
        </Link>

        <p className="text-center text-[10px] text-slate-600">
          Secure portal • No spam • Unsubscribe anytime
        </p>
      </div>
    </div>
  );
}
