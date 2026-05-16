"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type IntakeApiSuccess = { readonly ok: true; readonly leadId: string };
type IntakeApiFailure = {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
};

export function CopilotIntakeForm() {
  const router = useRouter();
  const [leadSource, setLeadSource] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    const source = leadSource.trim();
    const content = rawContent.trim();
    if (!source || !content) {
      setError("Lead source and conversation text are required.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/copilot-intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_source: source,
            raw_content: content,
          }),
        });

        const payload = (await response.json()) as
          | IntakeApiSuccess
          | IntakeApiFailure;

        if (!response.ok || !payload.ok) {
          const message =
            !payload.ok && "message" in payload
              ? payload.message
              : "Intake failed. Check server logs.";
          setError(message);
          return;
        }

        setLeadSource("");
        setRawContent("");
        router.push(`/dashboard/leads?lead=${payload.leadId}`);
        router.refresh();
      } catch {
        setError("Network error while ingesting lead.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6 text-left">
      <div>
        <h3 className="text-sm font-semibold text-white">
          AI Copilot Intake
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Paste a text thread, voicemail transcript, or open-house notes. The
          copilot will parse buyer details into the pipeline.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          Lead Source
        </label>
        <input
          value={leadSource}
          onChange={(e) => setLeadSource(e.target.value)}
          placeholder="e.g. Open House on Main St"
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          Conversation / Raw Input
        </label>
        <textarea
          value={rawContent}
          onChange={(e) => setRawContent(e.target.value)}
          rows={5}
          placeholder="e.g. John & Mary Smith — FHA pre-approved to $450k, want 3 beds in Plano..."
          className="w-full resize-none rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="w-full cursor-pointer rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Parsing with AI Copilot…" : "Ingest Buyer into Pipeline"}
      </button>
    </div>
  );
}
