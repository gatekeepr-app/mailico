import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  Envelope,
  GoogleLogo,
  HouseLine,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Plans | Mailico",
  description: "Compare Mailico Basic company mail with Premium Gmail-connected addresses.",
};

const basicFeatures = [
  "30 custom business email addresses per domain",
  "Add more addresses in groups of five",
  "Send and receive mail using your company domain",
  "A shared workspace for inbox, sent mail, drafts, and starred messages",
  "Admin and HR controls for approving employee addresses",
  "Departments and role-based access",
];

const premiumFeatures = [
  "5 Premium addresses connected to Gmail",
  "Add more Gmail-connected addresses individually",
  "Company-domain messages arrive directly in each person’s Gmail inbox",
  "Sign in with Google and work from Gmail—no separate Mailico sign-in",
  "Gmail’s native notifications and familiar inbox organization",
  "Use Google profile pictures for your company mail identity",
];

function FeatureList({ items, inverted = false }: { items: string[]; inverted?: boolean }) {
  return (
    <ul className="space-y-4">
      {items.map((feature) => (
        <li key={feature} className={`flex items-start gap-3 text-sm leading-6 ${inverted ? "text-white/80" : "text-[#454a43]"}`}>
          <span className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full ${inverted ? "bg-white/10 text-[#d7e8d8]" : "bg-[#e1ece4] text-[#286653]"}`}>
            <Check size={13} weight="bold" aria-hidden="true" />
          </span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] px-5 text-[#171a16]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between border-b border-[#171511]/10 py-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#193e37] text-[#f7f5ef]">
              <Envelope size={16} weight="regular" aria-hidden="true" />
            </span>
            Mailico
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-2">
            <Button asChild variant="ghost" className="rounded-full">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="rounded-full bg-[#193e37] text-white hover:bg-[#24564b]">
              <Link href="/register">Create account</Link>
            </Button>
          </nav>
        </header>

        <section className="pb-12 pt-14 sm:pb-16 sm:pt-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#557066]">Plans for company email</p>
            <h1 className="mt-4 text-balance text-4xl font-medium leading-[1.03] tracking-[-0.055em] sm:text-6xl">
              One domain. Two ways to work.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-[#626a61] sm:text-lg">
              Start with a managed company mail workspace, or put company email directly into your team’s Gmail.
              Plans are set up for one company domain.
            </p>
          </div>

          <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-2 lg:gap-6">
            <article className="flex flex-col border border-[#d8ddd5] bg-white p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#557066]">Mailico Basic</p>
                  <h2 className="mt-3 text-3xl font-medium tracking-[-0.045em]">Company mail, organized.</h2>
                </div>
                <span className="flex size-11 shrink-0 items-center justify-center border border-[#d8ddd5] bg-[#f7f8f4] text-[#286653]">
                  <HouseLine size={21} weight="regular" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 max-w-md text-sm leading-6 text-[#626a61]">
                A dedicated workspace for creating and managing your team’s addresses on your business domain.
              </p>
              <div className="my-6 border-t border-[#e5e8e1]" />
              <div className="flex-1">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#77827a]">Included features</p>
                <FeatureList items={basicFeatures} />
              </div>
              <Button asChild className="mt-8 h-11 rounded-full bg-[#193e37] text-white hover:bg-[#24564b]">
                <Link href="/register">
                  Get started with Basic <ArrowRight size={16} weight="regular" />
                </Link>
              </Button>
            </article>

            <article className="relative flex flex-col border border-[#193e37] bg-[#193e37] p-6 text-[#f7f5ef] sm:p-8">
              <span className="absolute right-6 top-0 -translate-y-1/2 bg-[#d7e8d8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#193e37] sm:right-8">
                Gmail connected
              </span>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b8d3c5]">Mailico Premium</p>
                  <h2 className="mt-3 text-3xl font-medium tracking-[-0.045em]">Your company mail, in Gmail.</h2>
                </div>
                <span className="flex size-11 shrink-0 items-center justify-center border border-white/20 bg-white/5 text-[#d7e8d8]">
                  <GoogleLogo size={21} weight="regular" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
                Connect company-domain addresses to Google accounts so people can handle work mail in the Gmail they already use.
              </p>
              <div className="my-6 border-t border-white/15" />
              <div className="flex-1">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Everything in Basic, plus</p>
                <FeatureList items={premiumFeatures} inverted />
              </div>
              <Button asChild className="mt-8 h-11 rounded-full bg-[#e5eee5] text-[#193e37] hover:bg-white">
                <Link href="/register">
                  Explore Premium <ArrowRight size={16} weight="regular" />
                </Link>
              </Button>
            </article>
          </div>

          <p className="mt-6 text-xs leading-5 text-[#77827a]">
            Address allowances apply per company domain. Extra addresses are paid add-ons: Basic expands in groups of five, while Premium expands one Gmail-connected address at a time.
          </p>
        </section>

        <footer className="mt-auto flex flex-col gap-3 border-t border-[#171511]/10 py-5 text-xs text-[#77827a] sm:flex-row sm:items-center sm:justify-between">
          <span>Mailico · Company email for your team</span>
          <Link href="/" className="font-medium text-[#455a50] underline-offset-4 hover:underline">Back to home</Link>
        </footer>
      </div>
    </main>
  );
}
