import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

// Lives outside the (auth) route group deliberately: (auth)/layout.tsx wraps everything
// under it (forgot-password, change-password) in a single centered card, but this page
// needs the Figure 1 split-panel layout instead. Route groups don't affect the URL, so this
// is still served at /login — moving it out only detaches it from that shared layout.
const STATS = [
  { value: "6", label: "Modules" },
  { value: "100%", label: "Tenant isolation" },
  { value: "24/7", label: "Coverage" },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#0a0a0a] p-12 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(249,115,22,0.25), transparent 45%), radial-gradient(circle at 80% 70%, rgba(249,115,22,0.12), transparent 40%)",
          }}
        />

        <div className="relative flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#f97316] text-sm font-bold text-white">
            S
          </span>
          <span className="text-sm font-semibold tracking-wide">
            SEC<span className="text-white/50">OPS</span>
          </span>
        </div>

        <div className="relative flex flex-col gap-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Your entire SOC.
            <br />
            <span className="text-[#f97316]">One platform.</span>
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/60">
            Unified threat detection, response, and intelligence across SIEM,
            EDR, CTI, DFIR, VM, and SOAR — built for modern security teams.
          </p>
        </div>

        <div className="relative flex gap-10">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <span className="text-2xl font-semibold tabular-nums">
                {stat.value}
              </span>
              <span className="text-xs tracking-wide text-white/50 uppercase">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#f97316] text-sm font-bold text-white">
              S
            </span>
            <span className="text-sm font-semibold tracking-wide">
              SEC<span className="text-muted-foreground">OPS</span>
            </span>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
              <p className="text-sm text-muted-foreground">
                Access your tenant workspace
              </p>
            </div>

            <LoginForm />

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/forgot-password"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
