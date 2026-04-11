'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import DOMPurify from 'dompurify'
import { Send, Star, StarOff, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useCompose } from '../compose-context'

type Email = {
  _id: string
  user_id: string
  direction: string
  from_email: string
  to_email: string
  subject: string
  message: string | null
  starred: boolean
  created_at: string
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
}

function sanitizeEmailHtml(input: string) {
  return DOMPurify.sanitize(input, { USE_PROFILES: { html: true } })
}

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [filtered, setFiltered] = useState<Email[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { setComposeOpen } = useCompose()

  const loadEmails = useCallback(async () => {
    try {
      const res = await fetch('/api/emails?direction=inbox', {
        cache: 'no-store'
      })

      if (res.status === 401) {
        window.location.href = '/auth?next=/inbox'
        return
      }

      if (!res.ok) {
        console.error('Failed to fetch emails')
        return
      }

      const payload = await res.json()
      setEmails((payload?.emails ?? []) as Email[])
    } catch (error) {
      console.error('Error fetching emails', error)
    }
  }, [])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    setLoading(true)
    loadEmails().finally(() => setLoading(false))
    interval = setInterval(loadEmails, 15000)

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [loadEmails])

  // When emails state changes, update the filtered list
  useEffect(() => {
    setFiltered(emails)
  }, [emails])

  const selected = emails.find(e => e._id === selectedId)

  return (
    <div className='min-h-screen bg-background text-foreground transition-colors'>
      {/* Main layout */}
      <div className='mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-3 py-4 md:px-5 lg:grid-cols-[280px_1fr]'>
        {/* Content */}
        <main className='grid grid-cols-1 gap-4 lg:grid-cols-[minmax(420px,1fr)_minmax(420px,1fr)]'>
          {/* LIST */}
          <section
            className={cn(
              'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5',
              selectedId && 'hidden lg:block'
            )}
          >
            <div className='flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10'>
              <div>
                <h1 className='text-base font-semibold'>Inbox</h1>
                <p className='text-xs text-slate-500 dark:text-slate-400'>
                  {loading ? 'Loading...' : `${filtered.length} messages`}
                </p>
              </div>

              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  size='sm'
                  className='rounded-full lg:hidden'
                  onClick={() => setComposeOpen(true)}
                >
                  Compose
                </Button>
              </div>
            </div>

            <div className='max-h-[calc(100vh-12rem)] overflow-auto'>
              {/* Header row (hide on very small screens) */}
              <div className='hidden grid-cols-[24px_1fr_90px] items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:grid'>
                <div />
                <div>Sender • Subject</div>
                <div className='text-right'>Date</div>
              </div>

              <div className='divide-y divide-slate-200 dark:divide-white/10'>
                {filtered.map(m => (
                  <button
                    key={m._id}
                    onClick={() => {
                      setSelectedId(m._id)
                    }}
                    className={cn(
                      'w-full text-left transition hover:bg-[#f2f6ff] dark:hover:bg-white/5',
                      'px-4 py-3',
                      'grid gap-2',
                      'grid-cols-[24px_1fr] sm:grid-cols-[24px_1fr_90px]',
                      selectedId === m._id && 'bg-[#e8f0fe] dark:bg-white/10'
                    )}
                  >
                    <div className='flex items-center justify-center'>
                      {m.starred ? (
                        <Star className='h-4 w-4' />
                      ) : (
                        <StarOff className='h-4 w-4 text-slate-400' />
                      )}
                    </div>

                    <div className='min-w-0'>
                      <div className='truncate text-sm font-semibold'>
                        <span className='font-semibold'>{m.from_email}</span>
                      </div>
                      <div className='truncate text-xs text-slate-600 dark:text-slate-300'>
                        <span className='font-medium text-slate-800 dark:text-white'>
                          {m.subject || '(no subject)'}
                        </span>
                        <span className='mx-2 text-slate-400'>—</span>
                        {m.message?.replace(/<[^>]*>?/gm, '')}
                      </div>

                      <div className='mt-1 text-[11px] text-slate-500 dark:text-slate-400 sm:hidden'>
                        {formatDate(m.created_at)}
                      </div>
                    </div>

                    <div className='hidden text-right text-xs text-slate-500 dark:text-slate-400 sm:block'>
                      {formatDate(m.created_at)}
                    </div>
                  </button>
                ))}

                {!loading && filtered.length === 0 && (
                  <div className='px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400'>
                    No emails found.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* READING PANE */}
          <section
            className={cn(
              'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5',
              !selectedId && 'hidden lg:block'
            )}
          >
            <div className='border-b border-slate-200 px-4 py-3 dark:border-white/10'>
              <div className='mb-2 flex items-center justify-between lg:hidden'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='rounded-full lg:hidden'
                  onClick={() => setSelectedId(null)}
                >
                  ← Back
                </Button>
                <div className='text-xs text-slate-500 dark:text-slate-400'>
                  {selected ? formatDate(selected.created_at) : ''}
                </div>
              </div>

              <h2 className='truncate text-base font-semibold'>
                {selected?.subject || 'Select an email'}
              </h2>

              {selected && (
                <div className='mt-1 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1'>
                  <span>
                    <span className='font-medium text-slate-700 dark:text-slate-200'>
                      From:
                    </span>{' '}
                    {selected.from_email}
                  </span>
                  <span>
                    <span className='font-medium text-slate-700 dark:text-slate-200'>
                      To:
                    </span>{' '}
                    {selected.to_email}
                  </span>
                  <span className='hidden sm:inline'>
                    <span className='font-medium text-slate-700 dark:text-slate-200'>
                      Date:
                    </span>{' '}
                    {new Date(selected.created_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className='p-4'>
              {!selected ? (
                <div className='grid place-items-center py-20 text-sm text-slate-500 dark:text-slate-400'>
                  Choose an email to preview it here.
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 dark:border-white/10 dark:bg-white/5'>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: sanitizeEmailHtml(selected.message ?? '')
                      }}
                    />
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      variant='outline'
                      className='rounded-full'
                      onClick={() => toast.message('Resend (mock)')}
                    >
                      <Send className='mr-2 h-4 w-4' />
                      Resend
                    </Button>
                    <Button
                      variant='outline'
                      className='rounded-full'
                      onClick={() => toast.message('Delete (mock)')}
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
