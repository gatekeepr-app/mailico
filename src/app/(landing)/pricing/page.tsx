'use client'

import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'

const videoSrc =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4'

const navLinks = ['Product', 'Developers', 'Pricing', 'Resources']

export default function PricingPage() {
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
        <PlansSection isDark={isDark} />
        <ComparisonSection isDark={isDark} />
        <FaqSection isDark={isDark} />
      </div>
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
      <div className='absolute inset-0 bg-black/60' />

      <div className='relative flex min-h-screen flex-col'>
        <header className='flex items-center justify-between px-[120px] py-[20px] max-xl:px-16 max-lg:px-12 max-md:px-6 max-md:py-4'>
          <div className='flex flex-1 items-center gap-10 max-md:gap-4'>
            <Link
              href='/'
              className='text-[20px] font-semibold tracking-[0.25em]'
              style={{ width: 187, height: 25 }}
            >
              MAILICO
            </Link>
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
            <h1
              className='max-w-[613px] text-center text-[56px] font-medium leading-[1.28] max-md:text-[36px]'
              style={{
                backgroundImage:
                  'linear-gradient(144.5deg, rgba(255,255,255,1) 28%, rgba(0,0,0,0) 115%)',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}
            >
              Simple, transparent pricing
            </h1>
            <p className='max-w-[680px] text-[15px] font-normal text-white/70'>
              Choose the plan that fits your current stage. Scale as you grow
              without any hidden tech debt.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

const PlansSection = ({ isDark }: { isDark: boolean }) => {
  const plans = [
    {
      name: 'Free',
      price: '0',
      description: 'Perfect for side projects and hobbies.',
      features: [
        '1 Verified Email per Domain',
        '3 Users per Domain',
        'Standard Deliverability',
        '24h Insights Retention',
        'Community Support'
      ],
      cta: 'Get Started',
      href: '/auth',
      highlight: false
    },
    {
      name: 'Pro',
      price: '20',
      period: '/month',
      description: 'Ideal for startups and professional teams.',
      features: [
        '3 Verified Emails per Domain',
        '8 Users per Domain',
        'Enhanced Deliverability',
        '30-day Insights Retention',
        'Priority Slack Support',
        'Custom Webhooks'
      ],
      cta: 'Start Pro Trial',
      href: '/auth?plan=pro',
      highlight: true
    },
    {
      name: 'Enterprise',
      price: '60',
      period: '/month',
      description: 'For organizations with massive scale.',
      features: [
        'Unlimited Emails per Domain',
        'Unlimited Users per Domain',
        'Dedicated IP (Add-on)',
        'Lifetime Insights Retention',
        '24/7 Dedicated Support',
        'SLA Guarantee'
      ],
      cta: 'Contact Sales',
      href: '/contact',
      highlight: false
    }
  ]

  return (
    <section className='space-y-8'>
      <div className='text-center'>
        <p
          className={`text-xs uppercase tracking-[0.3em] ${
            isDark ? 'text-white/50' : 'text-slate-500'
          }`}
        >
          Pricing Plans
        </p>
        <h2 className='mt-3 text-4xl font-semibold'>
          One Mailico workspace. Infinite throughput.
        </h2>
        <p
          className={`mx-auto mt-3 max-w-2xl text-base ${
            isDark ? 'text-white/70' : 'text-slate-600'
          }`}
        >
          Built for product teams that send email every hour. Choose your plan
          and scale as you grow.
        </p>
      </div>
      <div className='grid gap-6 md:grid-cols-3'>
        {plans.map((plan, i) => (
          <div
            key={plan.name}
            className={`relative overflow-hidden rounded-[32px] border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] ${
              plan.highlight
                ? isDark
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-emerald-500/50 bg-emerald-50'
                : isDark
                  ? 'border-white/10 bg-black/30'
                  : 'border-slate-200 bg-white'
            }`}
          >
            {plan.highlight && (
              <div className='absolute -top-12 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-500/30 to-transparent opacity-70 blur-3xl' />
            )}
            <div className='relative'>
              {plan.highlight && (
                <div className='absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold text-white'>
                  Most Popular
                </div>
              )}
              <div className='mb-6'>
                <h3 className='text-xl font-bold'>{plan.name}</h3>
                <p
                  className={`mt-2 text-sm ${
                    isDark ? 'text-white/60' : 'text-slate-600'
                  }`}
                >
                  {plan.description}
                </p>
                <div className='mt-4 flex items-baseline gap-1'>
                  <span className='text-4xl font-bold'>{plan.price}</span>
                  <span className='text-xl font-bold'>BDT</span>
                  {plan.period && (
                    <span
                      className={`text-sm font-medium ${
                        isDark ? 'text-white/50' : 'text-slate-500'
                      }`}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              <div className='mb-6 space-y-3'>
                {plan.features.map(feature => (
                  <div key={feature} className='flex gap-3 text-sm'>
                    <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10'>
                      <Check className='h-3 w-3 text-emerald-500' />
                    </div>
                    <span
                      className={isDark ? 'text-white/80' : 'text-slate-700'}
                    >
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Link href={plan.href}>
                <Button
                  className={`h-12 w-full rounded-full font-bold transition-all ${
                    plan.highlight
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700'
                      : isDark
                        ? 'bg-white text-black hover:bg-white/90'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const ComparisonSection = ({ isDark }: { isDark: boolean }) => {
  return (
    <section
      className={`space-y-6 rounded-[40px] border p-8 ${
        isDark
          ? 'border-white/10 bg-gradient-to-br from-white/5 to-transparent'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className='text-center'>
        <h3 className='text-3xl font-semibold'>Detailed Plan Comparison</h3>
        <p
          className={`mx-auto mt-2 max-w-xl ${
            isDark ? 'text-white/60' : 'text-slate-600'
          }`}
        >
          Everything you need to know about our infrastructure limits.
        </p>
      </div>

      <div
        className={`mt-8 overflow-hidden rounded-3xl border ${
          isDark
            ? 'border-white/10 bg-black/30'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        <table className='w-full border-collapse text-left'>
          <thead>
            <tr
              className={`border-b ${
                isDark ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              <th
                className={`p-6 text-sm font-bold uppercase tracking-wider ${
                  isDark ? 'text-white/50' : 'text-slate-500'
                }`}
              >
                Feature
              </th>
              <th
                className={`p-6 text-center text-sm font-bold uppercase tracking-wider ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Free
              </th>
              <th className='p-6 text-center text-sm font-bold uppercase tracking-wider text-emerald-500'>
                Pro
              </th>
              <th
                className={`p-6 text-center text-sm font-bold uppercase tracking-wider ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Enterprise
              </th>
            </tr>
          </thead>
          <tbody
            className={`divide-y ${
              isDark ? 'divide-white/10' : 'divide-slate-200'
            }`}
          >
            {[
              {
                label: 'Emails per Domain',
                free: '1',
                pro: '3',
                ent: 'Unlimited'
              },
              {
                label: 'Users per Domain',
                free: '3',
                pro: '8',
                ent: 'Unlimited'
              },
              {
                label: 'Domain Sharing',
                free: 'Max 3 Users',
                pro: 'Unlimited',
                ent: 'Unlimited'
              },
              {
                label: 'Real-time Insights',
                free: 'Standard',
                pro: 'Priority',
                ent: 'Enterprise'
              },
              { label: 'Custom Domain SSL', free: true, pro: true, ent: true }
            ].map((row, i) => (
              <tr
                key={i}
                className={`hover:${
                  isDark ? 'bg-white/5' : 'bg-slate-100'
                } transition-colors`}
              >
                <td className='p-6 text-sm font-medium'>{row.label}</td>
                <td
                  className={`p-6 text-center text-sm ${
                    isDark ? 'text-white/60' : 'text-slate-600'
                  }`}
                >
                  {row.free === true ? (
                    <Check className='mx-auto h-4 w-4 text-emerald-500' />
                  ) : (
                    row.free
                  )}
                </td>
                <td className='p-6 text-center text-sm font-semibold text-emerald-500'>
                  {row.pro === true ? (
                    <Check className='mx-auto h-4 w-4 text-emerald-500' />
                  ) : (
                    row.pro
                  )}
                </td>
                <td
                  className={`p-6 text-center text-sm ${
                    isDark ? 'text-white/60' : 'text-slate-600'
                  }`}
                >
                  {row.ent === true ? (
                    <Check className='mx-auto h-4 w-4 text-emerald-500' />
                  ) : (
                    row.ent
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const FaqSection = ({ isDark }: { isDark: boolean }) => {
  return (
    <section
      className={`rounded-[48px] border p-10 text-center ${
        isDark ? 'border-white/10 bg-black/50' : 'border-slate-200 bg-white'
      }`}
    >
      <p
        className={`text-xs uppercase tracking-[0.35em] ${
          isDark ? 'text-white/50' : 'text-slate-500'
        }`}
      >
        FAQ
      </p>
      <h3 className='mt-3 text-4xl font-semibold'>
        Frequently Asked Questions
      </h3>
      <div
        className={`mt-8 grid gap-8 text-left md:grid-cols-2 ${
          isDark ? 'text-white/70' : 'text-slate-600'
        }`}
      >
        <div>
          <h4 className='font-semibold text-white'>
            Can I upgrade or downgrade anytime?
          </h4>
          <p className='mt-2 text-sm'>
            Yes, you can change your plan at any time from your dashboard.
            Pro-rated charges will apply.
          </p>
        </div>
        <div>
          <h4 className='font-semibold text-white'>
            What happens if I exceed my limits?
          </h4>
          <p className='mt-2 text-sm'>
            We don&apos;t block outgoing emails immediately, but you&apos;ll
            receive a notification to upgrade your plan.
          </p>
        </div>
      </div>
    </section>
  )
}
