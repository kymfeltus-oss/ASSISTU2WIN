import { greatVibes } from "@/lib/fonts";

export default function ScanLayout({ children }: { readonly children: React.ReactNode }) {
  return <div className={greatVibes.variable}>{children}</div>;
}
