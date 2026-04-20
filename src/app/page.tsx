'use client'

import { Hexagon, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'

const videoSrc =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4'

const navLinks = ['Product', 'Developers', 'Pricing', 'Resources']

const stats = [
  {
    label: 'Active workspaces',
    value: '3,200+',
    sub: 'Teams running Mailico in prod'
  },
  { label: 'API latency', value: '118ms', sub: 'Global median roundtrip' },
  {
    label: 'Volume processed',
    value: '4.7B',
    sub: 'Emails orchestrated this year'
  },
  { label: 'Support CSAT', value: '98%', sub: 'Protocol engineer satisfaction' }
]

const features = [
  {
    title: 'Deliverability guardrails',
    body: 'Managed DNS, proactive warmups, and automated reputation checks keep every Mailico workspace healthy.',
    accent: 'from-[#cdd0ff]/40 via-white/70 to-transparent'
  },
  {
    title: 'Realtime email pipeline',
    body: 'Transactional, lifecycle, and broadcast flows share one resilient queue with adaptive routing across providers.',
    accent: 'from-[#7df7c9]/35 via-white/60 to-transparent'
  },
  {
    title: 'Extensible API + Studio',
    body: 'Typed SDKs, template Studio, and event webhooks snap directly into your app or warehouse pipelines.',
    accent: 'from-[#facc15]/30 via-white/55 to-transparent'
  }
]

const builderCards = [
  {
    title: 'Transactional core',
    tag: 'OTPs, receipts, alerts',
    body: 'Ship login links, purchase receipts, and usage digests with Mailico functions and Studio templates.'
  },
  {
    title: 'Lifecycle journeys',
    tag: 'Segments + experiments',
    body: 'Blend behavioral triggers with workspace attributes to automate onboarding, nurture, and retention series.'
  },
  {
    title: 'Operational cockpit',
    tag: 'Logs + incidents',
    body: 'Replay sends, inspect queue health, and feed incident alerts straight to on-call from one workspace.'
  }
]

export default function HomePage() {
  const { resolvedTheme, setTheme } = useTheme()
  const theme = (resolvedTheme ?? 'dark') as 'dark' | 'light'
  const isDark = theme === 'dark'

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <main
      className={`${isDark ? 'bg-[#020202] text-white' : 'bg-[#f6f6fb] text-slate-900'} transition-colors`}
    >
      <HeroSection isDark={isDark} />

      <div className='relative z-10 space-y-28 px-6 py-24 md:px-12 lg:px-24'>
        <StatsBlock isDark={isDark} />
        <FeatureBlock isDark={isDark} />
        <ExperienceBlock isDark={isDark} />
        <BuilderBlock isDark={isDark} />
        <CtaBlock isDark={isDark} />
      </div>

      <ThemeToggle theme={theme} onToggle={handleToggle} />
    </main>
  )
}

