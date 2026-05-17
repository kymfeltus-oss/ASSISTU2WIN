import type { AnalyticsErrorResponse } from "@/lib/analytics/types";
import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type AuthSuccess = {
  readonly ok: true;
  readonly supabase: Awaited<ReturnType<typeof createClient>>;
  readonly userId: string;
};

type AuthFailure = {
  readonly ok: false;
  readonly response: NextResponse<AnalyticsErrorResponse>;
};

export function analyticsJsonError(
  status: number,
  code: AnalyticsErrorResponse["code"],
  message: string,
): NextResponse<AnalyticsErrorResponse> {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export async function requireAnalyticsAuth(
  routeLabel: string,
): Promise<AuthSuccess | AuthFailure> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return {
        ok: false,
        response: analyticsJsonError(401, "UNAUTHORIZED", "Sign in required."),
      };
    }

    return { ok: true, supabase, userId: user.id };
  } catch (caught: unknown) {
    console.error(
      `[ANALYTICS_${routeLabel}] auth_exception ${safeJsonStringify(serializeSupabaseError(caught))}`,
    );
    return {
      ok: false,
      response: analyticsJsonError(
        500,
        "INTERNAL_ERROR",
        "Authentication check failed.",
      ),
    };
  }
}
