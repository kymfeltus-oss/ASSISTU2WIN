import { AnalyticsCommandReport } from "@/app/dashboard/analytics/AnalyticsCommandReport";
import {
  buildCommandReportMetrics,
  leadRowToOpportunityMetrics,
  type OpportunityMetricsRow,
} from "@/app/dashboard/analytics/build-command-report-metrics";
import { createClient } from "@/lib/supabase/server";
import { serializeSupabaseError } from "@/lib/supabase/errors";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assist U2 Win Analytics Command Report",
};

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
      .from("leads")
      .select("target_budget, current_status")
      .neq("current_status", "Closed");

    if (queryError) {
      console.error(
        "[ANALYTICS_QUERY_FAILURE]",
        serializeSupabaseError(queryError),
      );
    } else {
      opportunities = (data ?? []).map(leadRowToOpportunityMetrics);
    }
  } catch (error) {
    console.error("[ANALYTICS_QUERY_FAILURE]", serializeSupabaseError(error));
  }

  const metrics = buildCommandReportMetrics(opportunities);

  return <AnalyticsCommandReport metrics={metrics} />;
}
