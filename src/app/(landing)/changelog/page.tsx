'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import {
  Bug,
  Calendar,
  CreditCard,
  Layout,
  ShieldCheck,
  Zap
} from 'lucide-react'
import Link from 'next/link'

const videoSrc =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4'

const navLinks = ['Product', 'Developers', 'Pricing', 'Resources']

const updates = [
  {
    date: 'January 9, 2026',
    version: 'v0.8.4',
    title: 'Billing, Navigation & Performance',
    description:
      'We focused on making Mailico more reliable and ready for production usage.',
    items: [
      {
        type: 'feature',
        title: 'Premium Billing & Usage Dashboard',
        description:
          'New billing page with real-time usage tracking for emails, sender identities, and team members.',
        icon: <CreditCard className='h-4 w-4' />
      },
      {
        type: 'fix',
        title: 'Router Initialization Fix',
        description:
          'Resolved a critical issue where "router" was undefined in the tasks layout, causing navigation failures.',
        icon: <Bug className='h-4 w-4' />
      },
      {
        type: 'improvement',
        title: 'Landing Page v2',
        description:
          'Complete redesign of the landing page with high-fidelity mockups and improved conversion flows.',
        icon: <Layout className='h-4 w-4' />
      }
    ]
  },
  {
    date: 'January 3, 2026',
    version: 'v0.8.0',
    title: 'Dashboard V2 & Real-time Analytics',
    description:
      'A major milestone in how you observe and manage your email traffic.',
    items: [
      {
        type: 'feature',
        title: 'Real-time Ingestion Graphs',
        description:
          'New real-time charts in the control panel showing email ingestion and delivery status as it happens.',
        icon: <Zap className='h-4 w-4' />
      },
      {
        type: 'feature',
        title: 'Inbox View Redesign',
        description:
          'A cleaner, faster inbox interface with improved filtering and rapid-preview reading panes.',
        icon: <Layout className='h-4 w-4' />
      },
      {
        type: 'improvement',
        title: 'Advanced Security Logs',
        description:
          'SOC2-ready activity logs and per-session security monitoring now available in the control panel.',
        icon: <ShieldCheck className='h-4 w-4' />
      }
    ]
  }
]

export default function ChangelogPage() {
  return (
    <main className='min-h-screen bg-[#020202] text-white'>
      <section className='relative isolate overflow-hidden text-white'>
        <video
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          className='absolute inset-0 h-full w-full object-cover'
        />
        <div className='absolute inset-0 bg-black/60' />

        <div className='relative flex min-h-[40vh] flex-col'>
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

          <div className='flex flex-1 items-center justify-center px-6 pb-[102px] pt-[140px] max-md:pb-[80px] max-md:pt-[120px]'>
            <div className='flex w-full max-w-[820px] flex-col items-center gap-6 text-center'>
              <h1 className='text-[48px] font-medium leading-[1.2] max-md:text-[32px]'>
                Changelog
              </h1>
              <p className='max-w-[680px] text-[15px] font-normal text-white/70'>
                Stay up to date with the latest features, improvements, and
                fixes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className='mx-auto max-w-3xl px-5 py-20'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-16 text-center'
        >
          <Badge className='mb-4 border-none bg-indigo-500/10 text-indigo-600'>
            Product Updates
          </Badge>
          <h1 className='text-4xl font-bold md:text-5xl'>
            What&apos;s New in Mailico
          </h1>
          <p className='mx-auto mt-4 max-w-xl text-lg text-white/60'>
            Stay up to date with the latest features, improvements and fixes
            we&apos;re shipping to make Mailico the best email platform for
            product teams.
          </p>
        </motion.div>

        <div className='space-y-12'>
          {updates.map((update, i) => (
            <motion.section
              key={update.date}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className='relative pl-8 md:pl-0'
            >
              <div className='absolute bottom-0 left-0 top-0 w-px bg-white/10 md:hidden' />

              <div className='grid grid-cols-1 gap-8 md:grid-cols-[160px_1fr]'>
                <div className='hidden pt-1 text-right md:block'>
                  <div className='flex items-center justify-end gap-2 text-sm font-semibold text-emerald-500'>
                    <Calendar className='h-4 w-4' />
                    {update.date}
                  </div>
                  <div className='mt-1 text-xs text-white/50'>
                    {update.version}
                  </div>
                </div>

                <div className='relative rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm transition-shadow hover:shadow-md md:p-8'>
                  <div className='mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-500 md:hidden'>
                    {update.date} • {update.version}
                  </div>

                  <h2 className='mb-3 text-2xl font-bold'>{update.title}</h2>
                  <p className='mb-8 leading-relaxed text-white/60'>
                    {update.description}
                  </p>

                  <div className='space-y-6'>
                    {update.items.map((item, j) => (
                      <div key={j} className='flex gap-4'>
                        <div
                          className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            item.type === 'feature'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : item.type === 'fix'
                                ? 'bg-red-500/10 text-red-600'
                                : 'bg-sky-500/10 text-sky-600'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div>
                          <div className='flex items-center gap-2'>
                            <h3 className='text-sm font-semibold'>
                              {item.title}
                            </h3>
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                item.type === 'feature'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : item.type === 'fix'
                                    ? 'bg-red-500/10 text-red-600'
                                    : 'bg-sky-500/10 text-sky-600'
                              }`}
                            >
                              {item.type}
                            </span>
                          </div>
                          <p className='mt-1 text-xs leading-normal text-white/50'>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className='relative mt-20 overflow-hidden rounded-[2.5rem] bg-indigo-600 p-8 text-center text-white'
        >
          <div className='absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl' />
          <h3 className='relative z-10 text-xl font-bold'>
            Follow the journey
          </h3>
          <p className='relative z-10 mt-2 text-sm text-indigo-100/80'>
            Get real-time updates as we ship new features.
          </p>
          <div className='relative z-10 mt-6 flex justify-center gap-3'>
            <Button className='rounded-full bg-white text-indigo-600 hover:bg-slate-100'>
              Subscribe to Updates
            </Button>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
