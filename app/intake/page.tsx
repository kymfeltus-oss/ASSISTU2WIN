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

export default async function PublicIntakePage({ searchParams }: PublicIntakePageProps) {
  const resolved = await searchParams;
  const qrParams = parseQrIntakeSearchParams(toUrlSearchParams(resolved));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <IntakeLcpHeader source={qrParams.source} location={qrParams.location} />
      <Suspense fallback={<IntakeFormSkeleton />}>
        <QRIntakeProcessor
          key={`${qrParams.source ?? ""}-${qrParams.location ?? ""}-${qrParams.autoWelcome}-${qrParams.marketUpdate}`}
        />
      </Suspense>
    </div>
  );
}
