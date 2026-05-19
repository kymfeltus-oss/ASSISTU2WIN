import { IntakeFormSkeleton } from "@/components/intake/IntakeFormSkeleton";
import { IntakeLcpHeader } from "@/components/intake/IntakeLcpHeader";
import { parseQrIntakeSearchParams } from "@/lib/qr-service";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const QRIntakeProcessor = dynamic(() => import("@/components/qr-intake-processor"), {
  loading: () => <IntakeFormSkeleton />,
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function toUrlSearchParams(searchParams: SearchParamsRecord): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      params.set(key, value[0]);
    }
  }

  return params;
}

type PublicIntakePageProps = {
  readonly searchParams: Promise<SearchParamsRecord>;
};

export default async function PublicIntakePage({
  searchParams,
}: PublicIntakePageProps) {
  const resolved = await searchParams;

  const qrParams = parseQrIntakeSearchParams(
    toUrlSearchParams(resolved)
  );

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-hidden bg-[#030712] text-[#F8FAFC]">

      {/* Cinematic Background Layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,210,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(0,210,255,0.08),transparent_22%),linear-gradient(180deg,#030712,#06111E,#071827,#030712)]" />

        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:72px_72px]" />

        <div className="absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#00D2FF]/10 blur-[120px]" />

        <div className="absolute bottom-[-180px] right-[-80px] h-[320px] w-[320px] rounded-full bg-[#0284C7]/10 blur-[120px]" />

      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-dvh flex-col">

        <IntakeLcpHeader
          source={qrParams.source}
          location={qrParams.location}
        />

        <Suspense fallback={<IntakeFormSkeleton />}>
          <QRIntakeProcessor
            key={`${qrParams.source ?? ""}-${qrParams.location ?? ""}-${qrParams.autoWelcome}-${qrParams.marketUpdate}`}
          />
        </Suspense>

      </div>
    </div>
  );
}