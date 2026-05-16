import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { restoreOpportunity } from "../leads/actions";

export const dynamic = "force-dynamic";

type ArchivedRow = {
  id: string;
  title: string;
  company: string;
  stage: string;
  estimated_value: number;
  updated_at: string;
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ArchivePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filter = params.q?.trim().toLowerCase() ?? "";

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  let rows: ArchivedRow[] = [];
  try {
    const { data, error: queryError } = await supabase
      .from("opportunities")
      .select("id, title, company, stage, estimated_value, updated_at")
      .eq("user_id", user.id)
      .eq("is_archived", true)
      .order("updated_at", { ascending: false });

    if (queryError) {
      console.error("[ARCHIVE_QUERY_FAILURE]", { message: queryError.message });
    } else {
      rows = (data ?? []) as ArchivedRow[];
    }
  } catch (error: unknown) {
    console.error("[ARCHIVE_QUERY_EXCEPTION]", { error });
  }

  const filtered =
    filter.length > 0
      ? rows.filter(
          (r) =>
            r.title.toLowerCase().includes(filter) ||
            r.company.toLowerCase().includes(filter) ||
            r.stage.toLowerCase().includes(filter),
        )
      : rows;

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
                  className="pb-1 text-slate-400 transition-colors hover:text-slate-200"
                >
                  Telemetry
                </Link>
                <Link
                  href="/dashboard/archive"
                  className="border-b-2 border-blue-500 pb-1.5 pt-1 font-bold text-blue-400"
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

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
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
              <span className="text-slate-300">Archive Ledger</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Pipeline Archive
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Soft-deleted opportunities. Filter by title, company, or stage,
              then restore to active grids.
            </p>
          </div>
        </div>

        <form
          method="GET"
          className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4 sm:flex-row sm:items-center"
        >
          <div className="flex-1">
            <label
              htmlFor="archive-filter"
              className="mb-1 block text-[10px] font-medium tracking-wider text-slate-400 uppercase"
            >
              Filter records
            </label>
            <input
              id="archive-filter"
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Search title, company, or stage…"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 sm:pt-5">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
            >
              Apply filter
            </button>
            {filter ? (
              <Link
                href="/dashboard/archive"
                className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-800/40 shadow-lg">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              {rows.length === 0
                ? "No archived opportunities. Records you archive will appear here."
                : "No rows match this filter. Try a different search term."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-900/80">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      Title
                    </th>
                    <th className="px-4 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      Company
                    </th>
                    <th className="px-4 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      Stage
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      Value
                    </th>
                    <th className="px-4 py-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      Updated
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-slate-800/50"
                    >
                      <td className="max-w-[200px] truncate px-4 py-3 font-medium text-white">
                        {row.title}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-slate-300">
                        {row.company}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] text-blue-300">
                          {row.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-emerald-400">
                        $
                        {Number(row.estimated_value).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                        {new Date(row.updated_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={restoreOpportunity.bind(null, row.id)}>
                          <button
                            type="submit"
                            className="rounded-md border border-emerald-500/30 bg-emerald-600/20 px-2.5 py-1 text-[10px] font-bold text-emerald-300 transition-colors hover:bg-emerald-600/35"
                          >
                            Restore Record
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
