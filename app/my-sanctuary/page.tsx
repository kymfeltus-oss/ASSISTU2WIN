import { AppBrand } from "@/components/AppBrand";
import { formatLeadBudget } from "@/lib/leads/lead-insights";
import { coerceLeadRow } from "@/lib/leads/types";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MySanctuaryPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?error=Sign+in+to+open+My+Sanctuary");
  }

  const { data: leadRow, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("buyer_user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (leadError) {
    console.error("[MY_SANCTUARY_LEAD_FETCH]", { message: leadError.message });
  }

  const lead = leadRow ? coerceLeadRow(leadRow as Record<string, unknown>) : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <AppBrand variant="auth" />
        <h1 className="text-xl font-semibold text-[color:var(--text-primary)]">
          My Sanctuary
        </h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          Your home-buying milestones and updates in one place.
        </p>
      </header>

      {lead ? (
        <section className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--panel)] p-6 shadow-lg">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#94A3B8] uppercase">
            Active buyer profile
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">
            {lead.lead_name}
          </h2>
          <dl className="mt-4 space-y-2 text-sm text-[color:var(--text-muted)]">
            <div className="flex justify-between gap-4">
              <dt>Status</dt>
              <dd className="font-medium text-[color:var(--text-primary)]">
                {lead.current_status}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Max budget</dt>
              <dd className="font-medium text-[color:var(--text-primary)]">
                {formatLeadBudget(lead.target_budget)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Lead source</dt>
              <dd className="font-medium text-[color:var(--text-primary)]">
                {lead.lead_source}
              </dd>
            </div>
          </dl>
          {lead.ai_next_best_action ? (
            <p className="mt-4 rounded-xl border border-[#00F2FE]/25 bg-[rgba(0,242,254,0.06)] px-3 py-2 text-sm text-cyan-100/90">
              Next step: {lead.ai_next_best_action}
            </p>
          ) : null}
        </section>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--panel)] p-6 text-center text-sm text-[color:var(--text-muted)]">
          <p>No buyer profile is linked to this account yet.</p>
          <p className="mt-2">
            Scan your agent&apos;s client invite QR or ask them to resend your portal link.
          </p>
        </section>
      )}

      <p className="text-center text-xs text-[color:var(--text-muted)]">
        <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
          Sign out / switch account
        </Link>
      </p>
    </div>
  );
}
