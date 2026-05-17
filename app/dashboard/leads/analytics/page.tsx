import { redirect } from "next/navigation";

/** Buyer studio remains available via direct imports; command report is canonical here. */
export default function LeadsAnalyticsPage() {
  redirect("/dashboard/analytics");
}
