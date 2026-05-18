import { AppBrand } from "@/components/AppBrand";
import { login, signup } from "../actions";

interface PageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="flex min-h-dvh w-full min-w-0 items-center justify-center app-overflow-x-clip bg-slate-900 px-[var(--app-content-pad-inline)] py-12">
      <div className="w-full min-w-0 max-w-md space-y-8 rounded-2xl border border-slate-700 bg-slate-800 p-[clamp(1.25rem,4vw,2rem)] shadow-xl">
        <div>
          <AppBrand variant="auth" />
          <p className="mt-4 text-center text-sm text-slate-400">
            Sign in to your account or register below
          </p>
        </div>

        {params.error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
            {params.error}
          </div>
        )}

        {params.message && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-sm text-emerald-400">
            {params.message}
          </div>
        )}

        <form className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label
                htmlFor="fullName"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                Full Name (Sign Up only)
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className="relative block w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder:text-slate-400 focus:z-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label
                htmlFor="email-address"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder:text-slate-400 focus:z-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder:text-slate-400 focus:z-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              formAction={login}
              type="submit"
              className="group relative flex w-full justify-center rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Sign In
            </button>
            <button
              formAction={signup}
              type="submit"
              className="group relative flex w-full justify-center rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
