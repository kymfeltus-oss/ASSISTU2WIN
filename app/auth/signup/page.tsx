import { signupClientPortalInvite } from "@/app/(auth)/actions";
import { AppBrand } from "@/components/AppBrand";
import { pageSearchParamsGetter } from "@/lib/auth/parse-page-search-params";
import {
  CLIENT_INVITE_TARGET_SANCTUARY,
  isClientPortalInvite,
  parseClientInviteSearchParams,
} from "@/lib/qr-service";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientPortalSignupPage({ searchParams }: PageProps) {
  const rawParams = await searchParams;
  const inviteParams = parseClientInviteSearchParams(pageSearchParamsGetter(rawParams));
  const isInvite = isClientPortalInvite(inviteParams);
  const error =
    typeof rawParams.error === "string" ? decodeURIComponent(rawParams.error) : null;

  return (
    <div className="flex min-h-dvh w-full min-w-0 items-center justify-center app-overflow-x-clip bg-slate-900 px-[var(--app-content-pad-inline)] py-12">
      <div className="w-full min-w-0 max-w-md space-y-8 rounded-2xl border border-slate-700 bg-slate-800 p-[clamp(1.25rem,4vw,2rem)] shadow-xl">
        <div>
          <AppBrand variant="auth" />
          <h1 className="mt-4 text-center text-lg font-semibold text-white">
            {isInvite ? "Create your buyer portal" : "Create an account"}
          </h1>
          <p className="mt-2 text-center text-sm text-slate-400">
            {isInvite
              ? "Set up My Sanctuary to track your home-buying milestones."
              : "Use a client invite QR from your agent, or sign in on the login page."}
          </p>
        </div>

        {error ? (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
            {error}
          </div>
        ) : null}

        <form action={signupClientPortalInvite} className="mt-4 space-y-4">
          {isInvite && inviteParams.leadId ? (
            <>
              <input type="hidden" name="leadRef" value={inviteParams.leadId} />
              <input
                type="hidden"
                name="target"
                value={inviteParams.target ?? CLIENT_INVITE_TARGET_SANCTUARY}
              />
            </>
          ) : null}

          <div>
            <label
              htmlFor="fullName"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Lead / Client Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="block w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none sm:text-sm"
              placeholder="John & Mary Smith"
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
              className="block w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none sm:text-sm"
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
              autoComplete="new-password"
              required
              className="block w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={!isInvite}
            className="w-full rounded-lg bg-cyan-500 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isInvite ? "Create portal account" : "Invite link required"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="text-cyan-400 hover:text-cyan-300">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
