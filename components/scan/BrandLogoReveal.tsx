import { BrandLogo } from "@/components/BrandLogo";

/**
 * AssistU2Win logo reveal — cyan lift, scale-in, soft glow pulse (CSS in globals).
 */
export function BrandLogoReveal() {
  return (
    <div className="scan-logo-reveal-wrap mx-auto">
      <div className="scan-logo-reveal-glow relative flex items-center justify-center">
        <BrandLogo variant="scan" priority showLoadError />
      </div>
    </div>
  );
}
