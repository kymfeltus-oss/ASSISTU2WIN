import { AppBrand } from "@/components/AppBrand";
import { completeOnboarding } from "./actions";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
        <div>
          <AppBrand variant="auth" />
          <span className="mb-3 mt-4 inline-flex items-center rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 font-mono text-xs font-medium text-blue-400">
            Initial Matrix Setup
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Configure Your Workspace
          </h2>
          <p className="mt-2 text-sm text-slate-400">
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
                className="mb-1 block text-xs font-medium tracking-wider text-slate-400 uppercase"
              >
                Your Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="John Doe"
                className="block w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="companyName"
                className="mb-1 block text-xs font-medium tracking-wider text-slate-400 uppercase"
              >
                Company / Agency Name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                placeholder="Acme Corporation"
                className="block w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="roleTitle"
                className="mb-1 block text-xs font-medium tracking-wider text-slate-400 uppercase"
              >
                Your Professional Role
              </label>
              <input
                id="roleTitle"
                name="roleTitle"
                type="text"
                required
                placeholder="e.g., Executive Producer, Senior Analyst"
                className="block w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="industry"
                className="mb-1 block text-xs font-medium tracking-wider text-slate-400 uppercase"
              >
                Market Segment / Industry
              </label>
              <select
                id="industry"
                name="industry"
                required
                className="block w-full cursor-pointer appearance-none rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
            className="w-full cursor-pointer justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
          >
            Initialize Environment
          </button>
        </form>
      </div>
    </div>
  );
}
