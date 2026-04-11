'use client'

import { signOut } from '@/lib/auth-api'
import {
  CalendarClock,
  Layers3,
  LogOut,
  Mail,
  MessageSquareText,
  Send,
  SlidersHorizontal
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const tabs = [
  { href: '/inbox', label: 'Inbox', icon: Mail },
  { href: '/sent', label: 'Sent', icon: Send },
  { href: '/scheduled', label: 'Scheduled', icon: CalendarClock },
  { href: '/sms', label: 'SMS', icon: MessageSquareText },
  { href: '/automation', label: 'Automation', icon: Layers3 },
  { href: '/control', label: 'Control', icon: SlidersHorizontal }
] as const

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  // Hide on marketing pages & auth
  if (
    !pathname ||
    pathname === '/' ||
    pathname === '/auth' ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/changelog')
  )
    return null

  return (
    <nav className='fixed inset-x-0 bottom-0 z-50 md:hidden'>
      <div className='mx-auto max-w-screen-sm px-4 pb-[env(safe-area-inset-bottom)]'>
        <div className='mb-4 rounded-2xl border border-slate-200 bg-white/90 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5'>
          <div className='grid grid-cols-7 gap-1 p-2'>
            {tabs.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + '/')

              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex flex-col items-center rounded-xl px-3 py-2 text-[11px] transition-colors',
                    active
                      ? 'bg-[#7DFF6A] text-black shadow-[0_0_14px_rgba(125,255,106,0.5)]'
                      : 'text-slate-500 hover:text-black dark:text-white/60 dark:hover:text-white'
                  ].join(' ')}
                >
                  <Icon className='mb-1 h-5 w-5' />
                  <span className='leading-none'>{label}</span>
                </Link>
              )
            })}
            <button
              type='button'
              onClick={async () => {
                try {
                  await signOut()
                } catch {
                  // ignore errors
                }
                router.replace('/auth')
                router.refresh()
              }}
              className='flex flex-col items-center rounded-xl px-3 py-2 text-[11px] text-slate-500 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white'
            >
              <LogOut className='mb-1 h-5 w-5' />
              <span className='leading-none'>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
