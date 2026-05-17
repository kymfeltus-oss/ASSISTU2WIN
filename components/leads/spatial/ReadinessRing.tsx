type ReadinessRingProps = {
  readonly score: number;
  readonly size?: number;
  readonly className?: string;
};

export function ReadinessRing({
  score,
  size = 120,
  className = "",
}: ReadinessRingProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    clamped >= 85
      ? "#fb7185"
      : clamped >= 65
        ? "#22d3ee"
        : clamped >= 45
          ? "#fbbf24"
          : "#94a3b8";

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 readiness-pulse">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tracking-tight text-white">
          {clamped}
        </span>
        <span className="text-[9px] font-semibold tracking-[0.2em] text-[var(--spatial-text-muted)] uppercase">
          Ready
        </span>
      </div>
    </div>
  );
}
