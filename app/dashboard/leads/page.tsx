import { AppBrand } from "@/components/AppBrand";
import { getAdminSession } from "@/lib/auth/admin";
import { coerceLeadRow, type LeadRecord } from "@/lib/leads/types";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LeadsWorkspace } from "./LeadsWorkspace";

export const dynamic = "force-dynamic";

type PageProps = {
  readonly searchParams: Promise<{ readonly lead?: string }>;
};

export default async function LeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  const adminSession = await getAdminSession();
  if (!adminSession?.isAdmin) {
    return (
      <AdminShell>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
          <h2 className="text-lg font-semibold text-amber-200">
            Admin access required
          </h2>
          <p className="mt-2 text-sm text-amber-100/80">
            Your account is not flagged as a platform admin. In Supabase SQL
            Editor, run:
          </p>
          <code className="mt-3 block rounded-lg bg-slate-900 px-3 py-2 text-left text-xs text-slate-200">
            UPDATE profiles SET is_admin = true WHERE id = &apos;{user.id}&apos;;
          </code>
          <p className="mt-3 text-xs text-amber-100/60">
            Then refresh this page.
          </p>
        </div>
      </AdminShell>
    );
  }

  let leads: LeadRecord[] = [];
  try {
    const { data, error: queryError } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("[LEADS_PIPELINE_QUERY]", { message: queryError.message });
    } else {
      leads = (data ?? []).map((row) =>
        coerceLeadRow(row as Record<string, unknown>),
      );
    }
  } catch (error: unknown) {
    console.error("[LEADS_PIPELINE_EXCEPTION]", { error });
  }

  const selectedLeadId =
    typeof params.lead === "string" && params.lead.length > 0
      ? params.lead
      : (leads[0]?.id ?? null);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 font-mono text-xs text-slate-500">
            <Link
              href="/dashboard"
              className="transition-colors hover:text-blue-400"
            >
              Workspace
            </Link>
            <span>/</span>
            <span className="text-slate-300">Admin Lead Intake</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Lead Intake Pipeline
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Central admin hub for buyer registration, AI copilot parsing, and
            pipeline status — structured for future homebuyer, lender, and title
            portals.
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs text-slate-400">
          Webhook:{" "}
          <code className="text-emerald-400">POST /api/copilot-intake</code>
        </div>
      </div>

      <LeadsWorkspace leads={leads} selectedLeadId={selectedLeadId} />
    </AdminShell>
  );
}

function AdminShell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <AppBrand />
              <div className="flex items-center gap-4 font-mono text-xs">
                <Link
                  href="/dashboard"
                  className="pb-1 text-slate-400 transition-colors hover:text-slate-200"
                >
                  Overview
                </Link>
                <Link
                  href="/dashboard/leads"
                  className="border-b-2 border-blue-500 pb-1.5 pt-1 font-bold text-blue-400"
                >
                  Lead Matrix
                </Link>
                <Link
                  href="/dashboard/analytics"
                  className="pb-1 text-slate-400 transition-colors hover:text-slate-200"
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
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
