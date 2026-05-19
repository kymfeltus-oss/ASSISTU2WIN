import { AppBrand } from "@/components/AppBrand";
import { completeOnboarding } from "./actions";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="relative flex min-h-dvh w-full min-w-0 items-center justify-center overflow-hidden bg-[#1E293B] px-[var(--app-content-pad-inline)] py-12 text-[#F8FAFC] app-overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(0,242,254,0.12),transparent_38%),radial-gradient(circle_at_82%_24%,rgba(167,139,250,0.08),transparent_36%),linear-gradient(180deg,#1E293B_0%,#273449_42%,#334155_78%,#475569_100%)]"
      />
      <div className="relative z-10 w-full min-w-0 max-w-md space-y-8 rounded-2xl border border-[#00F2FE]/20 bg-[#475569]/42 p-[clamp(1.25rem,4vw,2rem)] shadow-[0_0_80px_rgba(0,242,254,0.12)] backdrop-blur-2xl">
        <div>
          <AppBrand variant="auth" />
          <span className="mb-3 mt-4 inline-flex items-center rounded-md border border-[#00F2FE]/25 bg-[#00F2FE]/10 px-2.5 py-0.5 font-mono text-xs font-medium text-[#00F2FE]">
            Initial Matrix Setup
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
            Configure Your Workspace
          </h2>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Please finalize your operational profile to instantiate the custom
            AI telemetry layer.
          </p>
        </div>

        {params.error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-center font-mono text-sm text-red-400">
            {params.error}
          </div>
        )}

        <form action={completeOnboarding} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="mb-1 block text-xs font-medium tracking-wider text-[#94A3B8] uppercase"
              >
                Your Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="John Doe"
                className="block w-full rounded-lg border border-[#00F2FE]/20 bg-[#1E293B]/55 px-3 py-2 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]/40 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="companyName"
                className="mb-1 block text-xs font-medium tracking-wider text-[#94A3B8] uppercase"
              >
                Company / Agency Name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                placeholder="Acme Corporation"
                className="block w-full rounded-lg border border-[#00F2FE]/20 bg-[#1E293B]/55 px-3 py-2 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]/40 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="roleTitle"
                className="mb-1 block text-xs font-medium tracking-wider text-[#94A3B8] uppercase"
              >
                Your Professional Role
              </label>
              <input
                id="roleTitle"
                name="roleTitle"
                type="text"
                required
                placeholder="e.g., Executive Producer, Senior Analyst"
                className="block w-full rounded-lg border border-[#00F2FE]/20 bg-[#1E293B]/55 px-3 py-2 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]/40 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="industry"
                className="mb-1 block text-xs font-medium tracking-wider text-[#94A3B8] uppercase"
              >
                Market Segment / Industry
              </label>
              <select
                id="industry"
                name="industry"
                required
                className="block w-full cursor-pointer appearance-none rounded-lg border border-[#00F2FE]/20 bg-[#1E293B]/55 px-3 py-2 text-sm text-[#F8FAFC] focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]/40 focus:outline-none"
              >
                <option value="" className="text-slate-500">
                  Select industry branch…
                </option>
                <option value="Real Estate">
                  Real Estate & Mortgage Brokerage
                </option>
                <option value="Consulting">
                  Strategic Consulting & Advisory
                </option>
                <option value="Technology">
                  Software & Digital Technology
                </option>
                <option value="Entertainment">
                  Media & Creative Entertainment
                </option>
                <option value="Other">Cross-Vertical / Other Enterprise</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full cursor-pointer justify-center rounded-lg bg-[#00F2FE] px-4 py-2.5 text-sm font-semibold text-[#0F172A] shadow-[0_0_24px_rgba(0,242,254,0.22)] transition-colors hover:bg-[#67F9FF]"
          >
            Initialize Environment
          </button>
        </form>
      </div>
    </div>
  );
}
