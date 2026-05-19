export function IntakeFormSkeleton() {
  return (
    <div
      className="relative mx-auto w-full max-w-lg animate-pulse overflow-hidden px-4 pb-10"
      aria-busy="true"
      aria-label="Loading intake form"
    >

      {/* Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute left-1/2 top-0 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-[#00D2FF]/10 blur-[120px]" />

        <div className="absolute bottom-[-120px] right-[-80px] h-[260px] w-[260px] rounded-full bg-[#0284C7]/10 blur-[120px]" />

      </div>

      <div className="relative z-10 mt-4 space-y-5">

        {/* Hero Card */}
        <div className="rounded-[32px] border border-[#00D2FF]/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(3,7,18,0.96))] p-6 shadow-[0_0_40px_rgba(0,210,255,0.06)] backdrop-blur-2xl">

          <div className="mb-5 h-4 w-40 rounded-full bg-[#1E293B]" />

          <div className="h-10 w-64 rounded-full bg-[#334155]" />

          <div className="mt-6 space-y-3">
            <div className="h-3 w-full rounded-full bg-[#1E293B]" />
            <div className="h-3 w-[85%] rounded-full bg-[#1E293B]" />
            <div className="h-3 w-[70%] rounded-full bg-[#1E293B]" />
          </div>

        </div>

        {/* Form Fields */}
        <div className="rounded-[28px] border border-[#00D2FF]/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(3,7,18,0.96))] p-5 shadow-[0_0_35px_rgba(0,210,255,0.04)] backdrop-blur-2xl">

          <div className="mb-5 flex items-center gap-3">

            <div className="h-10 w-10 rounded-full bg-[#0EA5E9]/20" />

            <div className="h-4 w-40 rounded-full bg-[#334155]" />

          </div>

          <div className="space-y-4">

            <div className="h-14 rounded-2xl border border-[#1E293B] bg-[#0F172A]/80" />

            <div className="h-14 rounded-2xl border border-[#1E293B] bg-[#0F172A]/80" />

            <div className="grid grid-cols-2 gap-4">

              <div className="h-14 rounded-2xl border border-[#1E293B] bg-[#0F172A]/80" />

              <div className="h-14 rounded-2xl border border-[#1E293B] bg-[#0F172A]/80" />

            </div>

            <div className="h-28 rounded-[24px] border border-[#1E293B] bg-[#0F172A]/80" />

          </div>

        </div>

        {/* Submit Skeleton */}
        <div className="rounded-[28px] border border-[#00D2FF]/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(3,7,18,0.98))] p-5 shadow-[0_0_40px_rgba(0,210,255,0.08)] backdrop-blur-2xl">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-4">

              <div className="h-12 w-12 rounded-full bg-[#00D2FF]/20" />

              <div className="space-y-3">

                <div className="h-4 w-44 rounded-full bg-[#334155]" />

                <div className="h-3 w-64 rounded-full bg-[#1E293B]" />

              </div>

            </div>

            <div className="h-10 w-10 rounded-full bg-[#00D2FF]/20" />

          </div>

        </div>

      </div>
    </div>
  );
}