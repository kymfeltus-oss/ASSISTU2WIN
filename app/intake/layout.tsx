import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Assist U 2 Win | Buyer intake",
  description: "Share your contact details and communication preferences with your agent.",
};

/** Sanctuary theme for QR scans — scoped to intake, not global dashboard canvas. */
export default function IntakeLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="min-h-dvh w-full min-w-0 app-overflow-x-clip bg-[#0f172a] text-slate-100">
      {children}
    </div>
  );
}
