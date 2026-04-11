'use client'

import { Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn, signUp } from '@/lib/auth-api'

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

function getSafeNextPath(value: string | null) {
  if (!value) return '/profile'
  if (!value.startsWith('/')) return '/profile'
  if (value.startsWith('//')) return '/profile'
  return value
}

export default function AuthPage() {
  const router = useRouter()

  const params = useSearchParams()
  const nextPath = getSafeNextPath(params.get('next'))
  const initialMode = params.get('mode') === 'signup' ? 'signup' : 'signin'

  const [mode, setMode] = React.useState<'signin' | 'signup'>(initialMode)
  const [loading, setLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [avatarUrl, setAvatarUrl] = React.useState('')

  React.useEffect(() => {
    let active = true
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' })
        if (!res.ok) return
        const payload = await res.json()
        if (active && payload?.user) {
          router.replace(nextPath)
        }
      } catch {
        // ignore session fetch errors
      }
    }
    checkSession()
    return () => {
      active = false
    }
  }, [nextPath, router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Please fill in email and password.')
      return
    }
    if (mode === 'signup') {
      if (!name.trim()) {
        toast.error('Please enter your name.')
        return
      }
      if (!PASSWORD_RULE.test(password)) {
        toast.error(
          'Password must be 8+ chars with upper, lower, number, and special character.'
        )
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp(
          name.trim(),
          email.trim().toLowerCase(),
          password,
          avatarUrl.trim() || undefined
        )
        toast.success('Account created. You are now signed in.')
      } else {
        await signIn(email.trim().toLowerCase(), password)
        toast.success('Signed in!')
      }
      router.replace(nextPath)
      router.refresh()
    } catch (err: any) {
      toast.error(getAuthErrorMessage(err, mode))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='min-h-screen bg-background px-4 py-10 text-foreground transition-colors'>
      <div className='mx-auto grid w-full max-w-[1040px] gap-6 md:grid-cols-2'>
        <div className='hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:block md:p-8'>
          <div className='flex items-center gap-3'>
            <div className='grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f0fe] dark:bg-white/10'>
              <Mail className='h-5 w-5' />
            </div>
            <div>
              <h1 className='text-xl font-semibold tracking-tight'>Mailico</h1>
              <p className='text-sm text-slate-600 dark:text-slate-300'>
                Email campaigns + transactional sends.
              </p>
            </div>
          </div>

          <div className='mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300'>
            <div className='rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5'>
              <div className='font-medium text-slate-900 dark:text-white'>
                One dashboard
              </div>
              <div className='mt-1'>
                Manage campaigns, automations, and transactional events in one
                place.
              </div>
            </div>

            <div className='rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5'>
              <div className='font-medium text-slate-900 dark:text-white'>
                BYO Resend key
              </div>
              <div className='mt-1'>
                Store your API key securely and send on your behalf—server-only.
              </div>
            </div>

            <div className='rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5'>
              <div className='font-medium text-slate-900 dark:text-white'>
                Clean & fast UI
              </div>
              <div className='mt-1'>
                Gmail-inspired layout that stays responsive on mobile.
              </div>
            </div>
          </div>
        </div>

        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8'>
          <div className='flex flex-col items-center justify-between'>
            <div className='flex rounded-full border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5'>
              <button
                type='button'
                onClick={() => setMode('signin')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition',
                  mode === 'signin'
                    ? 'bg-[#e8f0fe] text-slate-900 dark:bg-white/10 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                )}
              >
                Sign in
              </button>
              <button
                type='button'
                onClick={() => setMode('signup')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition',
                  mode === 'signup'
                    ? 'bg-[#e8f0fe] text-slate-900 dark:bg-white/10 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                )}
              >
                Sign up
              </button>
            </div>
            <div className='w-full pt-6'>
              <h2 className='text-lg font-semibold'>
                {mode === 'signin' ? 'Sign in' : 'Create an account'}
              </h2>
              <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
                {mode === 'signin'
                  ? 'Welcome back — let’s send emails.'
                  : 'Start sending email the sane way.'}
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className='mt-6 space-y-4'>
            {mode === 'signup' && (
              <div className='space-y-2'>
                <Label htmlFor='name'>Name</Label>
                <div className='relative'>
                  <User className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  <Input
                    id='name'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder='Your name'
                    className='h-11 rounded-xl pl-9'
                    autoComplete='name'
                  />
                </div>
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <div className='relative'>
                <Mail className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <Input
                  id='email'
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder='you@company.com'
                  className='h-11 rounded-xl pl-9'
                  autoComplete='email'
                  required
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <Input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder='••••••••'
                  className='h-11 rounded-xl pl-9 pr-11'
                  autoComplete={
                    mode === 'signin' ? 'current-password' : 'new-password'
                  }
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(prev => !prev)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200'
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              </div>
              <div className='flex flex-col items-start justify-between'>
                <span className='text-xs text-slate-500 dark:text-slate-400'>
                  Must be 8+ chars, upper/lowercase, number, special char
                </span>
                {mode === 'signin' && (
                  <Link
                    href='/forgot'
                    className='text-right text-xs text-slate-700 underline-offset-4 hover:underline dark:text-slate-200'
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
            </div>

            {mode === 'signup' && (
              <div className='space-y-2'>
                <Label htmlFor='avatar'>Avatar URL (optional)</Label>
                <Input
                  id='avatar'
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder='https://…'
                  className='h-11 rounded-xl'
                  autoComplete='url'
                />
              </div>
            )}

            <Button
              type='submit'
              className='h-11 w-full rounded-xl'
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Please wait…
                </>
              ) : mode === 'signin' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </Button>

            <p className='pt-2 text-center text-xs text-slate-500 dark:text-slate-400'>
              By continuing you agree to our{' '}
              <span className='text-slate-700 dark:text-slate-200'>Terms</span>{' '}
              &{' '}
              <span className='text-slate-700 dark:text-slate-200'>
                Privacy
              </span>
              .
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}

function getAuthErrorMessage(error: unknown, mode: 'signin' | 'signup') {
  const message =
    typeof error === 'string' ? error : (error as { message?: string })?.message

  if (!message) {
    return mode === 'signup'
      ? 'Unable to create account. Please try again.'
      : 'Unable to sign in. Please try again.'
  }

  const normalized = message.toLowerCase()
  if (normalized.includes('invalid request origin')) {
    return 'This request was blocked by origin validation. Please refresh.'
  }
  if (normalized.includes('too many')) {
    return 'Too many attempts. Please wait a minute and try again.'
  }
  if (normalized.includes('email and password')) {
    return 'Please enter both email and password.'
  }
  if (normalized.includes('password must')) {
    return 'Password must be 8+ chars with upper/lowercase, number, and special character.'
  }

  return message
}
