import { greatVibes } from "@/lib/fonts";

export default function DownloadAppLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return <div className={greatVibes.variable}>{children}</div>;
}
