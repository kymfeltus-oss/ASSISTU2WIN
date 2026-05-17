import {
  aggregateConversionVelocity,
  fetchAnalyticsAppointmentsForLeads,
  fetchAnalyticsLeadsInRange,
  parseIsoDateRange,
} from "@/lib/analytics/dashboard-metrics";
import {
  analyticsJsonError,
  requireAnalyticsAuth,
} from "@/lib/analytics/route-auth";
import type { ConversionVelocitySuccessResponse } from "@/lib/analytics/types";
import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import { NextResponse } from "next/server";

const ROUTE_LABEL = "CONVERSION_VELOCITY";

export async function GET(
  request: Request,
): Promise<
  NextResponse<
    ConversionVelocitySuccessResponse | { ok: false; code: string; message: string }
  >
> {
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

  try {
    const leadsResult = await fetchAnalyticsLeadsInRange(
      auth.supabase,
      rangeResult.range,
      ROUTE_LABEL,
    );

    if (!leadsResult.ok) {
      return analyticsJsonError(500, "QUERY_FAILED", leadsResult.message);
    }

    const leadIds = leadsResult.leads.map((lead) => lead.id);
    const appointmentsResult = await fetchAnalyticsAppointmentsForLeads(
      auth.supabase,
      leadIds,
      ROUTE_LABEL,
    );

    if (!appointmentsResult.ok) {
      return analyticsJsonError(500, "QUERY_FAILED", appointmentsResult.message);
    }

    const velocity = aggregateConversionVelocity(
      leadsResult.leads,
      appointmentsResult.appointments,
    );

    const body: ConversionVelocitySuccessResponse = {
      ok: true,
      from: rangeResult.range.fromIso,
      to: rangeResult.range.toIso,
      ...velocity,
    };

    return NextResponse.json(body);
  } catch (caught: unknown) {
    console.error(
      `[ANALYTICS_${ROUTE_LABEL}] handler_exception ${safeJsonStringify(serializeSupabaseError(caught))}`,
    );
    return analyticsJsonError(
      500,
      "INTERNAL_ERROR",
      "Conversion velocity analytics failed.",
    );
  }
}
