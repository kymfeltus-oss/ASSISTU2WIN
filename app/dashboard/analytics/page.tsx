import { createClient } from "@/lib/supabase/server";
import { parseDealStage, type DealStage } from "@/lib/deal-stage";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type OpportunityMetricsRow = {
  estimated_value: number | string | null;
  stage: string | null;
  created_at: string;
};

function numericValue(raw: number | string | null | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : 0;
  }
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  let opportunities: OpportunityMetricsRow[] = [];
  try {
    const { data, error: queryError } = await supabase
      .from("opportunities")
      .select("estimated_value, stage, created_at")
      .eq("user_id", user.id)
      .eq("is_archived", false);

    if (queryError) {
      console.error("[ANALYTICS_QUERY_FAILURE]:", queryError);
    } else {
      opportunities = (data ?? []) as OpportunityMetricsRow[];
    }
  } catch (error) {
    console.error("[ANALYTICS_QUERY_FAILURE]:", error);
  }

  const totalCount = opportunities.length;

  const totalValue = opportunities.reduce(
    (acc, curr) => acc + numericValue(curr.estimated_value),
    0,
  );

  const averageValue = totalCount > 0 ? totalValue / totalCount : 0;

  let intakeCount = 0;
  let progressCount = 0;
  let wonCount = 0;

  opportunities.forEach((item) => {
    const stage: DealStage = parseDealStage(item.stage) ?? "INTAKE";
    if (stage === "INTAKE") {
      intakeCount++;
    } else if (stage === "CLOSING_ROOM") {
      wonCount++;
    } else {
      progressCount++;
    }
  });

  const conversionRate =
    totalCount > 0 ? ((wonCount / totalCount) * 100).toFixed(1) : "0.0";

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
                  className="pb-1 text-slate-400 transition-colors hover:text-slate-200"
                >
                  Lead Matrix
                </Link>
                <Link
                  href="/dashboard/analytics"
                  className="border-b-2 border-blue-500 pb-1.5 pt-1 font-bold text-blue-400"
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
        <div className="border-b border-slate-800 pb-6">
          <div>
            <div className="mb-1 flex items-center gap-2 font-mono text-xs text-slate-500">
              <Link
                href="/dashboard"
                className="transition-colors hover:text-blue-400"
              >
                Workspace
              </Link>
              <span>/</span>
              <span className="text-slate-300">Analytics Telemetry</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              System Performance Matrix
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Advanced financial overview and pipeline health statistics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="space-y-1 rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Gross Equity Volume
            </span>
            <p className="font-mono text-xl font-bold text-white">
              $
              {totalValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="space-y-1 rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Mean Opportunity Value
            </span>
            <p className="font-mono text-xl font-bold text-blue-400">
              $
              {averageValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="space-y-1 rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Conversion Efficiency
            </span>
            <p className="font-mono text-xl font-bold text-emerald-400">
              {conversionRate}%
            </p>
          </div>
          <div className="space-y-1 rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Total Logged Nodes
            </span>
            <p className="font-mono text-xl font-bold text-white">
              {totalCount} Deals
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-md">
          <h2 className="text-base font-semibold tracking-tight text-white">
            Pipeline Stage Densities
          </h2>
          <div className="divide-y divide-slate-700 font-mono text-xs">
            <div className="flex justify-between py-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              <span>Stage Bucket classification</span>
              <span>Distribution Weight</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-blue-400">Leads & Intake Volume</span>
              <span className="text-white">
                {intakeCount} Records (
                {totalCount > 0
                  ? ((intakeCount / totalCount) * 100).toFixed(0)
                  : 0}
                %)
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-amber-400">
                Active Negotiation / Progress
              </span>
              <span className="text-white">
                {progressCount} Records (
                {totalCount > 0
                  ? ((progressCount / totalCount) * 100).toFixed(0)
                  : 0}
                %)
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-emerald-400">
                Closed Wins / Closing Room
              </span>
              <span className="text-white">
                {wonCount} Records (
                {totalCount > 0
                  ? ((wonCount / totalCount) * 100).toFixed(0)
                  : 0}
                %)
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
