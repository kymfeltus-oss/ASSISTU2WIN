"use client";

import { BRAND_LOGO_ALT, BRAND_LOGO_SRC } from "@/lib/branding";
import Image from "next/image";
import { useState } from "react";

type AppBrandProps = {
  readonly variant?: "header" | "auth" | "compact";
};

const VARIANT_SIZES: Record<
  NonNullable<AppBrandProps["variant"]>,
  { readonly width: number; readonly height: number; readonly className: string }
> = {
  auth: {
    width: 240,
    height: 80,
    className: "mx-auto h-auto w-[min(240px,88vw)]",
  },
  header: {
    width: 200,
    height: 67,
    className: "h-11 w-auto max-w-[200px]",
  },
  compact: {
    width: 160,
    height: 53,
    className: "h-9 w-auto max-w-[160px]",
  },
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

export function AppBrand({ variant = "header" }: AppBrandProps) {
  const [useFallback, setUseFallback] = useState(false);
  const size = VARIANT_SIZES[variant];

  if (useFallback) {
    return <BrandTextFallback variant={variant} />;
  }

  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt={BRAND_LOGO_ALT}
      width={size.width}
      height={size.height}
      priority={variant === "auth"}
      unoptimized
      onError={() => setUseFallback(true)}
      className={`object-contain ${size.className}`}
    />
  );
}
