'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import DOMPurify from 'dompurify'
import { CalendarClock, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useCompose } from '../compose-context'

type SentEmail = {
  _id: string
  from_email: string
  to_email: string
  subject: string
  message: string
  starred: boolean
  created_at: string
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function stripHtml(input: string) {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeEmailHtml(input: string) {
  return DOMPurify.sanitize(input, { USE_PROFILES: { html: true } })
}

export default function ScheduledPage() {
  const [emails, setEmails] = useState<SentEmail[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const { setComposeOpen } = useCompose()

  const selected = emails.find(e => e._id === selectedId)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const res = await fetch('/api/emails?direction=scheduled', {
        cache: 'no-store'
      })

      if (res.status === 401) {
        window.location.href = '/auth?next=/scheduled'
        return
      }

      if (!res.ok) {
        toast.error('Failed to load scheduled emails')
        setLoading(false)
        return
      }

      const payload = await res.json()
      setEmails((payload?.emails ?? []) as SentEmail[])
      setLoading(false)
    }

    load()
  }, [])

  return (
    <div className='mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-3 py-4 md:grid-cols-[280px_1fr] md:px-5'>
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
              <h1 className='text-base font-semibold'>Scheduled</h1>
              <p className='text-xs text-slate-500 dark:text-slate-400'>
                {emails.length} messages
              </p>
            </div>

            <div className='flex items-center gap-2'>
              <div className='hidden text-xs text-slate-500 dark:text-slate-400 sm:block'>
                Sorted by creation date
              </div>

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
            {loading ? (
              <div className='px-4 py-10 text-sm text-slate-500'>Loading…</div>
            ) : emails.length === 0 ? (
              <div className='px-4 py-10 text-center text-sm text-slate-500'>
                No scheduled emails found.
              </div>
            ) : (
              <div className='divide-y divide-slate-200 dark:divide-white/10'>
                {emails.map(m => (
                  <button
                    key={m._id}
                    onClick={() => setSelectedId(m._id)}
                    className={cn(
                      'grid w-full grid-cols-[24px_1fr_90px] items-center gap-2 px-4 py-3 text-left transition',
                      'hover:bg-[#f2f6ff] dark:hover:bg-white/5',
                      selectedId === m._id && 'bg-[#e8f0fe] dark:bg-white/10'
                    )}
                  >
                    <div className='flex items-center justify-center'>
                      <CalendarClock className='h-4 w-4 text-slate-400' />
                    </div>

                    <div className='min-w-0'>
                      <div className='truncate text-sm font-semibold'>
                        To: {m.to_email}
                      </div>
                      <div className='truncate text-xs text-slate-600 dark:text-slate-300'>
                        <span className='font-medium'>
                          {m.subject || '(no subject)'}
                        </span>
                        <span className='mx-2 text-slate-400'>—</span>
                        {stripHtml(m.message)}
                      </div>
                    </div>

                    <div className='text-right text-xs text-slate-500 dark:text-slate-400'>
                      {formatDate(m.created_at)}
                    </div>
                  </button>
                ))}
              </div>
            )}
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
                variant='outline'
                size='sm'
                className='rounded-full'
                onClick={() => setSelectedId(null)}
              >
                ← Back
              </Button>
            </div>

            <h2 className='truncate text-base font-semibold'>
              {selected?.subject || 'Select an email'}
            </h2>

            {selected && (
              <div className='mt-1 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:gap-x-4'>
                <span>
                  <b>From:</b> {selected.from_email}
                </span>
                <span>
                  <b>To:</b> {selected.to_email}
                </span>
                <span className='hidden sm:inline'>
                  <b>Created:</b>{' '}
                  {new Date(selected.created_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className='p-4'>
            {!selected ? (
              <div className='grid place-items-center py-20 text-sm text-slate-500'>
                Choose a scheduled email to preview it here.
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 dark:border-white/10 dark:bg-white/5'>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: sanitizeEmailHtml(selected.message)
                    }}
                  />
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    variant='outline'
                    className='rounded-full'
                    onClick={() =>
                      toast.message('Cancel schedule (coming soon)')
                    }
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
                    Cancel Schedule
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
