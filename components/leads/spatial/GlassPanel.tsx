import type { ReactNode } from "react";
import { spatial } from "@/components/leads/spatial/spatial-styles";

type GlassPanelProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly variant?: "default" | "soft";
  readonly interactive?: boolean;
};

export function GlassPanel({
  children,
  className = "",
  variant = "default",
  interactive = false,
}: GlassPanelProps) {
  const base = variant === "soft" ? spatial.glassSoft : spatial.glass;
  const hover = interactive ? ` ${spatial.glassHover}` : "";
  return <div className={`${base}${hover} ${className}`.trim()}>{children}</div>;
}
