import {
  CARD_FEATURED,
  MUTED,
  PANEL,
  SECTION_HEADING,
  TOUCH_TARGET,
} from "@/components/dashboard/AgentCommandShell";

const FOCUS_RING =
  "focus:border-[#00F2FE] focus:outline-none focus:ring-2 focus:ring-[#00F2FE]/15";
const FIELD_CONTROL =
  "w-full min-w-0 rounded-xl border border-[#1E2A44] bg-[#0B1020] px-3 py-2.5 text-sm text-[#F8FAFC] transition";
const CHIP_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00F2FE]";

/** Visual tokens for admin lead intake — layout/styling only. */
export const adminIntakeTheme = {
  shell: "relative z-10 min-w-0 overflow-x-hidden",
  page: "mx-auto w-full min-w-0 max-w-[1600px] px-4 pt-2 pb-28 sm:px-5 md:px-6 lg:px-8 lg:pb-8",
  layoutGrid:
    "grid w-full min-w-0 grid-cols-1 gap-3 md:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]",
  formStack: "flex min-w-0 flex-col gap-3 md:gap-4",
  featured: `${CARD_FEATURED} min-w-0 overflow-visible rounded-2xl p-4 sm:rounded-3xl sm:p-5`,
  panel: `${PANEL} min-w-0 overflow-visible rounded-2xl sm:rounded-3xl`,
  innerWell:
    "rounded-xl border border-[#1E2A44] bg-[#050713]/90 p-3 sm:p-3.5",
  sidePanel: `${PANEL} min-w-0 overflow-visible rounded-2xl sm:rounded-3xl lg:sticky lg:top-3`,
  sectionTitle: SECTION_HEADING,
  sectionSubtitle: `text-[11px] leading-snug ${MUTED}`,
  sectionHeader: "mb-3 min-w-0",
  fieldGrid: "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2",
  label: "mb-1 block text-[10px] font-semibold tracking-[0.14em] text-[#94A3B8] uppercase",
  input: `${FIELD_CONTROL} placeholder:text-[#94A3B8]/55 ${FOCUS_RING}`,
  select: `${FIELD_CONTROL} ${FOCUS_RING}`,
  textarea: `${FIELD_CONTROL} min-h-[4.5rem] resize-y placeholder:text-[#94A3B8]/55 ${FOCUS_RING}`,
  chipBase: `min-h-10 rounded-xl border px-2.5 py-2 text-[11px] font-semibold tracking-wide transition touch-manipulation ${CHIP_FOCUS} active:scale-[0.98] sm:px-3 sm:text-xs`,
  chipActive:
    "border-[#00F2FE]/45 bg-[rgba(0,242,254,0.12)] text-[#00F2FE] shadow-[0_0_14px_rgba(0,242,254,0.14)]",
  chipIdle:
    "border-[#1E2A44] bg-[#0B1020] text-[#94A3B8] hover:border-[#00F2FE]/35 hover:bg-[#111827] hover:text-[#F8FAFC]",
  btnPrimary: `w-full rounded-xl bg-[#00F2FE] py-3 text-xs font-bold tracking-[0.12em] text-[#080C1A] uppercase shadow-[0_0_18px_rgba(0,242,254,0.22)] transition hover:bg-[#B8FDFF] hover:shadow-[0_0_24px_rgba(0,242,254,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00F2FE] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${TOUCH_TARGET}`,
  error:
    "rounded-xl border border-[#FF4F7B]/35 bg-[rgba(255,79,123,0.08)] px-3 py-2 text-xs text-[#FF9BB5]",
  accentGreen: "text-[#18E28F]",
  accentCyan: "text-[#00F2FE]",
  accentAmber: "text-[#FFBD59]",
  pageTitle: "text-lg font-bold tracking-tight text-[#F8FAFC] sm:text-xl",
} as const;
