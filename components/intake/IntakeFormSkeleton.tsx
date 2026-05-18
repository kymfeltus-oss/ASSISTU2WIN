export function IntakeFormSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-lg animate-pulse px-4 pb-10"
      aria-busy="true"
      aria-label="Loading intake form"
    >
      <div className="mt-4 space-y-4">
        <div className="h-24 rounded-2xl bg-slate-800/60" />
        <div className="h-32 rounded-2xl bg-slate-800/40" />
        <div className="h-12 rounded-xl bg-slate-700/50" />
      </div>
    </div>
  );
}
