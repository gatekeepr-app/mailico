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
import { PLAN_LIMITS, PlanType } from '@/lib/plans'
import { fetchRejectionReason } from '@/lib/rejection'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  XCircle
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
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
  has_sms_password?: boolean
  sms_user?: string | null
  sms_password?: string | null
  sms_sender_name?: string | null
  sms_sender_type?: string | null
}

type SenderIdentity = {
  _id: string
  user_id: string
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

type ResendStatusPayload = {
  domain?: {
    id: string
    name: string
    status: string
    capabilities?: { sending?: string; receiving?: string }
    records: DomainRecord[]
  } | null
  webhook?: {
    endpoint?: string
    status?: string
    secretSuffix?: string | null
    hasSecret?: boolean
  } | null
}

export default function ProfileEditClient() {
  const [loading, setLoading] = React.useState(true)
  const [savingBasics, setSavingBasics] = React.useState(false)

  const [profile, setProfile] = React.useState<ProfileRow | null>(null)
  const [senders, setSenders] = React.useState<SenderIdentity[]>([])
  const [resendStatus, setResendStatus] =
    React.useState<ResendStatusPayload | null>(null)
  const [statusLoading, setStatusLoading] = React.useState(false)
  const [statusError, setStatusError] = React.useState<string | null>(null)

  // form state
  const [name, setName] = React.useState('')
  const [domain, setDomain] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [country, setCountry] = React.useState('')
  const [avatar, setAvatar] = React.useState('')
  const [resendKey, setResendKey] = React.useState('')

  // new sender form
  const [newSenderName, setNewSenderName] = React.useState('')
  const [newSenderAlias, setNewSenderAlias] = React.useState('')
  const [selectedDomain, setSelectedDomain] = React.useState('')
  const [customDomain, setCustomDomain] = React.useState('')
  const [addingSender, setAddingSender] = React.useState(false)

  const router = useRouter()

  const domainOptions = React.useMemo(() => {
    const set = new Set<string>()
    if (profile?.domain) {
      set.add(profile.domain.trim().toLowerCase())
    }
    senders.forEach(sender => {
      const domainPart = sender.address.split('@')[1]?.toLowerCase()
      if (domainPart) {
        set.add(domainPart)
      }
    })
    return Array.from(set)
  }, [profile?.domain, senders])

  React.useEffect(() => {
    if (selectedDomain === 'custom') return
    if (selectedDomain && domainOptions.includes(selectedDomain)) return
    if (domainOptions.length > 0) {
      setSelectedDomain(domainOptions[0])
      return
    }
    if (!selectedDomain) {
      if (profile?.domain) {
        setSelectedDomain(profile.domain.trim().toLowerCase())
      } else {
        setSelectedDomain('custom')
      }
    }
  }, [domainOptions, profile?.domain, selectedDomain])

  React.useEffect(() => {
    if (selectedDomain !== 'custom') return
    if (customDomain) return
    if (profile?.domain) {
      setCustomDomain(profile.domain.trim().toLowerCase())
    }
  }, [customDomain, profile?.domain, selectedDomain])

  const profileRequirements = [
    { key: 'domain', label: 'Domain' },
    { key: 'phone', label: 'Phone number' },
    { key: 'country', label: 'Country' }
  ] as const

  const missingProfileFields = profileRequirements
    .filter(item => {
      const value = (profile as any)?.[item.key]
      if (typeof value !== 'string') return true
      return value.trim().length === 0
    })
    .map(item => item.label) as string[]

  const needsSenderIdentity = senders.length === 0
  const needsProfileSetup =
    !loading && (missingProfileFields.length > 0 || needsSenderIdentity)
  const onboardingChecklist = React.useMemo(() => {
    const items = [...missingProfileFields]
    if (needsSenderIdentity) {
      items.push('Add at least one sender identity')
    }
    return items
  }, [missingProfileFields, needsSenderIdentity])

  const isCustomDomain = selectedDomain === 'custom'
  const domainPreviewLabel =
    (isCustomDomain ? customDomain.trim() : selectedDomain).trim() ||
    'domain.com'
  const emailPreview = (newSenderAlias.trim() || 'name')
    .toLowerCase()
    .concat(`@${domainPreviewLabel}`)

  const load = React.useCallback(async () => {
    setLoading(true)
    setResendStatus(null)
    try {
      const res = await fetch('/api/profile', { cache: 'no-store' })
      if (res.status === 401) {
        window.location.href = '/auth?next=/profile'
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to load profile')
      }

      const payload = await res.json()
      const p = (payload?.profile ?? null) as ProfileRow | null
      const s = (payload?.senders ?? []) as SenderIdentity[]

      setProfile(p)
      setSenders(s)

      setName(p?.name ?? '')
      setDomain(p?.domain ?? '')
      setPhone(p?.phone ?? '')
      setCountry(p?.country ?? '')
      setAvatar(p?.avatar ?? '')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchResendStatus = React.useCallback(async () => {
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
        setStatusError(payload?.error || 'Unable to load Resend status')
        setResendStatus(null)
        return
      }

      const payload = (await res.json()) as ResendStatusPayload
      setResendStatus(payload)
      setStatusError(null)
    } catch (err: any) {
      setStatusError(err?.message || 'Unable to load Resend status')
    } finally {
      setStatusLoading(false)
    }
  }, [profile?.domain, profile?.has_resend_api_key])

  React.useEffect(() => {
    load()
  }, [load])

  React.useEffect(() => {
    if (!loading && profile?.domain && profile?.has_resend_api_key) {
      fetchResendStatus()
    }
  }, [loading, profile?.domain, profile?.has_resend_api_key, fetchResendStatus])

  const updateProfile = async (
    profilePatch: Record<string, any>,
    options?: { validateDomain?: boolean }
  ) => {
    if (!profile?.user_id) return false
    const userPlan = (profile?.plan_name || profile?.plan || 'free') as PlanType
    const limits = PLAN_LIMITS[userPlan]

    if (options?.validateDomain && typeof profilePatch.domain === 'string') {
      const trimmedDomain = profilePatch.domain.trim().toLowerCase()
      profilePatch.domain = trimmedDomain || null

      if (trimmedDomain && trimmedDomain !== profile.domain?.toLowerCase()) {
        const domainRes = await fetch(
          `/api/domains/count?domain=${encodeURIComponent(trimmedDomain)}`
        )

        if (!domainRes.ok) {
          throw new Error('Failed to validate domain usage')
        }

        const { count } = await domainRes.json()

        if ((count || 0) >= limits.maxTotalUsersForDomain) {
          const reason = await fetchRejectionReason()
          toast.error(
            `${reason} (The domain ${trimmedDomain} has reached the maximum of ${limits.maxTotalUsersForDomain} users allowed on the ${userPlan} plan.)`
          )
          return false
        }
      }
    }

    const updateRes = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: profilePatch
      })
    })

    const result = await updateRes.json().catch(() => ({}))
    if (!updateRes.ok) {
      throw new Error(result?.error || 'Failed to update profile')
    }

    toast.success('Profile updated')
    if (result?.warning) {
      toast.warning(result.warning)
    }

    await load()
    return true
  }

  const saveBasics = async () => {
    setSavingBasics(true)
    try {
      const saved = await updateProfile(
        {
          name: name.trim(),
          domain: domain.trim(),
          phone: phone.trim(),
          country: country.trim(),
          avatar: avatar.trim()
        },
        { validateDomain: true }
      )
      if (saved) {
        router.push('/profile')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update profile')
    } finally {
      setSavingBasics(false)
    }
  }

  const addSender = async () => {
    if (!profile?.user_id) return
    const userPlan = (profile?.plan_name || profile?.plan || 'free') as PlanType
    const limits = PLAN_LIMITS[userPlan]

    const trimmedName = newSenderName.trim()
    const aliasInput = newSenderAlias.trim().toLowerCase()
    const domainChoice =
      selectedDomain === 'custom'
        ? customDomain.trim().toLowerCase()
        : selectedDomain

    if (!trimmedName) {
      toast.error('Sender name is required')
      return
    }

    if (!aliasInput) {
      toast.error('Email subdomain is required')
      return
    }

    if (!domainChoice) {
      toast.error('Select or enter a domain before saving this sender')
      return
    }

    const allowedDomains = new Set(
      [profile?.domain?.trim().toLowerCase(), ...domainOptions].filter(Boolean)
    )

    if (allowedDomains.size > 0 && !allowedDomains.has(domainChoice)) {
      const reason = await fetchRejectionReason()
      toast.error(
        `${reason} (Add ${domainChoice} to your profile before assigning senders.)`
      )
      return
    }

    const aliasRule = /^[a-z0-9._%+-]+$/i
    if (!aliasRule.test(aliasInput)) {
      toast.error('Subdomain can include letters, numbers, and ._%+- only')
      return
    }

    const finalAddress = `${aliasInput}@${domainChoice}`
    const existingInDomain = senders.filter(s => {
      const sDomain = s.address.split('@')[1]?.toLowerCase()
      return sDomain === domainChoice
    })
    if (existingInDomain.length >= limits.emailsPerDomain) {
      const reason = await fetchRejectionReason()
      toast.error(
        `${reason} (Your ${userPlan} plan allows only ${limits.emailsPerDomain} email(s) for the domain ${domainChoice}.)`
      )
      return
    }

    setAddingSender(true)
    try {
      const res = await fetch('/api/senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          address: finalAddress
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to add sender')
      }
      toast.success('Sender added')
      setNewSenderName('')
      setNewSenderAlias('')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add sender')
    } finally {
      setAddingSender(false)
    }
  }

  const deleteSender = async (id: string) => {
    try {
      const res = await fetch(`/api/senders/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to delete sender')
      }
      toast.success('Sender removed')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete sender')
    }
  }

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore logout errors, still redirect
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
        {needsProfileSetup && onboardingChecklist.length > 0 && (
          <div className='mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'>
            <div className='flex items-center gap-2 font-semibold'>
              <AlertTriangle className='h-4 w-4' />
              Finish setting up your profile
            </div>
            <p className='mt-2 text-xs text-amber-900/80 dark:text-amber-100/80'>
              Please complete these details so we can tailor your workspace.
            </p>
            <ul className='mt-2 list-disc space-y-1 pl-5 text-xs'>
              {onboardingChecklist.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {/* Header */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          {/* Title */}
          <div className='min-w-0'>
            <h1 className='truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl'>
              Profile
            </h1>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
              Manage your account details and sender identities.
            </p>
          </div>

          {/* Actions */}
          <div className='flex w-full gap-2 sm:w-auto sm:justify-end'>
            <Button
              variant='outline'
              className='h-10 flex-1 rounded-full sm:flex-none'
              onClick={signOut}
            >
              <LogOut className='mr-2 h-4 w-4' />
              Sign out
            </Button>
          </div>
        </div>

        {/* Content grid */}
        <div className='mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]'>
          <div className='space-y-4'>
            {/* Left: Profile info */}
            <section className='hidden'>
              <div className='flex items-center gap-3'>
                <div className='h-14 w-14 overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/10'>
                  <Image
                    src={avatar || 'https://i.pravatar.cc/150?img=12'}
                    alt='Avatar'
                    width={96}
                    height={96}
                    className='h-full w-full object-cover'
                  />
                </div>
                <div>
                  <div className='text-sm font-semibold text-slate-900 dark:text-white'>
                    {profile?.email}
                  </div>
                  <div className='text-xs text-slate-500 dark:text-slate-400'>
                    User ID: {profile?.user_id?.slice(0, 8)}…
                  </div>
                </div>
              </div>

              <div className='mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <Field label='Name'>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className='h-11 rounded-xl'
                  />
                </Field>

                <Field label='Domain'>
                  <Input
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    placeholder='gatekeepr.live'
                    className='h-11 rounded-xl'
                  />
                </Field>

                <Field label='Phone'>
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder='+880...'
                    className='h-11 rounded-xl'
                  />
                </Field>

                <Field label='Country'>
                  <Input
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder='Bangladesh'
                    className='h-11 rounded-xl'
                  />
                </Field>

                <div className='sm:col-span-2'>
                  <Field label='Avatar URL'>
                    <Input
                      value={avatar}
                      onChange={e => setAvatar(e.target.value)}
                      placeholder='https://...'
                      className='h-11 rounded-xl'
                    />
                  </Field>
                </div>
              </div>

              <div className='mt-6 flex items-center justify-end'>
                <Button
                  className='h-11 rounded-full sm:px-6'
                  onClick={saveBasics}
                  disabled={savingBasics}
                >
                  {savingBasics ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Saving…
                    </>
                  ) : (
                    'Save basics'
                  )}
                </Button>
              </div>
            </section>

            <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'>
              <h2 className='text-base font-semibold text-slate-900 dark:text-white'>
                Credentials
              </h2>
              <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
                Email and SMS credentials are managed separately in the
                credentials workspace.
              </p>
            </section>

            {/* Domain & Resend status */}
            <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <h2 className='text-base font-semibold text-slate-900 dark:text-white'>
                    Domain &amp; Resend setup
                  </h2>
                  <p className='text-xs text-slate-500 dark:text-slate-400'>
                    Configure DNS and inbound webhooks for{' '}
                    {profile?.domain || 'your domain'}.
                  </p>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-full'
                  onClick={fetchResendStatus}
                  disabled={
                    statusLoading ||
                    !profile?.domain ||
                    !profile?.has_resend_api_key
                  }
                >
                  {statusLoading ? (
                    <>
                      <Loader2 className='mr-2 h-3.5 w-3.5 animate-spin' />
                      Refreshing…
                    </>
                  ) : (
                    'Refresh'
                  )}
                </Button>
              </div>

              {!profile?.domain || !profile?.has_resend_api_key ? (
                <div className='mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300'>
                  Add your domain and Resend API key above, then save to see DNS
                  instructions.
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
                      <div className='mt-3 space-y-3'>
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
                            <div className='mt-1 font-semibold text-slate-900 dark:text-white'>
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
                      Waiting for DNS instructions…
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

          {/* Right: Sender identities */}
          <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'>
            <h2 className='text-base font-semibold text-slate-900 dark:text-white'>
              Sender identities
            </h2>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
              These are the “From” options in your composer.
            </p>

            {/* Add sender */}
            <div className='mt-4 grid gap-3'>
              <div className='grid gap-2'>
                <Label className='text-xs'>Sender name</Label>
                <Input
                  value={newSenderName}
                  onChange={e => setNewSenderName(e.target.value)}
                  placeholder='Mohsin from Gatekeepr'
                  className='h-11 rounded-xl'
                />
              </div>
              <div className='grid gap-2'>
                <Label className='text-xs'>Email subdomain</Label>
                <Input
                  value={newSenderAlias}
                  onChange={e => setNewSenderAlias(e.target.value)}
                  placeholder='onboarding'
                  className='h-11 rounded-xl'
                />
                <p className='text-xs text-slate-500 dark:text-slate-400'>
                  We’ll append your domain automatically.
                </p>
              </div>
              <div className='grid gap-2'>
                <Label className='text-xs'>Domain</Label>
                <Select
                  value={selectedDomain}
                  onValueChange={setSelectedDomain}
                >
                  <SelectTrigger className='h-11 rounded-xl border-slate-200 bg-white text-left dark:border-white/10 dark:bg-white/5'>
                    <SelectValue placeholder='Choose a domain' />
                  </SelectTrigger>
                  <SelectContent>
                    {domainOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    <SelectItem value='custom'>Custom domain…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isCustomDomain && (
                <div className='grid gap-2'>
                  <Label className='text-xs'>Custom domain</Label>
                  <Input
                    value={customDomain}
                    onChange={e => setCustomDomain(e.target.value)}
                    placeholder='gatekeepr.live'
                    className='h-11 rounded-xl'
                  />
                </div>
              )}
              <div className='rounded-xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300'>
                Preview: {emailPreview}
              </div>
              <Button
                className='rounded-full'
                onClick={addSender}
                disabled={addingSender}
              >
                {addingSender ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Saving…
                  </>
                ) : (
                  <>
                    <Plus className='mr-2 h-4 w-4' />
                    Save sender identity
                  </>
                )}
              </Button>
              <p className='text-xs text-slate-500 dark:text-slate-400'>
                Sender identities are saved separately from your profile info.
              </p>
            </div>

            {/* Sender list */}
            <div className='mt-5 space-y-2'>
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

                    <Button
                      variant='outline'
                      className='rounded-full'
                      onClick={() => deleteSender(s._id)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
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

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className='grid gap-2'>
      <Label className='text-sm'>{label}</Label>
      {children}
    </div>
  )
}
