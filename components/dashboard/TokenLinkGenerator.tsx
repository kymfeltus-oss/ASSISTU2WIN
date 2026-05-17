"use client";

import { Copy, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export type TokenLinkLead = {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly target_zip_code: string;
};

type TokenLinkGeneratorProps = {
  readonly lead: TokenLinkLead;
};

type CopyState = "idle" | "copied";

function buildTrackingUrl(origin: string, lead: TokenLinkLead): string {
  const zipSegment = encodeURIComponent(lead.target_zip_code.trim() || "local");
  const redirect = `/market-report/${zipSegment}`;
  const params = new URLSearchParams({
    leadId: lead.id,
    redirect,
  });
  return `${origin}/api/track-click?${params.toString()}`;
}

function buildSmsUri(lead: TokenLinkLead, trackingUrl: string): string {
  const body = `Hi ${lead.name}, here is your live local neighborhood report for zip code ${lead.target_zip_code}: ${trackingUrl}`;
  const phone = lead.phone.replace(/\s/g, "");
  return `sms:${phone}?body=${encodeURIComponent(body)}`;
}

export function TokenLinkGenerator({ lead }: TokenLinkGeneratorProps) {
  const [origin, setOrigin] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const trackingUrl = useMemo(() => {
    if (!origin) {
      return "";
    }
    return buildTrackingUrl(origin, lead);
  }, [lead, origin]);

  const displayZip = lead.target_zip_code.trim() || "—";
  const hasPhone = lead.phone.trim().length > 0;
  const canShare = Boolean(trackingUrl);

  const handleCopy = useCallback(async () => {
    if (!trackingUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopyState("copied");
      window.setTimeout(() => {
        setCopyState("idle");
      }, 2000);
    } catch (error: unknown) {
      console.error("[TOKEN_LINK_COPY]", { error });
    }
  }, [trackingUrl]);

  const handleSms = useCallback(() => {
    if (!trackingUrl || !hasPhone) {
      return;
    }
    window.location.href = buildSmsUri(lead, trackingUrl);
  }, [hasPhone, lead, trackingUrl]);

  return (
    <section className="w-full rounded-2xl border border-slate-700 bg-slate-800 p-5 text-slate-100 shadow-lg shadow-black/25">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400/90">
          Outbound push
        </p>
        <h3 className="text-lg font-semibold">Tokenized market link</h3>
        <p className="text-sm text-slate-400">
          {lead.name.trim() || "Active buyer"}
        </p>
      </header>

      <div className="mt-4 rounded-xl border border-slate-600/80 bg-slate-900/80 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Data package ZIP
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-cyan-300">
          {displayZip}
        </p>
      </div>

      <p className="mt-3 break-all text-xs leading-relaxed text-slate-500">
        {trackingUrl || "Preparing tracking link…"}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={!canShare}
          onClick={() => void handleCopy()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-cyan-500/50 bg-cyan-950/50 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-900/60 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-900 disabled:text-slate-500"
        >
          <Copy className="size-4 shrink-0" aria-hidden />
          {copyState === "copied" ? "Copied!" : "Copy Tracking Link"}
        </button>

        <button
          type="button"
          disabled={!canShare || !hasPhone}
          onClick={handleSms}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-600 bg-slate-900 px-4 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-950 disabled:cursor-not-allowed disabled:text-slate-500"
        >
          <MessageSquare className="size-4 shrink-0" aria-hidden />
          Text Direct (SMS)
        </button>
      </div>

      {!hasPhone ? (
        <p className="mt-3 text-xs text-amber-400/90">
          Add a phone number on this lead to enable SMS.
        </p>
      ) : null}
    </section>
  );
}
