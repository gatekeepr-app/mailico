'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

type ProfileRow = {
  sms_user?: string | null
  sms_password?: string | null
  sms_sender_name?: string | null
  sms_sender_type?: string | null
  resend_api_key?: string | null
  has_resend_api_key?: boolean
  has_sms_password?: boolean
}

export default function CredentialsClient() {
  const [loading, setLoading] = React.useState(true)
  const [savingResend, setSavingResend] = React.useState(false)
  const [savingSms, setSavingSms] = React.useState(false)
  const [resendKey, setResendKey] = React.useState('')
  const [smsUser, setSmsUser] = React.useState('')
  const [smsPassword, setSmsPassword] = React.useState('')
  const [smsSenderName, setSmsSenderName] = React.useState('')
  const [smsSenderType, setSmsSenderType] = React.useState('non-masking')
  const [smsBalance, setSmsBalance] = React.useState<string | null>(null)
  const [smsBalanceLoading, setSmsBalanceLoading] = React.useState(false)
  const [smsBalanceError, setSmsBalanceError] = React.useState<string | null>(
    null
  )
  const [hasResendKey, setHasResendKey] = React.useState(false)
  const [hasSmsPassword, setHasSmsPassword] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile', { cache: 'no-store' })
      if (res.status === 401) {
        window.location.href = '/auth?next=/credentials'
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to load credentials')
      }
      const payload = await res.json()
      const p = (payload?.profile ?? {}) as ProfileRow
      setResendKey('')
      setSmsUser(p?.sms_user ?? '')
      setSmsPassword('')
      setSmsSenderName(p?.sms_sender_name ?? '')
      setSmsSenderType(p?.sms_sender_type ?? 'non-masking')
      setHasResendKey(Boolean(p?.has_resend_api_key))
      setHasSmsPassword(Boolean(p?.has_sms_password))
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load credentials')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const updateProfile = async (
    profilePatch: Record<string, any>,
    successMessage: string
  ) => {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: profilePatch })
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(result?.error || 'Failed to update credentials')
    }
    toast.success(successMessage)
    await load()
  }

  const saveResend = async () => {
    setSavingResend(true)
    try {
      await updateProfile(
        {
          resend_api_key: resendKey.trim() || null
        },
        'Resend credentials updated'
      )
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update Resend credentials')
    } finally {
      setSavingResend(false)
    }
  }

  const saveSms = async () => {
    setSavingSms(true)
    try {
      const profilePatch: Record<string, any> = {
        sms_user: smsUser.trim() || null,
        sms_sender_name: smsSenderName.trim() || null,
        sms_sender_type: smsSenderType
      }
      const normalizedPassword = smsPassword.trim()
      if (normalizedPassword) {
        profilePatch.sms_password = normalizedPassword
      }
      await updateProfile(profilePatch, 'SMS credentials updated')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update SMS credentials')
    } finally {
      setSavingSms(false)
    }
  }

  const fetchSmsBalance = async () => {
    setSmsBalanceLoading(true)
    setSmsBalanceError(null)
    try {
      const res = await fetch('/api/sms/balance', { cache: 'no-store' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || 'Unable to fetch SMS balance')
      }
      setSmsBalance(payload?.balance ?? payload?.provider ?? null)
    } catch (error: any) {
      setSmsBalanceError(error?.message || 'Unable to fetch SMS balance')
      setSmsBalance(null)
    } finally {
      setSmsBalanceLoading(false)
    }
  }

  if (loading) {
    return (
      <div className='flex min-h-[50vh] items-center justify-center'>
        <div className='flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Loading credentials…
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'>
        <h2 className='text-base font-semibold text-slate-900 dark:text-white'>
          Resend credentials
        </h2>
        <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
          Sync domains and send email from your Resend account.
        </p>

        <div className='mt-4 grid gap-3'>
          <div className='grid gap-2'>
            <Label className='text-xs'>Resend API Key</Label>
            <Input
              value={resendKey}
              onChange={e => setResendKey(e.target.value)}
              placeholder={hasResendKey ? 'Saved — enter to update' : 're_...'}
              className='h-11 rounded-xl'
            />
          </div>
        </div>

        <div className='mt-4 flex items-center justify-end'>
          <Button
            className='h-11 rounded-full sm:px-6'
            onClick={saveResend}
            disabled={savingResend}
          >
            {savingResend ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Saving…
              </>
            ) : (
              'Save Resend'
            )}
          </Button>
        </div>
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'>
        <h2 className='text-base font-semibold text-slate-900 dark:text-white'>
          SMS Bangladesh credentials
        </h2>
        <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
          Store per-user credentials before sending SMS.
        </p>

        <div className='mt-4 grid gap-4'>
          <div className='rounded-xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5'>
            <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400'>
              Step 1 · Credentials
            </div>
            <div className='mt-3 grid gap-3 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label className='text-xs'>SMS Bangladesh User</Label>
                <Input
                  value={smsUser}
                  onChange={e => setSmsUser(e.target.value)}
                  placeholder='user@example.com'
                  className='h-11 rounded-xl'
                />
              </div>
              <div className='grid gap-2'>
                <Label className='text-xs'>SMS Bangladesh Password</Label>
                <Input
                  value={smsPassword}
                  onChange={e => setSmsPassword(e.target.value)}
                  placeholder={
                    hasSmsPassword ? 'Saved — enter to update' : '••••••••'
                  }
                  type='password'
                  className='h-11 rounded-xl'
                />
              </div>
            </div>
          </div>

          <div className='rounded-xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5'>
            <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400'>
              Step 2 · Sender identity
            </div>
            <div className='mt-3 grid gap-3 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label className='text-xs'>SMS Sender Type</Label>
                <Select value={smsSenderType} onValueChange={setSmsSenderType}>
                  <SelectTrigger className='h-11 rounded-xl border-slate-200 bg-white text-left dark:border-white/10 dark:bg-white/5'>
                    <SelectValue placeholder='Choose sender type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='non-masking'>Non-masking</SelectItem>
                    <SelectItem value='masking'>Masking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label className='text-xs'>Masking sender name</Label>
                <Input
                  value={smsSenderName}
                  onChange={e => setSmsSenderName(e.target.value)}
                  placeholder='YourBrand'
                  className='h-11 rounded-xl'
                />
              </div>
            </div>
          </div>

          <div className='rounded-xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5'>
            <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400'>
              Step 3 · Credits
            </div>
            <div className='mt-3 flex flex-wrap items-center justify-between gap-3'>
              <div>
                <div className='text-xs text-slate-500 dark:text-slate-400'>
                  Balance
                </div>
                <div className='mt-1 text-lg font-semibold text-slate-900 dark:text-white'>
                  {smsBalanceLoading
                    ? 'Loading…'
                    : smsBalanceError
                      ? 'Unavailable'
                      : (smsBalance ?? '—')}
                </div>
                {smsBalanceError ? (
                  <div className='mt-1 text-xs text-rose-600 dark:text-rose-300'>
                    {smsBalanceError}
                  </div>
                ) : null}
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='rounded-full'
                  onClick={fetchSmsBalance}
                  disabled={smsBalanceLoading}
                >
                  {smsBalanceLoading ? 'Checking…' : 'Check balance'}
                </Button>
                <Button type='button' asChild className='rounded-full'>
                  <a
                    href='https://panel.smsbangladesh.com/'
                    target='_blank'
                    rel='noreferrer'
                  >
                    Add credits
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className='mt-4 flex items-center justify-end'>
          <Button
            className='h-11 rounded-full sm:px-6'
            onClick={saveSms}
            disabled={savingSms}
          >
            {savingSms ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Saving…
              </>
            ) : (
              'Save SMS settings'
            )}
          </Button>
        </div>
      </section>
    </div>
  )
}
