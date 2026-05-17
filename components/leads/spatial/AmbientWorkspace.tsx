import type { ReactNode } from "react";
import { spatial } from "@/components/leads/spatial/spatial-styles";

type AmbientWorkspaceProps = {
  readonly children: ReactNode;
};

export function AmbientWorkspace({ children }: AmbientWorkspaceProps) {
  return (
    <div className={`${spatial.page} spatial-scroll`}>
      <div className={spatial.ambient} aria-hidden>
        <div
          className={`${spatial.glowTeal} spatial-drift -top-32 left-[8%] h-[420px] w-[420px]`}
        />
        <div
          className={`${spatial.glowCoral} spatial-drift -right-20 top-[30%] h-[360px] w-[360px]`}
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="absolute bottom-0 left-[35%] h-[280px] w-[520px] rounded-full bg-[var(--spatial-amber-glow)] opacity-30 blur-[100px]"
          style={{ animationDelay: "-3s" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(34,211,238,0.08),transparent_55%)]" />
      </div>
      {children}
    </div>
  );
}
