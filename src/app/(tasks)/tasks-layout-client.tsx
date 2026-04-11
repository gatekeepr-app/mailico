'use client'

import BottomNav from '@/components/Layout/BottomNav'
import ComposeModal from '@/components/Layout/ComposeModal'
import SideBar from '@/components/Layout/SideBar'
import { User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ReactNode, useState } from 'react'
import { ComposeContext } from './compose-context'

type User = {
  name: string
  email: string
  avatar: string
}

export default function TasksLayoutClient({
  children,
  user
}: {
  children: ReactNode
  user: User | undefined
}) {
  const router = useRouter()
  const [composeOpen, setComposeOpen] = useState(false)

  return (
    <ComposeContext.Provider value={{ composeOpen, setComposeOpen }}>
      {/* Compose */}
      <ComposeModal open={composeOpen} onOpenChange={setComposeOpen} />

      {/* App shell */}
      <div className='min-h-screen bg-background text-foreground transition-colors'>
        <div className='mx-auto max-w-[1400px] px-3 py-4 md:px-5'>
          {/* Top bar */}
          {/* <div className='sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-black/60'>
            <div className='mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-3 md:px-5'>
              <div className='flex items-center gap-2'>
                <div className='grid h-9 w-9 place-items-center rounded-full bg-[#e9eef6] dark:bg-white/10'>
                  <Mail className='h-5 w-5' />
                </div>
                <div className='text-md hidden font-semibold md:block'>
                  Mailico
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  className='h-10 rounded-full'
                  onClick={() => router.refresh()}
                >
                  <RefreshCcw className='h-4 w-4' />
                </Button>
                <Button
                  variant='ghost'
                  className='h-10 rounded-full'
                  onClick={() => router.push('/control')}
                >
                  <Settings className='h-4 w-4' />
                </Button>

                <div className='ml-1 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-white/5'>
                  {user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user?.name || 'User'}
                      width={64}
                      height={64}
                      className='h-8 w-8 rounded-full object-cover'
                    />
                  ) : (
                    <div className='flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800'>
                      <User className='h-4 w-4 text-slate-500' />
                    </div>
                  )}
                  <div className='hidden pr-2 md:block'>
                    <div className='text-xs font-semibold leading-4'>
                      {user?.name}
                    </div>
                    <div className='text-[11px] leading-4 text-slate-500 dark:text-slate-400'>
                      {user?.email}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div> */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]'>
            {/* Sidebar */}
            <aside className='hidden md:block'>
              <SideBar setComposeOpen={setComposeOpen} />
            </aside>

            {/* Page content */}
            <main className='pb-24 md:pb-6'>{children}</main>
          </div>
        </div>
        <BottomNav />
      </div>
    </ComposeContext.Provider>
  )
}
