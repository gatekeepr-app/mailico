'use client'

import {
  CalendarClock,
  CircleUser,
  CreditCard,
  Inbox,
  Layers3,
  LogOut,
  MessageSquareText,
  Pencil,
  Plug,
  Send,
  SlidersHorizontal
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'
import { NavItem } from '../Elements/NavItem'
import { Button } from '../ui/button'

type SideBarProps = {
  setComposeOpen: React.Dispatch<React.SetStateAction<boolean>>
  active?:
    | 'inbox'
    | 'sent'
    | 'scheduled'
    | 'automation'
    | 'integrations'
    | 'sms'
    | 'control'
    | 'billing'
    | 'profile'
}

export default function SideBar({ setComposeOpen, active }: SideBarProps) {
  const pathname = usePathname()
  const router = useRouter()

  // If 'active' prop is not provided, derive it from pathname
  const currentActive =
    active ??
    (pathname.includes('/sent')
      ? 'sent'
      : pathname.includes('/scheduled')
        ? 'scheduled'
        : pathname.includes('/integrations')
          ? 'integrations'
          : pathname.includes('/sms')
            ? 'sms'
            : pathname.includes('/automation')
              ? 'automation'
              : pathname.includes('/control')
                ? 'control'
                : pathname.includes('/billing')
                  ? 'billing'
                  : pathname.includes('/profile')
                    ? 'profile'
                    : 'inbox')

  return (
    <aside className='pt-5'>
      <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5'>
        <Button
          onClick={() => setComposeOpen(true)}
          className='h-11 w-full justify-start gap-2 rounded-full'
        >
          <Pencil className='h-4 w-4' />
          Compose
        </Button>

        <div className='mt-3 space-y-1'>
          <NavItem
            icon={<Inbox className='h-4 w-4' />}
            label='Inbox'
            href='/inbox'
            active={currentActive === 'inbox'}
          />
          <NavItem
            icon={<Send className='h-4 w-4' />}
            label='Sent'
            href='/sent'
            active={currentActive === 'sent'}
          />
          <NavItem
            icon={<CalendarClock className='h-4 w-4' />}
            label='Scheduled'
            href='/scheduled'
            active={currentActive === 'scheduled'}
          />
          <NavItem
            icon={<MessageSquareText className='h-4 w-4' />}
            label='SMS'
            href='/sms'
            active={currentActive === 'sms'}
          />
          <div className='my-2 h-px bg-slate-200 dark:bg-white/10' />
          <NavItem
            icon={<Layers3 className='h-4 w-4' />}
            label='Automation'
            href='/automation'
            active={currentActive === 'automation'}
          />
          <NavItem
            icon={<Plug className='h-4 w-4' />}
            label='Integrations'
            href='/integrations'
            active={currentActive === 'integrations'}
          />
          <NavItem
            icon={<SlidersHorizontal className='h-4 w-4' />}
            label='Control'
            href='/control'
            active={currentActive === 'control'}
          />
          <NavItem
            icon={<CreditCard className='h-4 w-4' />}
            label='Billing'
            href='/billing'
            active={currentActive === 'billing'}
          />
          <NavItem
            icon={<CircleUser className='h-4 w-4' />}
            label='Profile'
            href='/profile'
            active={currentActive === 'profile'}
          />
          <div className='my-2 h-px bg-slate-200 dark:bg-white/10' />
          <Button
            variant='ghost'
            className='h-10 w-full justify-start gap-2 rounded-full text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white'
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' })
              } catch {
                // ignore errors
              }
              router.replace('/auth')
              router.refresh()
            }}
          >
            <LogOut className='h-4 w-4' />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  )
}
