import { BRAND_LOGO_ALT, BRAND_LOGO_SRC } from "@/lib/branding";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Page not found | Assist U 2 Win",
  description: "This page could not be found. Return to your dashboard or buyer intake.",
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden bg-[#0f172a] px-4 py-12 text-slate-100">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0, 242, 254, 0.1), transparent 65%)",
        }}
        aria-hidden
      />

      <main className="relative z-10 w-full max-w-md text-center">
        <Image
          src={BRAND_LOGO_SRC}
          alt={BRAND_LOGO_ALT}
          width={160}
          height={48}
          className="mx-auto h-auto w-40 object-contain"
          priority
        />

        <p className="mt-8 text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
          404 · Page not found
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Lost your way?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Let&apos;s get you back to your Sanctuary.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/25 to-cyan-600/15 px-6 py-3 text-sm font-bold tracking-wide text-cyan-300 uppercase transition duration-300 hover:border-cyan-400/60 hover:from-cyan-500/35 hover:text-cyan-200"
            style={{
              boxShadow:
                "0 4px 24px rgba(0, 242, 254, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
            }}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/intake"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/50 px-6 py-3 text-sm font-semibold text-slate-300 transition duration-300 hover:border-slate-500 hover:bg-slate-800/60 hover:text-slate-100"
          >
            Buyer intake
          </Link>
        </div>
      </main>
    </div>
  );
}
