import { BRAND_LOGO_ALT, BRAND_LOGO_SRC } from "@/lib/branding";
import Image from "next/image";

/**
 * AssistU2Win logo reveal — cyan lift, scale-in, soft glow pulse (CSS in globals).
 */
export function BrandLogoReveal() {
  return (
    <div className="scan-logo-reveal-wrap mx-auto">
      <div className="scan-logo-reveal-glow relative flex items-center justify-center">
        <Image
          src={BRAND_LOGO_SRC}
          alt={BRAND_LOGO_ALT}
          width={280}
          height={93}
          priority
          unoptimized
          className="scan-logo-reveal-img relative z-10 h-auto w-[min(280px,78vw)] object-contain"
        />
      </div>
    </div>
  );
}
