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
    <div className="relative flex min-h-dvh w-full min-w-0 items-center justify-center overflow-hidden bg-[#1E293B] px-[var(--app-content-pad-inline)] py-12 text-[#F8FAFC] app-overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(0,242,254,0.12),transparent_38%),radial-gradient(circle_at_82%_24%,rgba(167,139,250,0.08),transparent_36%),linear-gradient(180deg,#1E293B_0%,#273449_42%,#334155_78%,#475569_100%)]"
      />
      <div className="relative z-10 w-full min-w-0 max-w-md space-y-8 rounded-2xl border border-[#00F2FE]/20 bg-[#475569]/42 p-[clamp(1.25rem,4vw,2rem)] shadow-[0_0_80px_rgba(0,242,254,0.12)] backdrop-blur-2xl">
        <div>
          <AppBrand variant="auth" />
          <h1 className="mt-4 text-center text-lg font-semibold text-[#F8FAFC]">
            {isInvite ? "Create your buyer portal" : "Create an account"}
          </h1>
          <p className="mt-2 text-center text-sm text-[#94A3B8]">
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
              className="mb-1 block text-sm font-medium text-[#94A3B8]"
            >
              Lead / Client Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="block w-full rounded-lg border border-[#00F2FE]/20 bg-[#1E293B]/55 px-3 py-2 text-[#F8FAFC] placeholder:text-[#94A3B8] focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]/40 focus:outline-none sm:text-sm"
              placeholder="John & Mary Smith"
            />
          </div>

          <div>
            <label
              htmlFor="email-address"
              className="mb-1 block text-sm font-medium text-[#94A3B8]"
            >
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full rounded-lg border border-[#00F2FE]/20 bg-[#1E293B]/55 px-3 py-2 text-[#F8FAFC] placeholder:text-[#94A3B8] focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]/40 focus:outline-none sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-[#94A3B8]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="block w-full rounded-lg border border-[#00F2FE]/20 bg-[#1E293B]/55 px-3 py-2 text-[#F8FAFC] placeholder:text-[#94A3B8] focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]/40 focus:outline-none sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={!isInvite}
            className="w-full rounded-lg bg-[#00F2FE] px-3 py-2.5 text-sm font-semibold text-[#0F172A] shadow-[0_0_24px_rgba(0,242,254,0.22)] transition hover:bg-[#67F9FF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isInvite ? "Create portal account" : "Invite link required"}
          </button>
        </form>

        <p className="text-center text-xs text-[#94A3B8]">
          Already have an account?{" "}
          <a href="/login" className="text-[#00F2FE] hover:text-[#67F9FF]">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
