import { parseStoredAiInsights } from "@/lib/ai-engine";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { archiveOpportunity, createOpportunity, updateOpportunityStage } from "./actions";
import AttachmentTray from "./AttachmentTray";
import { OutreachDraftTray } from "./OutreachDraftTray";

export const dynamic = "force-dynamic";

type OpportunityRow = {
  id: string;
  user_id: string;
  title: string;
  company: string;
  estimated_value: number;
  stage: string;
  notes: string | null;
  created_at: string;
  ai_insights?: unknown;
};

export default async function LeadsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  let opportunities: OpportunityRow[] = [];
  try {
    const { data, error: queryError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("[LEADS_QUERY_FAILURE]", { message: queryError.message });
    } else {
      opportunities = (data ?? []) as OpportunityRow[];
    }
  } catch (error: unknown) {
    console.error("[LEADS_QUERY_EXCEPTION]", { error });
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Upper Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                  AssistU2Win
                </span>
                <span className="hidden rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400 sm:inline-block">
                  Workspace v1.0
                </span>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs">
                <Link
                  href="/dashboard"
                  className="pb-1 text-slate-400 transition-colors hover:text-slate-200"
                >
                  Overview
                </Link>
                <Link
                  href="/dashboard/leads"
                  className="border-b-2 border-blue-500 pb-1.5 pt-1 font-bold text-blue-400"
                >
                  Lead Matrix
                </Link>
                <Link
                  href="/dashboard/analytics"
                  className="pb-1 text-slate-400 transition-colors hover:text-slate-200"
                >
                  Telemetry
                </Link>
                <Link
                  href="/dashboard/archive"
                  className="pb-1 text-slate-400 transition-colors hover:text-slate-200"
                >
                  Archive
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Unified workspace header + cross-links */}
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 font-mono text-xs text-slate-500">
              <Link
                href="/dashboard"
                className="transition-colors hover:text-blue-400"
              >
                Workspace
              </Link>
              <span>/</span>
              <span className="text-slate-300">Lead Intake Matrix</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Pipeline Ingestion Control
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Log prospective pipeline opportunities or trigger AI copilot
              trajectory analyses.
            </p>
            <div className="mt-2">
              <Link
                href="/dashboard/archive"
                className="text-xs font-semibold text-blue-400 underline-offset-2 hover:text-blue-300 hover:underline"
              >
                View archived opportunities
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/analytics"
              className="inline-flex h-fit w-fit items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700"
            >
              View Performance Analytics
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-fit w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              Overview Board
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="h-fit space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-md">
            <h2 className="text-base font-semibold tracking-tight text-white">
              Ingest Opportunity
            </h2>
            <form action={createOpportunity} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium tracking-wider text-slate-400 uppercase">
                  Opportunity Title
                </label>
                <input
                  required
                  name="title"
                  type="text"
                  placeholder="e.g. Enterprise Cloud Migration"
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium tracking-wider text-slate-400 uppercase">
                  Company / Account Name
                </label>
                <input
                  required
                  name="company"
                  type="text"
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium tracking-wider text-slate-400 uppercase">
                  Estimated Value ($)
                </label>
                <input
                  required
                  name="estimated_value"
                  type="number"
                  step="0.01"
                  placeholder="5000.00"
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium tracking-wider text-slate-400 uppercase">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Add operational details..."
                  className="w-full resize-none rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
              >
                Commit to Pipeline
              </button>
            </form>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <h2 className="text-base font-semibold tracking-tight text-white">
              Active Pipeline Logs
            </h2>
            {opportunities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/10 p-12 text-center">
                <p className="text-xs text-slate-500">
                  Zero active opportunities tracked in the cloud pipeline. Submit
                  the intake form to register operations.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {opportunities.map((item) => {
                  const aiInsights = parseStoredAiInsights(item.ai_insights);
                  return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="line-clamp-1 text-sm font-semibold text-white">
                            {item.title}
                          </h3>
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                            {item.company}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono text-xs font-medium text-blue-400">
                          {item.stage}
                        </span>
                      </div>
                      {item.notes ? (
                        <p className="mt-2 line-clamp-2 rounded-lg border border-slate-700/50 bg-slate-900/40 p-2 text-xs text-slate-400">
                          {item.notes}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-700/50 pt-3">
                        {item.stage === "INTAKE" ? (
                          <form
                            action={updateOpportunityStage.bind(
                              null,
                              item.id,
                              "PRE_APPROVAL",
                            )}
                          >
                            <button
                              type="submit"
                              className="cursor-pointer rounded border border-slate-600/50 bg-slate-700/60 px-2 py-1 text-[10px] font-semibold text-blue-400 transition-all hover:bg-slate-600 hover:text-blue-300"
                            >
                              ➔ Set Pre-Approval
                            </button>
                          </form>
                        ) : null}
                        {item.stage === "PRE_APPROVAL" ? (
                          <form
                            action={updateOpportunityStage.bind(
                              null,
                              item.id,
                              "HOME_SHOPPING",
                            )}
                          >
                            <button
                              type="submit"
                              className="cursor-pointer rounded border border-slate-600/50 bg-slate-700/60 px-2 py-1 text-[10px] font-semibold text-amber-400 transition-all hover:bg-slate-600 hover:text-amber-300"
                            >
                              ➔ Set Shopping
                            </button>
                          </form>
                        ) : null}
                        {item.stage === "HOME_SHOPPING" ? (
                          <form
                            action={updateOpportunityStage.bind(
                              null,
                              item.id,
                              "UNDER_CONTRACT",
                            )}
                          >
                            <button
                              type="submit"
                              className="cursor-pointer rounded border border-slate-600/50 bg-slate-700/60 px-2 py-1 text-[10px] font-semibold text-purple-400 transition-all hover:bg-slate-600 hover:text-purple-300"
                            >
                              ➔ Set Under Contract
                            </button>
                          </form>
                        ) : null}
                        {item.stage === "UNDER_CONTRACT" ? (
                          <form
                            action={updateOpportunityStage.bind(
                              null,
                              item.id,
                              "CLOSING_ROOM",
                            )}
                          >
                            <button
                              type="submit"
                              className="cursor-pointer rounded border border-slate-600/50 bg-slate-700/60 px-2 py-1 text-[10px] font-semibold text-emerald-400 transition-all hover:bg-slate-600 hover:text-emerald-300"
                            >
                              ➔ Set Closing Room
                            </button>
                          </form>
                        ) : null}
                        <form action={archiveOpportunity.bind(null, item.id)}>
                          <button
                            type="submit"
                            className="cursor-pointer rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-red-400 transition-all hover:border-red-500/20 hover:bg-red-500/10"
                          >
                            Archive Record
                          </button>
                        </form>
                      </div>

                      {aiInsights ? (
                        <div className="mt-3 space-y-2 rounded-lg border border-blue-500/10 bg-blue-500/5 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                              AI Copilot Analysis
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              Confidence:{" "}
                              <span className="font-bold text-emerald-400">
                                {(
                                  (aiInsights.confidenceScore || 0) * 100
                                ).toFixed(0)}
                                %
                              </span>
                            </span>
                          </div>

                          <p className="text-xs text-slate-300">
                            <span className="font-semibold text-slate-400">
                              Next Action:
                            </span>{" "}
                            {aiInsights.nextStepAction}
                          </p>

                          <div className="mt-1 flex items-center justify-between gap-4 rounded border border-slate-700/40 bg-slate-900/40 p-2">
                            <p className="text-[10px] text-slate-400">
                              <span className="font-semibold text-slate-500">
                                Predicted Trajectory:
                              </span>{" "}
                              <span className="font-mono font-bold text-blue-400">
                                {aiInsights.suggestedStage}
                              </span>
                            </p>

                            {item.stage !== aiInsights.suggestedStage ? (
                              <form
                                action={updateOpportunityStage.bind(
                                  null,
                                  item.id,
                                  aiInsights.suggestedStage,
                                  "AI_ACCEPTED",
                                )}
                              >
                                <button
                                  type="submit"
                                  className="cursor-pointer rounded border border-blue-500 bg-blue-600/80 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-blue-500"
                                >
                                  Accept Suggestion
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <OutreachDraftTray opportunityId={item.id} />
                    {/* Document Vault Ingestion Channel */}
                    <AttachmentTray opportunityId={item.id} />
                    <div className="flex items-center justify-between border-t border-slate-700/60 pt-3">
                      <span className="font-mono text-[10px] text-slate-500">
                        Logged:{" "}
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        $
                        {Number(item.estimated_value).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 },
                        )}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
