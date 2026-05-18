import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Assist U 2 Win | Buyer intake",
  description: "Share your contact details and communication preferences with your agent.",
};

export default function IntakeLayout({ children }: { readonly children: ReactNode }) {
  return <>{children}</>;
}
