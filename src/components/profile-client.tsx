'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, LogOut, Pencil, XCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import * as React from 'react'
import { toast } from 'sonner'

type ProfileRow = {
  user_id: string
  name: string | null
  email: string | null
  domain: string | null
  phone: string | null
  country: string | null
  avatar: string | null
  plan?: string | null
  plan_name?: string | null
  resend_api_key?: string | null
  has_resend_api_key?: boolean
}

type SenderIdentity = {
  _id: string
  name: string
  address: string
  verified: boolean
}

type DomainRecord = {
  record: string
  name: string
  value: string
  type: string
  status?: string
  priority?: number
}

type ResendDomainStatus = {
  id: string
  name: string
  status: string
  region?: string
  capabilities?: {
    sending?: string
    receiving?: string
  }
  records: DomainRecord[]
}

type ResendWebhookStatus = {
  endpoint?: string
  status?: string
  secretSuffix?: string | null
  hasSecret?: boolean
}

type ResendStatusPayload = {
  domain?: ResendDomainStatus | null
  webhook?: ResendWebhookStatus | null
}

export default function ProfileViewClient() {
  const [loading, setLoading] = React.useState(true)
  const [profile, setProfile] = React.useState<ProfileRow | null>(null)
  const [senders, setSenders] = React.useState<SenderIdentity[]>([])
  const [resendStatus, setResendStatus] =
    React.useState<ResendStatusPayload | null>(null)
  const [statusLoading, setStatusLoading] = React.useState(false)
  const [statusError, setStatusError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile', { cache: 'no-store' })
      if (res.status === 401) {
        window.location.href = '/auth?next=/profile'
        return
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to load profile')
      }

      const payload = await res.json()
      const nextProfile = (payload?.profile ?? null) as ProfileRow | null
      const nextSenders = (payload?.senders ?? []) as SenderIdentity[]
      setProfile(nextProfile)
      setSenders(nextSenders)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadResendStatus = React.useCallback(async () => {
    if (!profile?.domain || !profile?.has_resend_api_key) {
      setResendStatus(null)
      setStatusError(null)
      return
    }

    setStatusLoading(true)
    try {
      const res = await fetch('/api/domains/status', { cache: 'no-store' })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        setStatusError(payload?.error || 'Unable to load domain status')
        setResendStatus(null)
        return
      }

      const payload = (await res.json()) as ResendStatusPayload
      setResendStatus(payload)
      setStatusError(null)
    } catch (err: any) {
      setStatusError(err?.message || 'Unable to load domain status')
    } finally {
      setStatusLoading(false)
    }
  }, [profile?.domain, profile?.has_resend_api_key])

  React.useEffect(() => {
    load()
  }, [load])

  React.useEffect(() => {
    if (!loading && profile?.domain && profile?.has_resend_api_key) {
      loadResendStatus()
    }
  }, [loading, profile?.domain, profile?.has_resend_api_key, loadResendStatus])

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore errors
    }
    window.location.href = '/auth'
  }

  if (loading) {
    return (
      <div className='flex min-h-[70vh] items-center justify-center'>
        <div className='flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Loading profile…
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background text-foreground transition-colors'>
      <div className='mx-auto max-w-[1100px] px-4 py-10'>
        {/* Header */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='min-w-0'>
            <h1 className='truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl'>
              Profile
            </h1>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
              View your account info and sender identities.
            </p>
          </div>

          <div className='flex w-full gap-2 sm:w-auto sm:justify-end'>
            <Button
              variant='outline'
              className='h-10 flex-1 rounded-full sm:flex-none'
              onClick={signOut}
            >
              <LogOut className='mr-2 h-4 w-4' />
              Sign out
            </Button>
            <Link href='/profile/edit' className='flex-1 sm:flex-none'>
              <Button className='h-10 w-full rounded-full'>
                <Pencil className='mr-2 h-4 w-4' />
                Edit profile
              </Button>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className='mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]'>
          <div className='space-y-4'>
            {/* Profile card */}
            <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'>
              <div className='flex items-center gap-3'>
                <div className='h-14 w-14 overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/10'>
                  <Image
                    src={profile?.avatar || 'https://i.pravatar.cc/150?img=12'}
                    alt='Avatar'
                    width={96}
                    height={96}
                    className='h-full w-full object-cover'
                  />
                </div>
                <div className='min-w-0'>
                  <div className='truncate text-sm font-semibold text-slate-900 dark:text-white'>
                    {profile?.name || '—'}
                  </div>
                  <div className='truncate text-xs text-slate-500 dark:text-slate-400'>
                    {profile?.email || '—'}
                  </div>
                </div>
              </div>

              <div className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <Info
                  label='Plan'
                  value={
                    (
                      profile?.plan_name ||
                      profile?.plan ||
                      'free'
                    )?.toUpperCase?.() || 'FREE'
                  }
                />
                <div className='flex items-end pb-1'>
                  <Link
                    href='/pricing'
                    className='text-xs font-medium text-emerald-600 hover:underline'
                  >
                    Upgrade Plan →
                  </Link>
                </div>
                <Info label='Domain' value={profile?.domain} />
                <Info label='Phone' value={profile?.phone} />
                <Info label='Country' value={profile?.country} />
                <Info label='User ID' value={profile?.user_id} mono />
              </div>
            </section>

            {/* Domain & Resend status */}
            <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <h2 className='text-base font-semibold text-slate-900 dark:text-white'>
                    Domain &amp; Resend
                  </h2>
                  <p className='text-xs text-slate-500 dark:text-slate-400'>
                    Track DNS setup and inbound webhook health.
                  </p>
                </div>
                {profile?.domain && profile?.has_resend_api_key && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='rounded-full'
                    onClick={loadResendStatus}
                    disabled={statusLoading}
                  >
                    {statusLoading ? (
                      <>
                        <Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
                        Refreshing…
                      </>
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                )}
              </div>

              {!profile?.domain || !profile?.has_resend_api_key ? (
                <div className='mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300'>
                  Add your domain and Resend API key on the Edit Profile page to
                  enable sending and receiving email.
                </div>
              ) : statusLoading ? (
                <div className='mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Checking Resend status…
                </div>
              ) : statusError ? (
                <div className='mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100'>
                  {statusError}
                </div>
              ) : resendStatus?.domain ? (
                <div className='mt-4 space-y-4'>
                  <div className='rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='font-semibold text-slate-900 dark:text-white'>
                          {resendStatus.domain.name}
                        </div>
                        <div className='text-xs text-slate-500 dark:text-slate-400'>
                          Sending:{' '}
                          {resendStatus.domain.capabilities?.sending ??
                            'unknown'}{' '}
                          • Receiving:{' '}
                          {resendStatus.domain.capabilities?.receiving ??
                            'unknown'}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          resendStatus.domain.status === 'verified'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-200'
                        }`}
                      >
                        {resendStatus.domain.status}
                      </span>
                    </div>
                  </div>

                  <div className='rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-white/10'>
                    <div className='font-semibold text-slate-900 dark:text-white'>
                      Inbound webhook
                    </div>
                    <div className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
                      Endpoint: {resendStatus.webhook?.endpoint || '—'}
                    </div>
                    <div className='mt-2 flex flex-wrap items-center gap-2 text-xs'>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                          resendStatus.webhook?.status === 'enabled'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-200'
                        }`}
                      >
                        {resendStatus.webhook?.status || 'pending'}
                      </span>
                      {resendStatus.webhook?.secretSuffix && (
                        <span className='text-slate-500 dark:text-slate-400'>
                          Secret • • • {resendStatus.webhook.secretSuffix}
                        </span>
                      )}
                    </div>
                  </div>

                  {resendStatus.domain.records?.length ? (
                    <div className='rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10'>
                      <div className='text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'>
                        DNS Records
                      </div>
                      <div className='mt-2 space-y-3'>
                        {resendStatus.domain.records.map(record => (
                          <div
                            key={`${record.record}-${record.name}-${record.type}`}
                            className='rounded-lg border border-slate-100 p-2 dark:border-white/10'
                          >
                            <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400'>
                              <span>{record.record}</span>
                              <span>{record.type}</span>
                              <span className='text-emerald-500'>
                                {record.status}
                              </span>
                            </div>
                            <div className='mt-1 font-medium text-slate-900 dark:text-white'>
                              {record.name}
                            </div>
                            <div className='break-all text-[11px] text-slate-500 dark:text-slate-400'>
                              {record.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className='rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400'>
                      Waiting for DNS instructions from Resend…
                    </div>
                  )}
                </div>
              ) : (
                <div className='mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300'>
                  Domain status unavailable. Try refreshing.
                </div>
              )}
            </section>
          </div>

          {/* Senders list */}
          <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'>
            <h2 className='text-base font-semibold text-slate-900 dark:text-white'>
              Sender identities
            </h2>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
              These appear as “From” options.
            </p>

            <div className='mt-4 space-y-2'>
              {senders.length === 0 ? (
                <div className='rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300'>
                  No sender identities yet.
                </div>
              ) : (
                senders.map(s => (
                  <div
                    key={s._id}
                    className='flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5'
                  >
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2'>
                        <div className='truncate text-sm font-semibold text-slate-900 dark:text-white'>
                          {s.name}
                        </div>
                        {s.verified ? (
                          <span className='inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300'>
                            <CheckCircle2 className='h-3.5 w-3.5' />
                            Verified
                          </span>
                        ) : (
                          <span className='inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] text-slate-600 dark:text-slate-300'>
                            <XCircle className='h-3.5 w-3.5' />
                            Unverified
                          </span>
                        )}
                      </div>
                      <div className='truncate text-xs text-slate-600 dark:text-slate-300'>
                        {s.address}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          <div className='h-14' />
        </div>
      </div>
    </div>
  )
}

function Info({
  label,
  value,
  mono
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div className='rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5'>
      <div className='text-xs text-slate-500 dark:text-slate-400'>{label}</div>
      <div
        className={`mt-1 text-sm font-semibold text-slate-900 dark:text-white ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value || '—'}
      </div>
    </div>
  )
}
