import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f5ef] px-5 text-[#171511]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#171511] text-[#f7f5ef]">
              <Mail className="size-4" />
            </span>
            Mailico
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="rounded-full">
              <Link href="/pricing">Plans</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-full">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="rounded-full bg-[#171511] text-[#f7f5ef] hover:bg-[#2a251d]">
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-10">
          <div className="max-w-2xl">
            <div className="mb-8 inline-flex rounded-full border border-[#171511]/15 bg-white/60 px-3 py-1 text-xs font-medium text-[#5f594d]">
              Private mail operations for your organization
            </div>
            <h1 className="text-balance text-6xl font-semibold leading-[0.92] tracking-[-0.06em] sm:text-7xl lg:text-8xl">
              Company mail, without the noise.
            </h1>
            <p className="mt-7 max-w-lg text-pretty text-base leading-7 text-[#686154] sm:text-lg">
              Set up your business mail domain, assign employee addresses, and manage company messages in one focused workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full bg-[#171511] text-[#f7f5ef] hover:bg-[#2a251d]">
                <Link href="/mail">
                  Open workspace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-[#171511]/15 bg-white/50">
                <Link href="/manual">Read manual</Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:mr-0">
            <div className="absolute -inset-8 rounded-[3rem] bg-[#dbeafe]/70 blur-3xl" />
            <div className="relative rounded-[2rem] border border-[#171511]/10 bg-white/75 p-4 shadow-sm backdrop-blur">
              <div className="rounded-[1.5rem] border border-[#171511]/10 bg-[#fbfaf6] p-5">
                <div className="flex items-center justify-between border-b border-[#171511]/10 pb-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8a8172]">Today</p>
                    <p className="mt-1 text-lg font-semibold">Operations Inbox</p>
                  </div>
                  <span className="rounded-full bg-[#c7e3ff] px-3 py-1 text-xs font-semibold text-[#17324d]">Live</span>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    ["HR", "New sender assigned", "2 min"],
                    ["Ops", "Client thread archived", "18 min"],
                    ["Chief", "Department list updated", "1 hr"],
                  ].map(([team, subject, time]) => (
                    <div key={subject} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-2xl border border-[#171511]/8 bg-white px-3 py-3">
                      <div className="flex size-11 items-center justify-center rounded-full bg-[#171511] text-xs font-semibold text-white">
                        {team}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{subject}</p>
                        <p className="text-xs text-[#8a8172]">mail.example.com</p>
                      </div>
                      <p className="text-xs text-[#8a8172]">{time}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-[#171511] p-4 text-[#f7f5ef]">
                  <p className="text-xs text-[#c9c2b3]">Access model</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">Admin, Chief, HR Lead</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
