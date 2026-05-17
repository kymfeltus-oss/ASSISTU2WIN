import {
  DEFAULT_LAYOUT_CONFIG,
  deleteDashboardLayoutConfig,
  isValidLayoutConfig,
  isValidPageKey,
  LEADS_DASHBOARD_PAGE_KEY,
  loadDashboardLayoutConfig,
  normalizeLayoutConfig,
  saveDashboardLayoutConfig,
  type DashboardLayoutConfig,
  type LayoutConfigSource,
} from "@/lib/dashboard/layout-config";
import { safeJsonStringify, serializeSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type LayoutErrorCode =
  | "INVALID_QUERY"
  | "INVALID_PAYLOAD"
  | "UNAUTHORIZED"
  | "SAVE_FAILED"
  | "DELETE_FAILED"
  | "INTERNAL_ERROR";

type LayoutErrorResponse = {
  readonly ok: false;
  readonly code: LayoutErrorCode;
  readonly message: string;
};

type LayoutGetSuccessResponse = {
  readonly ok: true;
  readonly config: DashboardLayoutConfig;
  readonly source: LayoutConfigSource;
};

type LayoutPutSuccessResponse = {
  readonly ok: true;
  readonly config: DashboardLayoutConfig;
};

function jsonError(
  status: number,
  code: LayoutErrorCode,
  message: string,
): NextResponse<LayoutErrorResponse> {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function logLayoutRouteFailure(
  event: string,
  context: Record<string, unknown>,
): void {
  console.error(`[DASHBOARD_LAYOUT] ${event} ${safeJsonStringify(context)}`);
}

function resolvePageKey(
  value: string | null,
): { readonly ok: true; readonly pageKey: typeof LEADS_DASHBOARD_PAGE_KEY } | { readonly ok: false } {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { ok: true, pageKey: LEADS_DASHBOARD_PAGE_KEY };
  }
  if (isValidPageKey(trimmed)) {
    return { ok: true, pageKey: trimmed };
  }
  return { ok: false };
}

async function requireAuth(): Promise<
  | {
      readonly ok: true;
      readonly supabase: Awaited<ReturnType<typeof createClient>>;
      readonly userId: string;
    }
  | { readonly ok: false; readonly response: NextResponse<LayoutErrorResponse> }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return {
        ok: false,
        response: jsonError(401, "UNAUTHORIZED", "Sign in required."),
      };
    }

    return { ok: true, supabase, userId: user.id };
  } catch (caught: unknown) {
    logLayoutRouteFailure("auth_exception", serializeSupabaseError(caught));
    return {
      ok: false,
      response: jsonError(500, "INTERNAL_ERROR", "Authentication check failed."),
    };
  }
}

export async function GET(
  request: Request,
): Promise<NextResponse<LayoutGetSuccessResponse | LayoutErrorResponse>> {
  const auth = await requireAuth();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const pageKeyResult = resolvePageKey(url.searchParams.get("pageKey"));
  if (!pageKeyResult.ok) {
    return jsonError(400, "INVALID_QUERY", "Unsupported pageKey.");
  }

  const loaded = await loadDashboardLayoutConfig(
    auth.supabase,
    auth.userId,
    pageKeyResult.pageKey,
  );

  return NextResponse.json({
    ok: true,
    config: loaded.config,
    source: loaded.source,
  });
}

export async function PUT(
  request: Request,
): Promise<NextResponse<LayoutPutSuccessResponse | LayoutErrorResponse>> {
  const auth = await requireAuth();
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_PAYLOAD", "Request body must be valid JSON.");
  }

  if (body === null || typeof body !== "object") {
    return jsonError(400, "INVALID_PAYLOAD", "Invalid layout payload.");
  }

  const record = body as Record<string, unknown>;
  const pageKeyRaw = typeof record.pageKey === "string" ? record.pageKey : "";
  if (!isValidPageKey(pageKeyRaw)) {
    return jsonError(400, "INVALID_PAYLOAD", "Unsupported pageKey.");
  }

  if (!isValidLayoutConfig(record.config)) {
    return jsonError(400, "INVALID_PAYLOAD", "Invalid layout config shape.");
  }

  const normalized = normalizeLayoutConfig(record.config);
  const saved = await saveDashboardLayoutConfig(
    auth.supabase,
    auth.userId,
    pageKeyRaw,
    normalized,
  );

  if (!saved.ok) {
    return jsonError(500, "SAVE_FAILED", saved.message);
  }

  return NextResponse.json({ ok: true, config: normalized });
}

export async function DELETE(
  request: Request,
): Promise<NextResponse<LayoutGetSuccessResponse | LayoutErrorResponse>> {
  const auth = await requireAuth();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const pageKeyResult = resolvePageKey(url.searchParams.get("pageKey"));
  if (!pageKeyResult.ok) {
    return jsonError(400, "INVALID_QUERY", "Unsupported pageKey.");
  }

  const deleted = await deleteDashboardLayoutConfig(
    auth.supabase,
    auth.userId,
    pageKeyResult.pageKey,
  );

  if (!deleted.ok) {
    return jsonError(500, "DELETE_FAILED", deleted.message);
  }

  return NextResponse.json({
    ok: true,
    config: DEFAULT_LAYOUT_CONFIG,
    source: "default",
  });
}
