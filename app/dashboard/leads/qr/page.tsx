import { AdminMasterScanUrl } from "@/components/AdminMasterScanUrl";
import AdminQRGenerator, {
  type QrGeneratorLeadOption,
} from "@/components/AdminQRGenerator";
import { adminIntakeTheme } from "@/components/leads/intake/admin-intake-theme";
import { coerceLeadRow } from "@/lib/leads/types";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LeadsQrGeneratorPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("leads")
    .select("id, lead_name")
    .order("lead_name", { ascending: true });

  if (error) {
    console.error("[QR_GENERATOR_LEADS_FETCH]", { message: error.message });
  }

  const leads: QrGeneratorLeadOption[] = (rows ?? []).map((row) => {
    const lead = coerceLeadRow(row as Record<string, unknown>);
    return { id: lead.id, lead_name: lead.lead_name };
  });

  return (
    <div className={adminIntakeTheme.page}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#94A3B8] uppercase">
            Lead tools
          </p>
          <h1 className="text-xl font-semibold text-[#F8FAFC]">QR generator</h1>
        </div>
        <Link
          href="/dashboard/leads/intake"
          className="text-xs font-semibold text-[#00F2FE] hover:text-[#00F2FE]/80"
        >
          ← Back to intake
        </Link>
      </div>
      <AdminMasterScanUrl />
      <AdminQRGenerator leads={leads} />
    </div>
  );
}
