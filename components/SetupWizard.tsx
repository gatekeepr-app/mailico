"use client";

import { FormEvent, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  CircleNotch,
  EnvelopeSimple,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResendStatus =
  | "missing_key"
  | "invalid_key"
  | "domain_missing"
  | "pending"
  | "partially_verified"
  | "failed"
  | "verified";

const STATUS_COPY: Record<ResendStatus, { title: string; detail: string }> = {
  missing_key: {
    title: "API key not configured",
    detail: "Add RESEND_API_KEY to the Next.js and Convex server environments, then restart or redeploy.",
  },
  invalid_key: {
    title: "Resend rejected the key",
    detail: "Check that the key is active and can list domains. Use the same key in both server environments.",
  },
  domain_missing: {
    title: "Domain not found in Resend",
    detail: "Add this exact domain in Resend, publish the DNS records it provides, then check again.",
  },
  pending: {
    title: "DNS verification is still pending",
    detail: "Publish the records shown in Resend. DNS changes can take time to appear; check again later.",
  },
  partially_verified: {
    title: "Domain is partially verified",
    detail: "Open the domain in Resend and finish the sending DNS checks before using this sender.",
  },
  failed: {
    title: "Resend needs a DNS fix",
    detail: "Review the failed records in Resend, correct them, then check the status again.",
  },
  verified: {
    title: "Your sender domain is ready",
    detail: "Resend accepted the API key and verified this domain for sending.",
  },
};

export default function SetupWizard({ accountEmail }: { accountEmail: string }) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Mailico";
  const [domain, setDomain] = useState("");
  const [ownerLocalPart, setOwnerLocalPart] = useState("admin");
  const [bootstrapToken, setBootstrapToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ domain: string; ownerAddress: string } | null>(null);
  const [resendStatus, setResendStatus] = useState<ResendStatus | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, ownerLocalPart, bootstrapToken }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save company setup.");
      setSaved(result);
      setBootstrapToken("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save company setup.");
    } finally {
      setSaving(false);
    }
  }

  async function checkResend() {
    setChecking(true);
    setError(null);
    try {
      const response = await fetch("/api/setup/resend-status", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not check Resend status.");
      setResendStatus(result.status as ResendStatus);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not check Resend status.");
    } finally {
      setChecking(false);
    }
  }

  const steps = [
    { number: "01", label: "Company address", complete: Boolean(saved) },
    { number: "02", label: "Resend connection", complete: resendStatus === "verified" },
  ];

  return (
    <main className="grid min-h-[100dvh] bg-[#f5f5f0] text-[#1c2824] lg:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)]">
      <aside className="relative flex min-h-56 flex-col justify-between overflow-hidden bg-[#193e37] px-6 py-7 text-[#f4f5ef] sm:px-10 sm:py-9 lg:min-h-[100dvh] lg:px-12 lg:py-12">
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/15 lg:inset-x-auto lg:bottom-12 lg:left-12 lg:right-12" />
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center border border-white/20 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <EnvelopeSimple size={19} weight="regular" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide">{appName}</p>
              <p className="text-xs text-white/60">Business setup</p>
            </div>
          </div>

          <div className="mt-10 max-w-sm lg:mt-[18vh]">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b7d6c9]">Your workspace starts here</p>
            <h1 className="mt-4 text-3xl font-medium leading-tight tracking-[-0.035em] sm:text-4xl">
              Give your team a company address.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Set the sender domain, claim the first address, then connect it to Resend.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-auto lg:grid-cols-1">
          {steps.map((step) => (
            <div key={step.number} className="flex items-start gap-3 border-t border-white/20 pt-3">
              <span className={`font-mono text-xs ${step.complete ? "text-[#b7d6c9]" : "text-white/45"}`}>
                {step.complete ? <CheckCircle size={16} weight="regular" aria-label="Complete" /> : step.number}
              </span>
              <span className={`text-sm ${step.complete ? "text-white" : "text-white/65"}`}>{step.label}</span>
            </div>
          ))}
          <div className="hidden border-t border-white/20 pt-3 text-xs leading-5 text-white/50 lg:block">
            Signed in as<br /><span className="break-all text-white/80">{accountEmail}</span>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 items-start px-5 py-9 sm:px-10 sm:py-12 lg:items-center lg:px-[8%] lg:py-16">
        <div key={saved ? "resend" : "company"} className="flow-enter mx-auto w-full max-w-2xl">
          <div className="mb-8 flex items-center justify-between border-b border-[#d9ddd6] pb-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#557066]">
              {saved ? "Step 2 of 2" : "Step 1 of 2"}
            </p>
            <p className="max-w-[55%] truncate text-xs text-[#77827c] lg:hidden">{accountEmail}</p>
          </div>

          {!saved ? (
            <>
              <div className="max-w-xl">
                <p className="text-sm font-medium text-[#347563]">Company sender</p>
                <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">Choose your mail domain</h2>
                <p className="mt-3 max-w-[58ch] text-sm leading-6 text-[#68746e]">
                  The owner must use the one-time setup token provided by the deployment operator. You can use an existing Resend domain or verify one before sending.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-9 space-y-7">
                <div className="grid gap-2">
                  <Label htmlFor="owner-setup-token" className="text-sm font-medium text-[#25342e]">One-time owner setup token</Label>
                  <Input
                    id="owner-setup-token"
                    type="password"
                    value={bootstrapToken}
                    onChange={(event) => setBootstrapToken(event.target.value)}
                    placeholder="Provided by your deployment operator"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11 rounded-none border-[#cbd3cc] bg-white px-3 text-sm focus-visible:border-[#347563] focus-visible:ring-[#347563]/20"
                    required
                  />
                  <p className="text-xs leading-5 text-[#77827c]">Configure <code>MAILICO_OWNER_SETUP_TOKEN</code> in the Next.js server environment first. This token is checked by the server and is not saved with your company settings.</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="business-domain" className="text-sm font-medium text-[#25342e]">Business mail domain</Label>
                  <Input
                    id="business-domain"
                    value={domain}
                    onChange={(event) => setDomain(event.target.value)}
                    placeholder="mail.example.com"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11 rounded-none border-[#cbd3cc] bg-white px-3 text-sm focus-visible:border-[#347563] focus-visible:ring-[#347563]/20"
                    required
                  />
                  <p className="text-xs leading-5 text-[#77827c]">Domain only. Leave out the protocol and any email address.</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="owner-address" className="text-sm font-medium text-[#25342e]">First company address</Label>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] border border-[#cbd3cc] bg-white focus-within:border-[#347563] focus-within:ring-2 focus-within:ring-[#347563]/15">
                    <Input
                      id="owner-address"
                      value={ownerLocalPart}
                      onChange={(event) => setOwnerLocalPart(event.target.value)}
                      placeholder="admin"
                      autoComplete="off"
                      spellCheck={false}
                      className="h-11 rounded-none border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0"
                      required
                    />
                    <span title={`@${domain}`} className="flex max-w-[45vw] items-center truncate whitespace-nowrap border-l border-[#cbd3cc] bg-[#f7f8f4] px-3 text-xs text-[#68746e] sm:max-w-64">@{domain || "your-domain.com"}</span>
                  </div>
                  <p className="text-xs leading-5 text-[#77827c]">This sender is assigned to your owner account. Example: admin@mail.example.com.</p>
                </div>

                {error && <p role="alert" className="border-l-2 border-[#a73f36] bg-[#fbf1ef] px-3 py-2 text-sm leading-5 text-[#85352e]">{error}</p>}

                <div className="flex flex-col gap-3 border-t border-[#d9ddd6] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-sm text-xs leading-5 text-[#77827c]">You can finish setup before Resend is ready. Sending remains off until the domain is verified.</p>
                  <Button type="submit" className="h-11 w-full rounded-none bg-[#286653] px-5 text-sm text-white hover:bg-[#1f5544] active:scale-[0.98] sm:w-auto" disabled={saving}>
                    {saving ? <CircleNotch size={17} weight="bold" className="animate-spin" /> : null}
                    {saving ? "Saving setup" : "Save and continue"}
                    {!saving && <ArrowRight size={16} weight="regular" />}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-8">
              <div>
                <p className="text-sm font-medium text-[#347563]">Company address saved</p>
                <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">Connect Resend</h2>
                <p className="mt-3 max-w-[58ch] text-sm leading-6 text-[#68746e]">
                  Is the Resend API key set up in your server environments? {appName} checks the key and looks up the configured domain. The key stays on the server.
                </p>
              </div>

              <div className="grid gap-5 border-y border-[#d9ddd6] py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#77827c]">Owner sender</p>
                  <p className="mt-2 break-all text-lg font-medium tracking-tight text-[#20332b]">{saved.ownerAddress}</p>
                </div>
                <p className="font-mono text-xs text-[#77827c]">{saved.domain}</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" onClick={() => void checkResend()} disabled={checking} className="h-11 w-full rounded-none bg-[#286653] text-white hover:bg-[#1f5544] active:scale-[0.98] sm:w-auto">
                  {checking ? <CircleNotch size={17} weight="bold" className="animate-spin" /> : <ShieldCheck size={17} weight="regular" />}
                  {checking ? "Checking Resend" : "Yes, check Resend"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setResendStatus("missing_key")} className="h-11 w-full rounded-none border-[#cbd3cc] bg-transparent sm:w-auto">
                  Not yet
                </Button>
              </div>

              {resendStatus && (
                <div className={`flow-enter grid gap-3 border-l-2 px-4 py-4 sm:grid-cols-[auto_1fr] ${resendStatus === "verified" ? "border-[#347563] bg-[#eaf3ed]" : "border-[#b47735] bg-[#f8f0e4]"}`} role="status" aria-live="polite">
                  <span className={resendStatus === "verified" ? "text-[#286653]" : "text-[#9b682d]"}>
                    {resendStatus === "verified" ? <CheckCircle size={20} weight="regular" /> : <WarningCircle size={20} weight="regular" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#24352e]">{STATUS_COPY[resendStatus].title}</p>
                    <p className="mt-1 text-sm leading-5 text-[#5d6963]">{STATUS_COPY[resendStatus].detail}</p>
                  </div>
                </div>
              )}

              {error && <p role="alert" className="border-l-2 border-[#a73f36] bg-[#fbf1ef] px-3 py-2 text-sm leading-5 text-[#85352e]">{error}</p>}

              <div className="flex flex-col gap-3 border-t border-[#d9ddd6] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-sm text-xs leading-5 text-[#77827c]">Set the same RESEND_API_KEY in Next.js and Convex. Add the domain in Resend and publish its DNS records.</p>
                <Button type="button" variant="ghost" onClick={() => window.location.assign("/admin")} className="h-11 justify-between rounded-none px-3 text-[#285f50] hover:bg-[#e9eee9] sm:justify-center">
                  Continue to admin <ArrowRight size={16} weight="regular" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
