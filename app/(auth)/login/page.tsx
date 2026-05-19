import { AppBrand } from "@/components/AppBrand";
import { login, signup } from "../actions";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#030712] text-[#F8FAFC]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(0,242,254,0.20),transparent_34%),radial-gradient(circle_at_82%_28%,rgba(167,139,250,0.18),transparent_32%),linear-gradient(180deg,#030712,#0A1018,#0F1419,#1B2838)]" />

      <div className="absolute inset-0 opacity-25">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,242,254,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(0,242,254,0.10)_1px,transparent_1px)] bg-[size:82px_82px]" />
      </div>

      <div className="absolute left-[-180px] top-[10%] h-[520px] w-[520px] rounded-full border border-[#00F2FE]/25 shadow-[0_0_130px_rgba(0,242,254,0.35)]" />
      <div className="absolute bottom-[-170px] left-1/2 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-[#00F2FE]/20 blur-[120px]" />

      <main className="relative z-10 mx-auto grid min-h-dvh max-w-7xl items-center gap-10 px-5 py-8 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-14">
        <section className="space-y-7 text-center lg:text-left">
          <div className="rounded-[2rem] border border-[#00F2FE]/20 bg-[#111827]/45 p-7 shadow-[0_0_90px_rgba(0,242,254,0.14)] backdrop-blur-2xl md:p-9">
            <div className="mx-auto flex justify-center lg:justify-start">
              <AppBrand variant="auth" />
            </div>

            <p className="mt-8 text-sm font-semibold tracking-[0.42em] text-[#F8FAFC]">
              AI POWERED. REAL ESTATE.{" "}
              <span className="text-[#00F2FE]">REIMAGINED.</span>
            </p>

            <h1 className="mt-6 text-4xl font-bold leading-tight md:text-6xl">
              The future of AI powered real estate operations.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-[#94A3B8] lg:text-lg">
              A premium intelligent command center for modern real estate
              professionals who want faster decisions, cleaner execution, and a
              winning operational edge.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<Brain size={26} />}
              title="AI Intelligence"
              text="Smarter insights. Better decisions."
            />
            <FeatureCard
              icon={<Target size={26} />}
              title="Command Flow"
              text="Automate. Optimize. Scale."
            />
            <FeatureCard
              icon={<ShieldCheck size={26} />}
              title="Elite Security"
              text="Protected. Trusted. Enterprise ready."
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#00F2FE]/35 bg-[#111827]/70 p-6 shadow-[0_0_100px_rgba(0,242,254,0.20)] backdrop-blur-2xl md:p-9">
          <div className="mb-8 flex items-center justify-between rounded-3xl border border-white/10 bg-[#161C31]/60 p-4">
            <div>
              <p className="text-sm text-[#94A3B8]">AI System Status</p>
              <p className="font-semibold text-[#F8FAFC]">
                All Systems <span className="text-[#00F2FE]">Operational</span>
              </p>
            </div>
            <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.9)]" />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold tracking-[0.25em] text-[#00F2FE]">
              SECURE ACCESS
            </p>
            <h2 className="text-3xl font-bold">Welcome Back</h2>
            <p className="mt-2 text-[#94A3B8]">
              Sign in to your account or create your ASSIST U2 WIN profile.
            </p>
          </div>

          {params.error && (
            <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-center text-sm text-red-300">
              {params.error}
            </div>
          )}

          {params.message && (
            <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-center text-sm text-emerald-300">
              {params.message}
            </div>
          )}

          <form className="mt-8 space-y-5">
            <InputField
              id="fullName"
              name="fullName"
              type="text"
              label="Full Name"
              placeholder="Sign up only"
              icon={<Sparkles size={20} />}
              required={false}
            />

            <InputField
              id="email-address"
              name="email"
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              icon={<Mail size={20} />}
              required
            />

            <InputField
              id="password"
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              icon={<Lock size={20} />}
              required
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-[#94A3B8]">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#00F2FE] text-[#030712]">
                  <CheckCircle2 size={14} />
                </span>
                Secure session enabled
              </label>
              <span className="text-[#00F2FE]">Bank level security</span>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                formAction={login}
                type="submit"
                className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-[#00F2FE] px-6 py-4 text-sm font-bold text-[#030712] shadow-[0_0_35px_rgba(0,242,254,0.35)] transition hover:scale-[1.02] hover:shadow-[0_0_55px_rgba(0,242,254,0.55)]"
              >
                Sign In
                <ArrowRight size={20} className="transition group-hover:translate-x-1" />
              </button>

              <button
                formAction={signup}
                type="submit"
                className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-[#A78BFA] bg-[#161C31]/70 px-6 py-4 text-sm font-bold text-[#F8FAFC] transition hover:border-[#00F2FE] hover:shadow-[0_0_35px_rgba(167,139,250,0.32)]"
              >
                Create Account
                <ArrowRight size={20} className="text-[#A78BFA] transition group-hover:translate-x-1" />
              </button>
            </div>
          </form>

          <div className="mt-7 grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-[#030712]/45 p-4 text-center text-xs text-[#94A3B8]">
            <SecurityItem icon={<ShieldCheck size={20} />} text="Encrypted" />
            <SecurityItem icon={<Lock size={20} />} text="Protected" />
            <SecurityItem icon={<Sparkles size={20} />} text="AI Ready" />
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-[#00F2FE]/20 bg-[#111827]/50 p-5 text-center shadow-[0_0_35px_rgba(0,242,254,0.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#00F2FE]/45">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-[#00F2FE] shadow-[0_0_25px_rgba(0,242,254,0.35)]">
        {icon}
      </div>
      <h3 className="font-bold text-[#F8FAFC]">{title}</h3>
      <p className="mt-2 text-sm text-[#94A3B8]">{text}</p>
    </div>
  );
}

function InputField({
  id,
  name,
  type,
  label,
  placeholder,
  icon,
  required,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-[#94A3B8]">
        {label}
      </label>
      <div className="flex items-center gap-4 rounded-2xl border border-[#00F2FE]/25 bg-[#030712]/55 px-5 py-4 text-[#94A3B8] transition focus-within:border-[#00F2FE] focus-within:shadow-[0_0_30px_rgba(0,242,254,0.2)]">
        <span className="text-[#00F2FE]">{icon}</span>
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={type === "email" ? "email" : type === "password" ? "current-password" : "name"}
          required={required}
          className="w-full bg-transparent text-[#F8FAFC] outline-none placeholder:text-[#94A3B8]"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function SecurityItem({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[#00F2FE]">{icon}</span>
      <span>{text}</span>
    </div>
  );
}