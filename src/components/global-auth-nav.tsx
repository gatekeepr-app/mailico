'use client'

import type { IdentityUser } from '@/lib/identity/server'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/sent', label: 'Sent' },
  { href: '/social', label: 'Social' },
  { href: '/automation', label: 'Automation' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/control', label: 'Control' },
  { href: '/billing', label: 'Billing' }
] as const

const appShellRoutes = [
  '/inbox',
  '/sent',
  '/scheduled',
  '/automation',
  '/control',
  '/billing',
  '/social',
  '/integrations',
  '/credentials',
  '/profile'
]

type NavUser = Pick<IdentityUser, 'name' | 'email'> & {
  avatarUrl?: string | null
}

export default function GlobalAuthNav({ user }: { user?: NavUser | null }) {
  const pathname = usePathname()

  if (!user) {
    return null
  }

  if (appShellRoutes.some(route => pathname?.startsWith(route))) {
    return null
  }

  const initials = getInitials(user.name, user.email)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className='sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 text-slate-900 backdrop-blur dark:border-white/10 dark:bg-black/60 dark:text-white'>
      <div className='mx-auto flex max-w-screen-2xl flex-wrap items-center gap-3 px-4 py-3'>
        <Link
          href='/inbox'
          className='text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-900 dark:text-white'
        >
          MAILICO
        </Link>

        <nav className='order-3 flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/60 px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70 sm:order-none sm:w-auto sm:flex-1 sm:justify-center sm:px-3 sm:text-sm'>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-full px-3 py-1.5 transition-colors',
                isActive(link.href)
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className='ml-auto flex items-center gap-2 text-xs sm:text-sm'>
          <Link
            href='/inbox'
            className='inline-flex items-center rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-2 font-semibold text-black shadow-sm transition hover:brightness-110'
          >
            Open workspace
          </Link>
          <Link
            href='/profile'
            className='inline-flex items-center gap-2 rounded-full border border-slate-200/80 px-2 py-1 text-slate-700 transition hover:border-slate-400 dark:border-white/15 dark:text-white/80'
          >
            <span className='hidden sm:inline'>{user.name || user.email}</span>
            <span className='flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-white/20 dark:text-white'>
              {initials}
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase()
    }
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`
      .toUpperCase()
      .slice(0, 2)
  }

  if (email) {
    return email.slice(0, 2).toUpperCase()
  }

  return 'ML'
}
