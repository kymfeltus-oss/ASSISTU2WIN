import { BrandLogoReveal } from "@/components/scan/BrandLogoReveal";
import { getAppStoreLinks } from "@/lib/scan/app-store-links";

type ScanDownloadScreenProps = {
  readonly isActiveClient: boolean;
};

function StoreButton({
  href,
  label,
  sublabel,
  emphasized,
}: {
  readonly href: string;
  readonly label: string;
  readonly sublabel: string;
  readonly emphasized: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`scan-glass-cta group flex w-full max-w-sm flex-col items-center gap-0.5 rounded-2xl border px-6 py-4 text-center transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00F2FE] ${
        emphasized
          ? "scan-glass-cta-primary border-[#00F2FE]/50 bg-[#00F2FE]/10 hover:border-[#00F2FE]/70 hover:bg-[#00F2FE]/15"
          : "border-white/12 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      <span
        className={`text-sm font-bold tracking-wide ${
          emphasized ? "text-[#00F2FE]" : "text-slate-100"
        }`}
      >
        {label}
      </span>
      <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-300">
        {sublabel}
      </span>
    </a>
  );
}

export function ScanDownloadScreen({ isActiveClient }: ScanDownloadScreenProps) {
  const { appStoreUrl, googlePlayUrl } = getAppStoreLinks();

  return (
    <div className="scan-cinematic-page relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="scan-cinematic-glow pointer-events-none absolute inset-0" aria-hidden />

      <main className="relative z-10 flex w-full max-w-lg flex-col items-center gap-10 text-center">
        <BrandLogoReveal />

        <header className="space-y-2">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#00F2FE]/80 uppercase">
            AssistU2Win
          </p>
          <h1 className="scan-cinematic-title text-3xl leading-tight sm:text-4xl">
            <span className="scan-title-script block">Access Your</span>
            <span className="scan-title-bold block">Intelligent Command</span>
          </h1>
          {isActiveClient ? (
            <p className="mx-auto max-w-xs text-sm text-slate-400">
              Your buyer portal is active — install the app to stay on track.
            </p>
          ) : (
            <p className="mx-auto max-w-xs text-sm text-slate-400">
              Download the app to unlock your personalized home-buying command center.
            </p>
          )}
        </header>

        <div
          className={`flex w-full flex-col items-center gap-3 ${
            isActiveClient ? "scan-cta-active-client" : ""
          }`}
        >
          <StoreButton
            href={appStoreUrl}
            label="Download on the App Store"
            sublabel="iPhone & iPad"
            emphasized={isActiveClient}
          />
          <StoreButton
            href={googlePlayUrl}
            label="Get it on Google Play"
            sublabel="Android"
            emphasized={false}
          />
        </div>
      </main>
    </div>
  );
}
