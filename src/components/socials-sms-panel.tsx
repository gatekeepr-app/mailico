'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Loader2, Send } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

type SmsProfile = {
  sms_sender_name?: string | null
  sms_sender_type?: string | null
  sms_user?: string | null
  sms_password?: string | null
}

export default function SocialsSmsPanel() {
  const [loadingProfile, setLoadingProfile] = React.useState(true)
  const [sending, setSending] = React.useState(false)
  const [to, setTo] = React.useState('')
  const [text, setText] = React.useState('')
  const [mode, setMode] = React.useState<'masking' | 'non-masking'>(
    'non-masking'
  )
  const [purpose, setPurpose] = React.useState<'standard' | 'otp'>('standard')
  const [from, setFrom] = React.useState('')
  const [hasCreds, setHasCreds] = React.useState(false)
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [history, setHistory] = React.useState<
    Array<{
      _id: string
      to: string
      text: string
      status?: string
      created_at?: string
    }>
  >([])

  React.useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true)
      try {
        const res = await fetch('/api/profile', { cache: 'no-store' })
        if (!res.ok) return
        const payload = await res.json()
        const profile = (payload?.profile ?? {}) as SmsProfile
        const senderType =
          profile.sms_sender_type === 'masking' ? 'masking' : 'non-masking'
        setMode(senderType)
        if (profile.sms_sender_name) {
          setFrom(profile.sms_sender_name)
        }
        setHasCreds(Boolean(profile.sms_user && profile.sms_password))
      } catch {
        // ignore profile load errors
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [])

  React.useEffect(() => {
    if (!hasCreds) return
    const loadHistory = async () => {
      setHistoryLoading(true)
      try {
        const res = await fetch('/api/sms?direction=outbound&limit=5', {
          cache: 'no-store'
        })
        if (!res.ok) {
          setHistory([])
          return
        }
        const payload = await res.json()
        setHistory((payload?.messages ?? []) as any[])
      } catch {
        setHistory([])
      } finally {
        setHistoryLoading(false)
      }
    }

    loadHistory()
  }, [hasCreds])

  const submit = async () => {
    if (!to.trim() || !text.trim()) {
      toast.error('Recipient and message are required')
      return
    }

    if (mode === 'masking' && !from.trim()) {
      toast.error('Masking sender name is required')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          text: text.trim(),
          mode,
          purpose,
          from: from.trim() || undefined
        })
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to send SMS')
      }

      toast.success('SMS sent')
      setText('')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  if (!hasCreds && !loadingProfile) {
    return (
      <section className='rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70'>
        <div className='flex flex-col gap-3'>
          <div className='text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-300'>
            SMS Setup
          </div>
          <h2 className='text-xl font-semibold text-slate-900 dark:text-white'>
            Connect SMS Bangladesh to send texts
          </h2>
          <p className='text-sm'>
            Add your SMS credentials in the credentials workspace, then return
            here to start sending.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className='relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.18),transparent_45%)] opacity-80 dark:opacity-60' />
      <div className='relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
        <div className='space-y-4'>
          <div className='flex flex-wrap items-center gap-3'>
            <div className='rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200'>
              Inbox SMS
            </div>
            <div className='rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70'>
              Provider: SMS Bangladesh
            </div>
            {loadingProfile ? (
              <div className='text-[11px] text-slate-400'>
                Loading defaults…
              </div>
            ) : null}
          </div>

          <div>
            <h2 className='text-xl font-semibold tracking-tight text-slate-900 dark:text-white'>
              Send a text from Mailico
            </h2>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
              Reach customers fast without leaving your inbox. Use commas for
              multiple recipients and switch between standard or OTP delivery.
            </p>
          </div>

          <div className='grid gap-3'>
            <div className='grid gap-2'>
              <Label className='text-xs'>Recipients</Label>
              <Input
                value={to}
                onChange={event => setTo(event.target.value)}
                placeholder='88013XXXXXXXX, 88019XXXXXXXX'
                className='h-11 rounded-2xl border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/5'
              />
              <p className='text-xs text-slate-500 dark:text-slate-400'>
                Include country code. Example: 88013XXXXXXXX.
              </p>
            </div>

            <div className='grid gap-2'>
              <Label className='text-xs'>Message</Label>
              <Textarea
                value={text}
                onChange={event => setText(event.target.value)}
                placeholder='Type your message…'
                className='min-h-[110px] rounded-2xl border-slate-200 bg-white/80 text-sm dark:border-white/10 dark:bg-white/5'
              />
            </div>
          </div>
        </div>

        <div className='space-y-4'>
          <div className='rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/5'>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400'>
              Delivery Settings
            </p>

            <div className='mt-3 space-y-3'>
              <div>
                <Label className='text-xs'>Mode</Label>
                <div className='mt-2 grid grid-cols-2 gap-2'>
                  {(['non-masking', 'masking'] as const).map(option => (
                    <button
                      key={option}
                      type='button'
                      onClick={() => setMode(option)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-xs font-semibold transition',
                        mode === option
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white/70'
                      )}
                    >
                      {option === 'masking' ? 'Masking' : 'Non-masking'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className='text-xs'>Purpose</Label>
                <div className='mt-2 grid grid-cols-2 gap-2'>
                  {(['standard', 'otp'] as const).map(option => (
                    <button
                      key={option}
                      type='button'
                      onClick={() => setPurpose(option)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-xs font-semibold transition',
                        purpose === option
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:border-emerald-300/60 dark:bg-emerald-400/15 dark:text-emerald-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white/70'
                      )}
                    >
                      {option === 'otp' ? 'OTP' : 'Standard'}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'masking' && (
                <div>
                  <Label className='text-xs'>Masking sender name</Label>
                  <Input
                    value={from}
                    onChange={event => setFrom(event.target.value)}
                    placeholder='YourBrand'
                    className='mt-2 h-11 rounded-2xl border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/5'
                  />
                </div>
              )}
            </div>
          </div>

          <div className='flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 text-xs text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70'>
            <span>Two-way SMS enabled</span>
            <span>{mode === 'masking' ? 'Masked' : 'Direct'} delivery</span>
          </div>

          <Button
            onClick={submit}
            disabled={sending}
            className='h-12 w-full rounded-2xl text-sm font-semibold'
          >
            {sending ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Sending…
              </>
            ) : (
              <>
                <Send className='mr-2 h-4 w-4' />
                Send SMS
              </>
            )}
          </Button>

          <div className='rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-xs text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70'>
            <div className='flex items-center justify-between'>
              <span className='font-semibold'>Recent sends</span>
              <span>
                {historyLoading ? 'Loading…' : `${history.length} shown`}
              </span>
            </div>
            <div className='mt-3 space-y-2'>
              {historyLoading ? (
                <div className='text-xs text-slate-400'>
                  Fetching SMS history…
                </div>
              ) : history.length === 0 ? (
                <div className='text-xs text-slate-400'>No SMS sent yet.</div>
              ) : (
                history.map(item => (
                  <div
                    key={item._id}
                    className='rounded-xl border border-slate-200/70 bg-white/70 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70'
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <span className='font-semibold'>To: {item.to}</span>
                      <span className='text-[11px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300'>
                        {item.status ?? 'sent'}
                      </span>
                    </div>
                    <div className='mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400'>
                      {item.text}
                    </div>
                    {item.created_at ? (
                      <div className='mt-2 text-[10px] text-slate-400'>
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
