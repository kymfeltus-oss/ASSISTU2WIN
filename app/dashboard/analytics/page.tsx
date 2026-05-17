import { AnalyticsCommandReport } from "@/app/dashboard/analytics/AnalyticsCommandReport";
import {
  buildCommandReportMetrics,
  leadRowToPipelineMetrics,
  type LeadPipelineRow,
} from "@/app/dashboard/analytics/build-command-report-metrics";
import type { CommandReportDataState } from "@/app/dashboard/analytics/command-report-types";
import { createClient } from "@/lib/supabase/server";
import { serializeSupabaseError } from "@/lib/supabase/errors";
import {
  isRlsOrPermissionError,
  type PostgrestErrorLike,
} from "@/lib/supabase/postgrest";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assist U2 Win Analytics Command Report",
};

function isLeadsTableUnavailable(error: PostgrestErrorLike): boolean {
  if (error.code === "PGRST205") {
    return true;
  }
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("public.leads") ||
    message.includes("table 'leads'") ||
    message.includes('table "leads"')
  );
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

  let dataState: CommandReportDataState = "empty";
  let leadPipeline: LeadPipelineRow[] = [];

  try {
    const { data, error: queryError } = await supabase
      .from("leads")
      .select("target_budget, current_status, financing_type")
      .neq("current_status", "Closed")
      .order("updated_at", { ascending: false });

    if (queryError) {
      console.error(
        "[ANALYTICS_LEADS_QUERY_FAILURE]",
        serializeSupabaseError(queryError),
      );
      dataState =
        isLeadsTableUnavailable(queryError) || isRlsOrPermissionError(queryError)
          ? "unavailable"
          : "unavailable";
    } else if ((data ?? []).length === 0) {
      dataState = "empty";
    } else {
      leadPipeline = (data ?? []).map(leadRowToPipelineMetrics);
      dataState = "available";
    }
  } catch (error) {
    console.error(
      "[ANALYTICS_LEADS_QUERY_FAILURE]",
      serializeSupabaseError(error),
    );
    dataState = "unavailable";
  }

  const metrics = buildCommandReportMetrics(leadPipeline);

  return <AnalyticsCommandReport metrics={metrics} dataState={dataState} />;
}