function HeroSection({ isDark }: { isDark: boolean }) {
  return (
    <section className='relative isolate min-h-screen overflow-hidden text-white'>
      <video
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        className='absolute inset-0 h-full w-full object-cover'
      />
      <div className='absolute inset-0 bg-black/50' />

      <div className='relative flex min-h-screen flex-col'>
        <header className='flex items-center justify-between px-[120px] py-[20px] max-xl:px-16 max-lg:px-12 max-md:px-6 max-md:py-4'>
          <div className='flex flex-1 items-center gap-10 max-md:gap-4'>
            <span
              className='text-[20px] font-semibold tracking-[0.25em]'
              style={{ width: 187, height: 25 }}
            >
              MAILICO
            </span>
            <nav className='hidden items-center gap-[30px] text-[14px] font-medium md:flex'>
              {navLinks.map(link => {
                const href =
                  link === 'Pricing'
                    ? '/pricing'
                    : link === 'Product'
                      ? '/'
                      : link === 'Developers'
                        ? '/changelog'
                        : link === 'Resources'
                          ? '/blog'
                          : '/'
                return (
                  <Link
                    key={link}
                    href={href}
                    className='flex items-center gap-[14px] text-white transition hover:text-white/80'
                  >
                    <span>{link}</span>
                    {/* <ChevronDown className='h-[14px] w-[14px]' /> */}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className='flex items-center gap-3 text-sm font-medium'>
            <Link
              href='/auth?mode=signin'
              className='hidden text-white/70 transition hover:text-white md:inline-flex'
            >
              Log in
            </Link>
            <Link
              href='/auth?mode=signup'
              className='inline-flex items-center rounded-full border border-white/70 px-5 py-2 text-white shadow-[0_15px_40px_rgba(0,0,0,0.35)] transition hover:bg-white/10'
            >
              Create account
            </Link>
          </div>
        </header>

        <div className='flex flex-1 items-center justify-center px-6 pb-[102px] pt-[280px] max-md:pb-[80px] max-md:pt-[200px]'>
          <div className='flex w-full max-w-[820px] flex-col items-center gap-10 text-center'>
            <div className='inline-flex items-center gap-3 rounded-[20px] border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-medium text-white/60'>
              <span className='h-2 w-2 rounded-full bg-white' />
              <span>Mailico beta cohort</span>
              <span className='text-white'>Now onboarding weekly</span>
            </div>
            <h1
              className='max-w-[613px] text-center text-[56px] font-medium leading-[1.28] max-md:text-[36px]'
              style={{
                backgroundImage:
                  'linear-gradient(144.5deg, rgba(255,255,255,1) 28%, rgba(0,0,0,0) 115%)',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}
            >
              Email infrastructure for teams that ship nonstop
            </h1>
            <p className='max-w-[680px] text-[15px] font-normal text-white/70'>
              Mailico coordinates deliverability guardrails, provider routing,
              templating, and analytics so engineering, lifecycle, and ops share
              the same surface from first OTP to global launches.
            </p>
            <div className='pt-2'>
              <AuthButtons isDark={isDark} className='justify-center' />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const StatsBlock = ({ isDark }: { isDark: boolean }) => {
  const sub = isDark ? 'text-white/60' : 'text-slate-500'
  const surface = isDark
    ? 'border-white/10 bg-black/30 text-white'
    : 'border-slate-200 bg-white text-slate-900'

  return (
    <div
      className={`grid gap-4 rounded-[36px] border p-6 text-sm backdrop-blur-xl max-lg:grid-cols-2 max-sm:grid-cols-1 lg:grid-cols-4 ${
        isDark
          ? 'border-white/10 bg-gradient-to-br from-white/5 to-transparent'
          : 'border-slate-200 bg-white'
      }`}
    >
      {stats.map(item => (
        <div
          key={item.label}
          className={`rounded-2xl border px-5 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.15)] ${surface}`}
        >
          <div className={`text-[13px] uppercase tracking-wide ${sub}`}>
            {item.label}
          </div>
          <div className='mt-2 text-3xl font-semibold'>{item.value}</div>
          <div className={`mt-1 text-xs ${sub}`}>{item.sub}</div>
        </div>
      ))}
    </div>
  )
}

const FeatureBlock = ({ isDark }: { isDark: boolean }) => {
  const sub = isDark ? 'text-white/70' : 'text-slate-600'
  const surf = isDark
    ? 'border-white/10 bg-black/40'
    : 'border-slate-200 bg-white'

  return (
    <section className='space-y-8'>
      <div className='text-center'>
        <p
          className={`text-xs uppercase tracking-[0.3em] ${isDark ? 'text-white/50' : 'text-slate-500'}`}
        >
          Capabilities
        </p>
        <h2 className='mt-3 text-4xl font-semibold'>
          One Mailico workspace. Infinite throughput.
        </h2>
        <p className={`mx-auto mt-3 max-w-2xl text-base ${sub}`}>
          Built for product teams that send email every hour. Mailico automates
          compliance, deliverability, and analytics so your stack can stay
          focused on product.
        </p>
      </div>
      <div className='grid gap-6 md:grid-cols-3'>
        {features.map(feature => (
          <div
            key={feature.title}
            className={`relative overflow-hidden rounded-[32px] border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] ${surf}`}
          >
            <div
              className={`absolute -top-12 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-gradient-to-b opacity-70 blur-3xl ${feature.accent}`}
            />
            <div className='relative'>
              <h3 className='text-xl font-semibold'>{feature.title}</h3>
              <p className={`mt-3 text-sm ${sub}`}>{feature.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const ExperienceBlock = ({ isDark }: { isDark: boolean }) => {
  const sub = isDark ? 'text-white/70' : 'text-slate-600'

  return (
    <section
      className={`grid gap-6 rounded-[40px] border p-8 shadow-[0_25px_80px_rgba(0,0,0,0.2)] lg:grid-cols-[1.2fr_0.8fr] ${
        isDark ? 'border-white/10 bg-black/30' : 'border-slate-200 bg-white'
      }`}
    >
      <div>
        <p
          className={`text-xs uppercase tracking-[0.3em] ${isDark ? 'text-white/50' : 'text-slate-500'}`}
        >
          Experience layer
        </p>
        <h3 className='mt-4 text-3xl font-semibold'>
          Real-time experiences with Mailico orchestration.
        </h3>
        <p className={`mt-4 text-sm ${sub}`}>
          Orchestrate transactional, lifecycle, and broadcast journeys across
          regions while Mailico keeps queues synchronized, retries graceful, and
          data accessible anywhere.
        </p>
        <ul
          className={`mt-6 space-y-3 text-sm ${isDark ? 'text-white/80' : 'text-slate-800'}`}
        >
          <li className='flex items-center gap-2'>
            <Sparkles className='h-4 w-4 text-emerald-400' /> Mailico Studio
            templates pull live customer data and preferences on every send.
          </li>
          <li className='flex items-center gap-2'>
            <Zap className='h-4 w-4 text-sky-400' /> Triggered sends route
            across connected providers automatically with smart failover.
          </li>
          <li className='flex items-center gap-2'>
            <ShieldCheck className='h-4 w-4 text-yellow-300' /> Compliance
            controls capture full audit trails, suppressions, and anomaly alerts
            for every workspace.
          </li>
        </ul>
      </div>
      <div
        className={`rounded-3xl border p-6 text-sm shadow-inner ${
          isDark
            ? 'border-white/10 bg-gradient-to-b from-white/10 to-black/60'
            : 'border-slate-200 bg-gradient-to-b from-white to-slate-100'
        }`}
      >
        <h4 className='text-lg font-semibold'>Adaptive Pathing</h4>
        <p className={`mt-2 ${sub}`}>
          Delivery Monitor → Region Orchestrator → Queue Mesh → Inbox Insights.
        </p>
        <div className={`mt-6 flex flex-col gap-3 text-xs ${sub}`}>
          {[
            'Signal ingestion',
            'List hydration',
            'Route selection',
            'Inbox analytics'
          ].map(step => (
            <div
              key={step}
              className={`rounded-full border px-4 py-2 ${isDark ? 'border-white/15' : 'border-slate-200'}`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const BuilderBlock = ({ isDark }: { isDark: boolean }) => {
  const sub = isDark ? 'text-white/70' : 'text-slate-600'

  return (
    <section
      className={`space-y-6 rounded-[40px] border p-8 shadow-[0_20px_70px_rgba(0,0,0,0.2)] ${isDark ? 'border-white/10 bg-gradient-to-br from-white/5 to-transparent' : 'border-slate-200 bg-white'}`}
    >
      <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <div>
          <p
            className={`text-xs uppercase tracking-[0.3em] ${isDark ? 'text-white/50' : 'text-slate-500'}`}
          >
            Builders
          </p>
          <h3 className='mt-2 text-3xl font-semibold'>
            Mailico use cases that ship in days, not quarters.
          </h3>
        </div>
        <Link
          href='/auth?mode=signin'
          className={`text-sm underline-offset-4 hover:underline ${sub}`}
        >
          Launch the console
        </Link>
      </div>
      <div className='grid gap-6 md:grid-cols-3'>
        {builderCards.map(card => (
          <div
            key={card.title}
            className={`rounded-[28px] border p-6 ${isDark ? 'border-white/10 bg-black/35' : 'border-slate-200 bg-white'}`}
          >
            <span
              className={`text-[11px] uppercase tracking-[0.3em] ${isDark ? 'text-white/40' : 'text-slate-500'}`}
            >
              {card.tag}
            </span>
            <h4 className='mt-3 text-xl font-semibold'>{card.title}</h4>
            <p className={`mt-2 text-sm ${sub}`}>{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const CtaBlock = ({ isDark }: { isDark: boolean }) => {
  const sub = isDark ? 'text-white/70' : 'text-slate-600'
  return (
    <section
      className={`rounded-[48px] border p-10 text-center shadow-[0_25px_80px_rgba(0,0,0,0.25)] ${isDark ? 'border-white/10 bg-black/50' : 'border-slate-200 bg-white'}`}
    >
      <p
        className={`text-xs uppercase tracking-[0.35em] ${isDark ? 'text-white/50' : 'text-slate-500'}`}
      >
        Launch faster
      </p>
      <h3 className='mt-3 text-4xl font-semibold'>
        Start sending with Mailico today.
      </h3>
      <p className={`mx-auto mt-4 max-w-2xl text-base ${sub}`}>
        Spin up a workspace, connect your provider once, and invite teammates to
        orchestrate campaigns and transactional flows. Log in anytime to keep
        shipping.
      </p>
      <div className='mt-8'>
        <AuthButtons isDark={isDark} className='justify-center' />
      </div>
    </section>
  )
}

function AuthButtons({
  isDark,
  className
}: {
  isDark: boolean
  className?: string
}) {
  const containerClasses = ['flex flex-wrap items-center gap-3', className]
    .filter(Boolean)
    .join(' ')

  const primary = isDark
    ? 'bg-white text-black shadow-[0_15px_40px_rgba(255,255,255,0.18)] hover:bg-white/90'
    : 'bg-black text-white shadow-[0_15px_35px_rgba(15,23,42,0.25)] hover:bg-black/85'

  const secondary = isDark
    ? 'border border-white/30 text-white/80 hover:bg-white/10'
    : 'border border-slate-300 text-slate-700 hover:bg-slate-100'

  return (
    <div className={containerClasses}>
      <Link
        href='/auth?mode=signup'
        className={`rounded-full px-6 py-3 text-sm font-medium transition ${primary}`}
      >
        Create an account
      </Link>
      <Link
        href='/auth?mode=signin'
        className={`rounded-full px-6 py-3 text-sm font-medium transition ${secondary}`}
      >
        Log in
      </Link>
    </div>
  )
}

function ThemeToggle({
  theme,
  onToggle
}: {
  theme: 'dark' | 'light'
  onToggle: () => void
}) {
  const isDark = theme === 'dark'
  const styles = isDark
    ? 'border-white/30 bg-black/60 text-white/80 hover:bg-black/80'
    : 'border-slate-300 bg-white text-slate-800 shadow-[0_12px_30px_rgba(15,23,42,0.18)] hover:bg-white/90'

  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-6 right-6 z-20 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm backdrop-blur-lg transition ${styles}`}
    >
      {isDark ? 'Switch to Light' : 'Switch to Dark'}
      <Hexagon className='h-4 w-4' />
    </button>
  )
}
