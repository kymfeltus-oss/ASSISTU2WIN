import { generateMasterScanUrl } from "@/lib/qr-service";

/**
 * Displays the canonical URL for the printed master QR (smart gate at `/scan`).
 */
export function AdminMasterScanUrl() {
  let masterScanUrl: string;
  try {
    masterScanUrl = generateMasterScanUrl();
  } catch {
    masterScanUrl = "Configure NEXT_PUBLIC_APP_URL to generate the master QR URL.";
  }

  return (
    <section className="mb-5 rounded-2xl border border-[#00F2FE]/25 bg-[rgba(0,242,254,0.06)] p-4">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-[#00F2FE] uppercase">
        Master physical QR
      </p>
      <p className="mt-1 text-sm text-[#94A3B8]">
        Encode this URL on the printed smart gate QR. New scans → intake; returning leads →
        download.
      </p>
      <code className="mt-3 block break-all rounded-lg border border-[#1E2A44] bg-[#0f172a] px-3 py-2 text-xs text-[#F8FAFC]">
        {masterScanUrl}
      </code>
    </section>
  );
}
