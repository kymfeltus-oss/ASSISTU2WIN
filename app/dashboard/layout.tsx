import { DashboardAppShell } from "@/components/dashboard/DashboardAppShell";
import { greatVibes } from "@/lib/fonts";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
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

  return (
    <div className={greatVibes.variable}>
      <DashboardAppShell>{children}</DashboardAppShell>
    </div>
  );
}
