"use client";

import { Bell, Filter, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent } from "react";

const CARD_SHADOW =
  "0 4px 16px rgba(0, 0, 0, 0.25), 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)";

export function DashboardUtilityBar() {
  const router = useRouter();

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim();
    const params = query.length > 0 ? `?q=${encodeURIComponent(query)}` : "";
    router.push(`/dashboard/search${params}`);
  }

  return (
    <div
      className="sticky top-0 z-20 mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel-alpha)] p-3 backdrop-blur-xl sm:p-4"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-1 basis-full sm:basis-[min(100%,12.5rem)]">
        <label className="relative flex w-full max-w-2xl items-center">
          <Sparkles
            className="pointer-events-none absolute left-3 h-4 w-4 text-[color:var(--violet)]"
            style={{ filter: "drop-shadow(0 0 6px rgba(167, 139, 250, 0.6))" }}
            aria-hidden
          />
          <input
            type="search"
            name="q"
            placeholder="AssistU2Win Search - Ask AI anything..."
            className="w-full rounded-xl border border-[rgba(0,242,254,0.25)] bg-[linear-gradient(135deg,rgba(0,242,254,0.08)_0%,rgba(167,139,250,0.08)_100%)] py-2.5 pr-10 pl-10 text-sm text-[color:var(--text-primary)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--cyan)] focus:shadow-[0_0_16px_rgba(0,242,254,0.2)]"
            style={{ minHeight: "var(--touch-target-min)" }}
          />
          <button
            type="submit"
            className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--text-muted)] transition hover:text-[color:var(--cyan)]"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </label>
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--line)] bg-[#0b1020]/80 text-[color:var(--text-muted)] transition hover:border-[color:var(--cyan)]/40 hover:text-[color:var(--cyan)]"
          aria-label="Filters"
        >
          <Filter className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--line)] bg-[#0b1020]/80 text-[color:var(--text-muted)] transition hover:border-[color:var(--cyan)]/40 hover:text-[color:var(--cyan)]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
