import { NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'
import { decryptSecret } from '@/lib/secrets'
import { assertSameOrigin } from '@/lib/security/csrf'
import { getClientIp, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

type SmsMode = 'masking' | 'non-masking'
type SmsPurpose = 'standard' | 'otp'

function normalizeNumbers(input: string) {
  return input
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
}

function buildSmsParams(params: {
  user: string
  password: string
  to: string[]
  text: string
  mode: SmsMode
  from?: string
}) {
  const search = new URLSearchParams()
  search.set('user', params.user)
  search.set('password', params.password)
  if (params.mode === 'masking' && params.from) {
    search.set('from', params.from)
  }
  search.set('to', params.to.join(','))
  search.set('text', params.text)
  return search
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request)
  if (originError) {
    return NextResponse.json({ error: originError.error }, { status: 403 })
  }

  let identity
  try {
    identity = await requireIdentity()
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unauthorized' },
      { status: 401 }
    )
  }

  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const ip = getClientIp(request)
  const rateLimitResult = rateLimit(`send:sms:${identity.userId}:${ip}`, {
    windowMs: 60_000,
    limit: 30
  })

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many SMS attempts. Try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            (rateLimitResult.resetAt - Date.now()) / 1000
          ).toString()
        }
      }
    )
  }

  const toInput = typeof payload.to === 'string' ? payload.to : ''
  const text = typeof payload.text === 'string' ? payload.text.trim() : ''
  const purpose =
    payload.purpose === 'otp' || payload.purpose === 'standard'
      ? (payload.purpose as SmsPurpose)
      : 'standard'
  const mode =
    payload.mode === 'masking' || payload.mode === 'non-masking'
      ? (payload.mode as SmsMode)
      : 'non-masking'

  const to = normalizeNumbers(toInput)

  if (to.length === 0 || !text) {
    return NextResponse.json(
      { error: 'Recipient and message are required' },
      { status: 400 }
    )
  }

  const convex = createConvexServerClient()
  const profile = await convex.query(api.profiles.getByUserId, {
    userId: identity.userId,
    sessionToken: identity.token
  })

  const user = profile?.sms_user?.trim()
  const password = profile?.sms_password
    ? (decryptSecret(profile.sms_password) as string)
    : undefined
  const balanceCheckedAt = profile?.sms_balance_checked_at
  const credsUpdatedAt = profile?.sms_creds_updated_at

  if (!user || !password) {
    return NextResponse.json(
      { error: 'SMS credentials are not configured for this user' },
      { status: 400 }
    )
  }

  if (!balanceCheckedAt) {
    return NextResponse.json(
      { error: 'Check SMS balance before sending your first message.' },
      { status: 400 }
    )
  }

  if (credsUpdatedAt) {
    const credsTime = new Date(credsUpdatedAt).getTime()
    const balanceTime = new Date(balanceCheckedAt).getTime()
    if (!Number.isNaN(credsTime) && !Number.isNaN(balanceTime)) {
      if (balanceTime < credsTime) {
        return NextResponse.json(
          {
            error:
              'SMS credentials changed. Please re-check balance before sending.'
          },
          { status: 400 }
        )
      }
    }
  }

  const senderNameRaw =
    typeof payload.from === 'string'
      ? payload.from.trim()
      : (profile?.sms_sender_name ?? '')
  const senderName = senderNameRaw.trim()

  if (mode === 'masking' && !senderName) {
    return NextResponse.json(
      { error: 'Masking sender name is required' },
      { status: 400 }
    )
  }

  const baseUrl =
    purpose === 'otp'
      ? 'https://panel.smsbangladesh.com/otp'
      : 'https://panel.smsbangladesh.com/api'

  const params = buildSmsParams({
    user,
    password,
    to,
    text,
    mode,
    from: senderName
  })

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
    const resultText = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { error: 'SMS provider error', details: resultText },
        { status: 502 }
      )
    }

    await convex.mutation(api.sms.create, {
      user_id: identity.userId,
      sessionToken: identity.token,
      direction: 'outbound',
      to: to.join(', '),
      text,
      mode,
      purpose,
      status: 'sent',
      provider_response: resultText,
      created_at: new Date().toISOString()
    })

    return NextResponse.json({ ok: true, provider: resultText })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to send SMS' },
      { status: 500 }
    )
  }
}
