import { createClient } from "@/lib/supabase/server";
import { type DealStage, parseDealStage } from "@/lib/deal-stage";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type OpportunityRow = {
  id: string;
  user_id: string;
  estimated_value: number | string | null;
  stage: string | null;
};

type PipelineBucketKey = "intake" | "progress" | "won";

type StatCard = {
  name: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
};

type PipelineGroup = {
  stage: string;
  count: number;
  value: string;
  color: string;
};

function toEstimatedNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Maps canonical `DealStage` values to the three dashboard financial columns. */
function mapStageToPipelineBucket(stage: DealStage): PipelineBucketKey {
  switch (stage) {
    case "INTAKE":
      return "intake";
    case "PRE_APPROVAL":
    case "HOME_SHOPPING":
    case "UNDER_CONTRACT":
      return "progress";
    case "CLOSING_ROOM":
      return "won";
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
}

function resolveDealStage(raw: unknown): DealStage {
  return parseDealStage(raw) ?? "INTAKE";
}

function reducePipelineBuckets(opportunities: readonly OpportunityRow[]) {
  const buckets: Record<
    PipelineBucketKey,
    { count: number; value: number }
  > = {
    intake: { count: 0, value: 0 },
    progress: { count: 0, value: 0 },
    won: { count: 0, value: 0 },
  };

  for (const item of opportunities) {
    const stage = resolveDealStage(item.stage);
    const bucket = mapStageToPipelineBucket(stage);
    const value = toEstimatedNumber(item.estimated_value);
    buckets[bucket].count += 1;
    buckets[bucket].value += value;
  }

  return buckets;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  let fullName = "Operator";
  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[DASHBOARD_PROFILE]", { message: profileError.message });
    } else if (profile?.full_name && profile.full_name.trim().length > 0) {
      fullName = profile.full_name.trim();
    }
  } catch (error: unknown) {
    console.error("[DASHBOARD_PROFILE_FAILURE]", { error });
  }

  let opportunities: OpportunityRow[] = [];
  try {
    const { data, error: queryError } = await supabase
      .from("opportunities")
      .select("id, user_id, estimated_value, stage")
      .eq("user_id", user.id);

    if (queryError) {
      throw queryError;
    }
    opportunities = (data ?? []) as OpportunityRow[];
  } catch (error: unknown) {
    console.error("[DASHBOARD_PIPELINE_QUERY_FAILURE]", { error });
  }

  const activeCount = opportunities.length;

  const totalValue = opportunities.reduce<number>(
    (acc, curr) => acc + toEstimatedNumber(curr.estimated_value),
    0,
  );

  const { intake, progress, won } = reducePipelineBuckets(opportunities);

  const winRate =
    activeCount > 0 ? ((won.count / activeCount) * 100).toFixed(1) : "0.0";

  const stats: readonly StatCard[] = [
    {
      name: "Active Opportunities",
      value: activeCount.toString(),
      change: "Live Matrix",
      changeType: "positive",
    },
    {
      name: "Conversion Win Rate",
      value: `${winRate}%`,
      change: "Closed Deals",
      changeType: "positive",
    },
    {
      name: "Total Pipeline Value",
      value: `$${totalValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}`,
      change: "Gross Equity",
      changeType: "positive",
    },
  ];

  const pipelineSummary: readonly PipelineGroup[] = [
    {
      stage: "Leads & Intake",
      count: intake.count,
      value: `$${intake.value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}`,
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      stage: "In Progress / Negotiation",
      count: progress.count,
      value: `$${progress.value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}`,
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    {
      stage: "Closed Won",
      count: won.count,
      value: `$${won.value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}`,
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                AssistU2Win
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                Workspace v1.0
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium text-slate-300">{fullName}</p>
                <p className="text-[10px] text-slate-500">Authenticated Member</p>
              </div>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome Back, {fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Here is your live enterprise workspace matrix overview for today.
            </p>
          </div>
          <Link
            href="/dashboard/leads"
            className="inline-flex h-fit w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Manage Lead Intake
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.name}
              className="space-y-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-md"
            >
              <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                {item.name}
              </p>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-semibold tracking-tight text-white">
                  {item.value}
                </p>
                <span className="inline-flex items-center rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-300">
                  {item.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Stage Pipeline Health
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {pipelineSummary.map((group) => {
              const safeDenominator = activeCount > 0 ? activeCount : 1;
              const percentage = Math.min(
                100,
                Math.max(0, (group.count / safeDenominator) * 100),
              );

              return (
                <div
                  key={group.stage}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-slate-300">
                        {group.stage}
                      </h3>
                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-xs font-medium ${group.color}`}
                      >
                        {group.count} deals
                      </span>
                    </div>
                    <p className="mt-3 text-xl font-bold tracking-tight text-white">
                      {group.value}
                    </p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {activeCount === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center">
            <h3 className="text-sm font-semibold text-slate-200">
              No active workflows initiated
            </h3>
            <p className="mx-auto mt-1 mb-4 max-w-sm text-xs text-slate-400">
              Get started by adding a pipeline lead or synchronizing an AI
              communication flow to populate live diagnostic activities.
            </p>
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-600"
            >
              Open Lead Matrix
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
