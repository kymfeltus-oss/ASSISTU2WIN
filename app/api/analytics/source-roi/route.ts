import {
  aggregateSourceRoi,
  fetchAnalyticsLeadsInRange,
  parseIsoDateRange,
  parseSourceRoiLimit,
} from "@/lib/analytics/dashboard-metrics";
import {
  analyticsJsonError,
  requireAnalyticsAuth,
} from "@/lib/analytics/route-auth";
import type { SourceRoiSuccessResponse } from "@/lib/analytics/types";
import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import { NextResponse } from "next/server";

const ROUTE_LABEL = "SOURCE_ROI";

export async function GET(
  request: Request,
): Promise<NextResponse<SourceRoiSuccessResponse | { ok: false; code: string; message: string }>> {
  const auth = await requireAnalyticsAuth(ROUTE_LABEL);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const rangeResult = parseIsoDateRange(
    url.searchParams.get("from"),
    url.searchParams.get("to"),
  );
  if (!rangeResult.ok) {
    return analyticsJsonError(400, "INVALID_QUERY", rangeResult.message);
  }

  const limitResult = parseSourceRoiLimit(url.searchParams.get("limit"));
  if (!limitResult.ok) {
    return analyticsJsonError(400, "INVALID_QUERY", limitResult.message);
  }

  try {
    const leadsResult = await fetchAnalyticsLeadsInRange(
      auth.supabase,
      rangeResult.range,
      ROUTE_LABEL,
    );

    if (!leadsResult.ok) {
      return analyticsJsonError(500, "QUERY_FAILED", leadsResult.message);
    }

    const sources = aggregateSourceRoi(leadsResult.leads, limitResult.limit);

    const body: SourceRoiSuccessResponse = {
      ok: true,
      from: rangeResult.range.fromIso,
      to: rangeResult.range.toIso,
      sources,
    };

    return NextResponse.json(body);
  } catch (caught: unknown) {
    console.error(
      `[ANALYTICS_${ROUTE_LABEL}] handler_exception ${safeJsonStringify(serializeSupabaseError(caught))}`,
    );
    return analyticsJsonError(
      500,
      "INTERNAL_ERROR",
      "Source ROI analytics failed.",
    );
  }
}
