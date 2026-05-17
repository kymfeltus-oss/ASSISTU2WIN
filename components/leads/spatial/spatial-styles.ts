/** Shared class fragments for the spatial intelligence workspace. */
export const spatial = {
  page: "relative min-h-screen overflow-x-hidden text-[var(--spatial-text-primary)]",
  ambient:
    "pointer-events-none fixed inset-0 -z-10 bg-[var(--spatial-midnight)]",
  glowTeal:
    "absolute rounded-full bg-[var(--spatial-teal-glow)] blur-[120px] opacity-40",
  glowCoral:
    "absolute rounded-full bg-[var(--spatial-coral-glow)] blur-[100px] opacity-25",
  glass:
    "rounded-[1.75rem] border border-white/[0.06] bg-white/[0.04] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)] backdrop-blur-2xl",
  glassSoft:
    "rounded-2xl border border-white/[0.05] bg-white/[0.03] backdrop-blur-xl",
  glassHover:
    "transition-all duration-500 ease-out hover:border-cyan-400/20 hover:bg-white/[0.06] hover:shadow-[0_20px_60px_-20px_rgba(34,211,238,0.15)]",
  label:
    "text-[10px] font-semibold tracking-[0.18em] text-[var(--spatial-text-muted)] uppercase",
  title: "text-xl font-semibold tracking-tight text-white sm:text-2xl",
  body: "text-sm leading-relaxed text-[var(--spatial-text-secondary)]",
  navLink:
    "relative rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-300",
  navActive:
    "bg-white/[0.08] text-white shadow-[0_0_24px_-4px_rgba(34,211,238,0.35)] ring-1 ring-cyan-400/25",
  navIdle: "text-[var(--spatial-text-muted)] hover:text-white hover:bg-white/[0.04]",
} as const;
