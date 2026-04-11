'use client'

import { signOut } from '@/lib/auth-api'
import type { IdentityUser } from '@/lib/identity/server'
import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

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

const marketingRoutes = [
  '/',
  '/pricing',
  '/contact',
  '/changelog',
  '/blog',
  '/splash'
]

type NavUser = Pick<IdentityUser, 'name' | 'email'> & {
  avatarUrl?: string | null
}

export default function GlobalAuthNav({ user }: { user?: NavUser | null }) {
  const pathname = usePathname()
  const router = useRouter()

  if (!user) {
    return null
  }

  if (appShellRoutes.some(route => pathname?.startsWith(route))) {
    return null
  }

  if (pathname === '/auth') {
    return null
  }

  const isMarketing = marketingRoutes.some(route =>
    route === '/' ? pathname === '/' : pathname?.startsWith(route)
  )

  if (!isMarketing) {
    return null
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      // ignore errors
    }
    router.replace('/auth')
    router.refresh()
  }

  return (
    <header className='sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 text-slate-900 backdrop-blur dark:border-white/10 dark:bg-black/60 dark:text-white'>
      <div className='mx-auto flex max-w-screen-2xl flex-wrap items-center gap-3 px-4 py-3'>
        <Link
          href='/'
          className='text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-900 dark:text-white'
        >
          MAILICO
        </Link>

        <div className='ml-auto flex items-center gap-2 text-xs sm:text-sm'>
          <Link
            href='/inbox'
            className='inline-flex items-center rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-2 font-semibold text-black shadow-sm transition hover:brightness-110'
          >
            Open workspace
          </Link>
          <button
            type='button'
            onClick={handleSignOut}
            className='inline-flex items-center gap-2 rounded-full border border-slate-200/80 px-3 py-2 text-slate-700 transition hover:border-slate-400 dark:border-white/15 dark:text-white/80'
          >
            <LogOut className='h-4 w-4' />
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
