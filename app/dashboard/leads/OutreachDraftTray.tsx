"use client";

import { getOutreachDraftForLead } from "./actions";
import { useCallback, useState, useTransition } from "react";

type Props = {
  opportunityId: string;
};

export function OutreachDraftTray({ opportunityId }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const generate = useCallback(() => {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await getOutreachDraftForLead(opportunityId);
      if (result.ok) {
        setDraft(result.draft);
      } else {
        setDraft(null);
        setError(result.error);
      }
    });
  }, [opportunityId]);

  const copy = useCallback(async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy to clipboard.");
    }
  }, [draft]);

  return (
    <div className="mt-3 rounded-lg border border-slate-700/90 bg-slate-900/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-blue-300 uppercase transition-colors hover:bg-slate-800/80"
      >
        <span>AI outreach draft</span>
        <span className="font-mono text-slate-500">{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-slate-700/70 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={generate}
              className="rounded-md border border-blue-500/40 bg-blue-600/20 px-2.5 py-1 text-[10px] font-semibold text-blue-200 transition-colors hover:bg-blue-600/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Generating…" : "Generate draft"}
            </button>
            {draft ? (
              <button
                type="button"
                onClick={copy}
                className="rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-200 transition-colors hover:border-blue-500/40 hover:text-white"
              >
                {copied ? "Copied" : "Copy message"}
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="text-[10px] text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          {draft ? (
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-700/60 bg-slate-950/60 p-2 font-sans text-[11px] leading-relaxed text-slate-200">
              {draft}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
