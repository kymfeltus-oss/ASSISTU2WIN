import { BRAND_LOGO_ALT, BRAND_LOGO_SRC } from "@/lib/branding";

type IntakeLcpHeaderProps = {
  readonly source: string | null;
  readonly location: string | null;
};

/** Server-rendered LCP shell — plain img + CSS, no client hydration required. */
export function IntakeLcpHeader({ source, location }: IntakeLcpHeaderProps) {
  return (
    <header className="flex flex-col items-center gap-3 px-4 pt-8 pb-2 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BRAND_LOGO_SRC}
        alt={BRAND_LOGO_ALT}
        width={180}
        height={54}
        decoding="async"
        fetchPriority="high"
        className="h-auto w-44 object-contain"
      />
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Start your home search</h1>
        {source ? (
          <p className="mt-1 text-xs text-slate-400">
            Source: {source}
            {location ? ` · ${location}` : ""}
          </p>
        ) : null}
      </div>
    </header>
  );
}
