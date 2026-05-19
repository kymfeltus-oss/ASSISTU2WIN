"use client";

import {
  BRAND_LOGO_ALT,
  BRAND_LOGO_CLASS,
  BRAND_LOGO_LOAD_ERROR,
  BRAND_LOGO_SRC,
} from "@/lib/branding";
import Image from "next/image";
import { useId, useState } from "react";

export type BrandLogoVariant =
  | "hero"
  | "header"
  | "compact"
  | "scan"
  | "not-found"
  | "rail";

const VARIANT_CLASS: Record<BrandLogoVariant, string> = {
  hero: `${BRAND_LOGO_CLASS} brand-logo--hero`,
  header: `${BRAND_LOGO_CLASS} brand-logo--header`,
  compact: `${BRAND_LOGO_CLASS} brand-logo--compact`,
  scan: `${BRAND_LOGO_CLASS} brand-logo--scan`,
  "not-found": `${BRAND_LOGO_CLASS} brand-logo--not-found`,
  rail: `${BRAND_LOGO_CLASS} brand-logo--rail`,
};

type BrandLogoProps = {
  readonly variant?: BrandLogoVariant;
  readonly priority?: boolean;
  readonly showLoadError?: boolean;
  readonly id?: string;
  readonly onFailed?: () => void;
};

export function BrandLogo({
  variant = "hero",
  priority = false,
  showLoadError = false,
  id = "logo",
  onFailed,
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false);
  const errId = useId();

  const handleError = () => {
    setFailed(true);
    onFailed?.();
  };

  if (variant === "rail") {
    return (
      <Image
        id={id}
        src={BRAND_LOGO_SRC}
        alt={BRAND_LOGO_ALT}
        fill
        sizes="40px"
        priority={priority}
        unoptimized
        onError={handleError}
        className={VARIANT_CLASS.rail}
      />
    );
  }

  return (
    <>
      <Image
        id={id}
        src={BRAND_LOGO_SRC}
        alt={BRAND_LOGO_ALT}
        width={900}
        height={300}
        priority={priority}
        unoptimized
        onError={handleError}
        className={VARIANT_CLASS[variant]}
      />
      {showLoadError && failed ? (
        <p id={errId} className="brand-logo-err" role="alert">
          {BRAND_LOGO_LOAD_ERROR}
        </p>
      ) : null}
    </>
  );
}
