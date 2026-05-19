"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { useState } from "react";

type AppBrandProps = {
  readonly variant?: "header" | "auth" | "compact";
};

function BrandTextFallback({
  variant,
}: {
  readonly variant: NonNullable<AppBrandProps["variant"]>;
}) {
  if (variant === "auth") {
    return (
      <div className="text-center leading-tight">
        <p className="text-2xl font-extrabold tracking-tight text-white">
          Assist U 2 Win
        </p>
        <p className="mt-1 text-xs font-semibold tracking-[0.14em] text-cyan-400 uppercase">
          The Home Buying Collective
        </p>
      </div>
    );
  }

  return (
    <div className="leading-tight">
      <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-sm font-extrabold tracking-tight text-transparent sm:text-base">
        Assist U 2 Win
      </span>
      {variant === "header" ? (
        <p className="text-[9px] font-medium tracking-wide text-slate-500 uppercase">
          The Home Buying Collective
        </p>
      ) : null}
    </div>
  );
}

const APP_BRAND_VARIANT = {
  auth: "hero",
  header: "header",
  compact: "compact",
} as const satisfies Record<
  NonNullable<AppBrandProps["variant"]>,
  "hero" | "header" | "compact"
>;

export function AppBrand({ variant = "header" }: AppBrandProps) {
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    return <BrandTextFallback variant={variant} />;
  }

  return (
    <div className={variant === "auth" ? "mx-auto w-full" : undefined}>
      <BrandLogo
        variant={APP_BRAND_VARIANT[variant]}
        priority={variant === "auth"}
        showLoadError={variant === "auth"}
        onFailed={() => setUseFallback(true)}
      />
    </div>
  );
}
