"use client";

import { generateClientInviteUrl } from "@/lib/qr-service";
import Link from "next/link";
import { useMemo } from "react";

type IntakeSuccessProps = {
  readonly leadId: string;
  readonly clientName?: string;
};

export function IntakeSuccess({ leadId, clientName }: IntakeSuccessProps) {
  const inviteUrl = useMemo(() => generateClientInviteUrl(leadId), [leadId]);
  const displayName =
    clientName && clientName.trim().length > 0 ? clientName.trim() : "there";

  return (
    <div className="relative mx-auto flex min-h-[60dvh] w-full max-w-lg flex-col items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-3xl opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0, 242, 254, 0.12), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="w-full overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0f172a] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.75)]">
        <div className="border-b border-slate-700/60 bg-gradient-to-b from-slate-800/40 to-transparent px-6 py-8 text-center">
          <span
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-2xl text-cyan-400"
            aria-hidden
          >
            ✓
          </span>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            You&apos;re on the list
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Thank you, {displayName}. Your agent has your details and will follow up
            shortly.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          <p className="text-center text-xs leading-relaxed text-slate-500">
            Want to track showings, documents, and next steps in one place?
          </p>
          <Link
            href={inviteUrl}
            className="flex w-full items-center justify-center rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-violet-500/15 px-4 py-3.5 text-sm font-bold tracking-wide text-cyan-300 uppercase transition duration-300 hover:border-cyan-400/60 hover:from-cyan-500/30 hover:to-violet-500/25 hover:text-cyan-200"
            style={{
              boxShadow:
                "0 4px 24px rgba(0, 242, 254, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
            }}
          >
            Fast Track — Create AssistU2Win Account
          </Link>
          <Link
            href="/download-app"
            className="flex w-full items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/80"
          >
            Download the mobile app
          </Link>
          <p className="text-center text-[10px] text-slate-600">
            Secure buyer portal · No spam · Unsubscribe anytime
          </p>
        </div>
      </div>
    </div>
  );
}
