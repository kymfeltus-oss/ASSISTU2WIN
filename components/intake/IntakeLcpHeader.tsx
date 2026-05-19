import {
  BRAND_LOGO_ALT,
  BRAND_LOGO_CLASS,
  BRAND_LOGO_SRC,
} from "@/lib/branding";

type IntakeLcpHeaderProps = {
  readonly source: string | null;
  readonly location: string | null;
};

/** Server-rendered LCP shell — premium cinematic intake header */
export function IntakeLcpHeader({
  source,
  location,
}: IntakeLcpHeaderProps) {
  return (
    <header className="relative flex flex-col items-center overflow-hidden px-4 pt-10 pb-6 text-center">

      {/* Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute left-1/2 top-0 h-[260px] w-[260px] -translate-x-1/2 rounded-full border border-[#00D2FF]/10 bg-[#00D2FF]/10 blur-[90px]" />

        <div className="absolute left-1/2 top-6 h-[320px] w-[320px] -translate-x-1/2 rounded-full border border-[#00D2FF]/5 bg-[radial-gradient(circle,rgba(0,210,255,0.08),transparent_70%)]" />

      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">

        {/* Logo — official asset (CodePen sizing) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          id="logo"
          src={BRAND_LOGO_SRC}
          alt={BRAND_LOGO_ALT}
          width={900}
          height={300}
          decoding="async"
          fetchPriority="high"
          className={`${BRAND_LOGO_CLASS} brand-logo--hero drop-shadow-[0_0_28px_rgba(0,210,255,0.28)]`}
        />

        {/* Heading */}
        <div className="mt-5">

          <div className="mb-3 text-[11px] font-semibold tracking-[0.38em] text-[#94A3B8]">
            AI POWERED REAL ESTATE PLATFORM
          </div>

          <h1 className="bg-gradient-to-b from-white via-[#E2E8F0] to-[#94A3B8] bg-clip-text text-[34px] font-[800] leading-none tracking-[0.08em] text-transparent sm:text-[42px]">
            BUYER INTAKE
          </h1>

          <p className="mx-auto mt-4 max-w-[520px] text-sm leading-7 text-[#CBD5E1] sm:text-base">
            Begin your intelligent home buying journey with
            ASSIST U2 WIN.
          </p>

          {source ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#00D2FF]/20 bg-[#0F172A]/70 px-4 py-2 text-xs font-medium tracking-[0.12em] text-[#94A3B8] backdrop-blur-xl">

              <span className="h-2 w-2 rounded-full bg-[#00D2FF] shadow-[0_0_12px_rgba(0,210,255,0.9)]" />

              <span>
                SOURCE: {source}
                {location ? ` · ${location}` : ""}
              </span>

            </div>
          ) : null}

        </div>
      </div>
    </header>
  );
}