import type { DashboardLayoutConfig, LayoutConfigSource } from "@/lib/dashboard/layout-config";

export type LayoutGetResponse =
  | {
      readonly ok: true;
      readonly config: DashboardLayoutConfig;
      readonly source: LayoutConfigSource;
    }
  | { readonly ok: false; readonly code: string; readonly message: string };

export type LayoutPutResponse =
  | { readonly ok: true; readonly config: DashboardLayoutConfig }
  | { readonly ok: false; readonly code: string; readonly message: string };

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function fetchDashboardLayout(
  pageKey: string,
): Promise<LayoutGetResponse> {
  const params = new URLSearchParams({ pageKey });
  const response = await fetch(`/api/dashboard/layout?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
  return parseJsonResponse<LayoutGetResponse>(response);
}

export async function saveDashboardLayout(
  pageKey: string,
  config: DashboardLayoutConfig,
): Promise<LayoutPutResponse> {
  const response = await fetch("/api/dashboard/layout", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageKey, config }),
  });
  return parseJsonResponse<LayoutPutResponse>(response);
}

export async function resetDashboardLayout(
  pageKey: string,
): Promise<LayoutGetResponse> {
  const params = new URLSearchParams({ pageKey });
  const response = await fetch(`/api/dashboard/layout?${params.toString()}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseJsonResponse<LayoutGetResponse>(response);
}
