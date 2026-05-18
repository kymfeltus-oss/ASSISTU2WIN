import { ScanLoadingGate } from "@/components/scan/ScanLoadingGate";
import {
  DOWNLOAD_APP_PATH,
  MASTER_QR_INTAKE_PATH,
} from "@/lib/scan/routes";
import { readLeadIdCookie } from "@/lib/scan/lead-cookie";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assist U 2 Win",
  description: "AssistU2Win intelligent home-buying command.",
};

/**
 * Smart gate for the physical master QR (`https://assistu2winapp.com/scan`).
 * Server reads `lead_id` cookie; client shows 1.5s laser-cyan pulse then navigates.
 */
export default async function ScanPage() {
  const cookieStore = await cookies();
  const leadId = readLeadIdCookie(cookieStore);

  const destination = leadId ? DOWNLOAD_APP_PATH : MASTER_QR_INTAKE_PATH;

  return <ScanLoadingGate destination={destination} />;
}
