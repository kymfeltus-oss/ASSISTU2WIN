import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createOpportunity, updateOpportunityStage } from "./actions";

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
    <div className="min-h-screen bg-slate-900 p-6 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Lead Intake Matrix
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Log new prospective opportunities or track your current active
            system operations.
          </p>
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
                {opportunities.map((item) => (
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
                      </div>
                    </div>
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
