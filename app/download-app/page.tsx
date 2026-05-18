import { ScanDownloadScreen } from "@/components/scan/ScanDownloadScreen";
import { getLeadScanState } from "@/lib/scan/get-lead-scan-state";
import { readLeadIdCookie } from "@/lib/scan/lead-cookie";
import { MASTER_QR_INTAKE_PATH } from "@/lib/scan/routes";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Download Assist U 2 Win",
  description: "Get the AssistU2Win app for your intelligent home-buying command center.",
};

export default async function DownloadAppPage() {
  const cookieStore = await cookies();
  const leadId = readLeadIdCookie(cookieStore);

  if (!leadId) {
    redirect(MASTER_QR_INTAKE_PATH);
  }

  const scanState = await getLeadScanState(leadId);

  if (!scanState) {
    redirect(MASTER_QR_INTAKE_PATH);
  }

  return <ScanDownloadScreen isActiveClient={scanState.isActiveClient} />;
}
