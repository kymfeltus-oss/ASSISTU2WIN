import { AmbientWorkspace } from "@/components/leads/spatial/AmbientWorkspace";
import { LeadsProvider } from "@/components/leads/LeadsProvider";
import { getAdminSession } from "@/lib/auth/admin";
import { isRelaxedLogin } from "@/lib/auth/relaxed-login";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

const isDevGuest = isRelaxedLogin();

export default async function LeadsLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const adminSession = await getAdminSession();
  if (!adminSession?.isAdmin && !isDevGuest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060a14] px-4 text-slate-100">
        <div className="max-w-lg rounded-[1.75rem] border border-amber-500/20 bg-amber-500/10 p-8 text-center backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-amber-100">Admin access required</h2>
          <p className="mt-2 text-sm text-amber-100/80">
            Enable admin on your profile or use dev guest mode locally.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-semibold text-cyan-400"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <LeadsProvider>
      <AmbientWorkspace>{children}</AmbientWorkspace>
    </LeadsProvider>
  );
}
