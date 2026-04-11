import { NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { identityRequest } from '@/lib/identity/request'
import { requireIdentity } from '@/lib/identity/server'
import { getResendStatus } from '@/lib/resend/integration'
import { decryptSecret, encryptSecret } from '@/lib/secrets'
import { assertSameOrigin } from '@/lib/security/csrf'
import { getClientIp, rateLimit } from '@/lib/security/rate-limit'

type CanonicalProfile = {
  user_id: string
  email: string | null
  name: string | null
  avatar: string | null
}

const canonicalFields: Array<keyof CanonicalProfile> = [
  'email',
  'name',
  'avatar'
]

function normalizeProfileValue(value?: string | null) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export const runtime = 'nodejs'

export async function GET() {
  let identity
  try {
    identity = await requireIdentity()
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unauthorized' },
      { status: 401 }
    )
  }

  const canonicalProfile: CanonicalProfile = {
    user_id: identity.userId,
    email: normalizeProfileValue(identity.user?.email) ?? null,
    name: normalizeProfileValue(identity.user?.name) ?? null,
    avatar: normalizeProfileValue(identity.user?.avatarUrl) ?? null
  }

  const canonicalProfilePayload = {
    email: canonicalProfile.email,
    name: canonicalProfile.name,
    avatar: canonicalProfile.avatar
  }

  const convex = createConvexServerClient()

  const [initialProfile, senders, usage] = await Promise.all([
    convex.query(api.profiles.getByUserId, {
      userId: identity.userId,
      sessionToken: identity.token
    }),
    convex.query(api.senderIdentities.listByUser, {
      userId: identity.userId,
      sessionToken: identity.token
    }),
    convex.query(api.usage.getByUserId, {
      userId: identity.userId,
      sessionToken: identity.token
    })
  ])

  let profile = initialProfile

  if (!profile) {
    await convex.mutation(api.profiles.save, {
      userId: identity.userId,
      sessionToken: identity.token,
      profile: canonicalProfilePayload
    })
    profile = await convex.query(api.profiles.getByUserId, {
      userId: identity.userId,
      sessionToken: identity.token
    })
  } else {
    const syncPayload: Record<string, string | null> = {}
    for (const field of canonicalFields) {
      if (field === 'user_id') continue
      const canonicalValue = canonicalProfile[field]
      if (!canonicalValue) continue
      const storedValue = normalizeProfileValue((profile as any)?.[field])
      if (storedValue !== canonicalValue) {
        syncPayload[field] = canonicalValue
      }
    }

    if (Object.keys(syncPayload).length > 0) {
      await convex.mutation(api.profiles.save, {
        userId: identity.userId,
        sessionToken: identity.token,
        profile: syncPayload
      })
      profile = await convex.query(api.profiles.getByUserId, {
        userId: identity.userId,
        sessionToken: identity.token
      })
    }
  }

  const normalizedProfile: Record<string, any> = {
    ...(profile ?? {}),
    user_id: profile?.user_id ?? canonicalProfile.user_id
  }

  normalizedProfile.email =
    canonicalProfile.email ?? normalizeProfileValue(profile?.email) ?? null
  normalizedProfile.name =
    canonicalProfile.name ?? normalizeProfileValue(profile?.name) ?? null
  normalizedProfile.avatar =
    canonicalProfile.avatar ?? normalizeProfileValue(profile?.avatar) ?? null

  const nullableProfileFields = [
    'domain',
    'phone',
    'country',
    'plan',
    'plan_name',
    'resend_api_key',
    'sms_user',
    'sms_password',
    'sms_creds_updated_at',
    'sms_sender_name',
    'sms_sender_type',
    'sms_balance_checked_at',
    'webhook_secret',
    'created_at',
    'updated_at'
  ] as const

  for (const field of nullableProfileFields) {
    if (normalizedProfile[field] === undefined) {
      normalizedProfile[field] = null
    }
  }

  normalizedProfile.has_resend_api_key = Boolean(profile?.resend_api_key)
  normalizedProfile.has_sms_password = Boolean(profile?.sms_password)
  delete normalizedProfile.resend_api_key
  delete normalizedProfile.sms_password

  return NextResponse.json({ profile: normalizedProfile, senders, usage })
}

export async function PUT(request: Request) {
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

  const payload = await request.json()
  const profileInput = payload?.profile

  if (!profileInput || typeof profileInput !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const ip = getClientIp(request)
  const limit = rateLimit(`profile:update:${identity.userId}:${ip}`, {
    windowMs: 60_000,
    limit: 30
  })

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many profile updates. Try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            (limit.resetAt - Date.now()) / 1000
          ).toString()
        }
      }
    )
  }

  const convex = createConvexServerClient()

  const existingProfile = await convex.query(api.profiles.getByUserId, {
    userId: identity.userId,
    sessionToken: identity.token
  })

  const profileUpdates: Record<string, string | null> = {}
  const identityUpdates: Record<string, string> = {}

  if ('name' in profileInput) {
    const normalized =
      typeof profileInput.name === 'string' ? profileInput.name.trim() : ''
    profileUpdates.name = normalized || null
    if (normalized) {
      identityUpdates.name = normalized
    }
  }

  if ('avatar' in profileInput) {
    const normalized =
      typeof profileInput.avatar === 'string' ? profileInput.avatar.trim() : ''
    profileUpdates.avatar = normalized || null
    if (normalized) {
      identityUpdates.avatarUrl = normalized
    }
  }

  if (Object.keys(identityUpdates).length > 0) {
    await identityRequest('/auth/update-profile', {
      sessionToken: identity.token,
      ...identityUpdates
    })
  }

  if ('domain' in profileInput) {
    const normalized =
      typeof profileInput.domain === 'string'
        ? profileInput.domain.trim().toLowerCase()
        : ''
    profileUpdates.domain = normalized || null
  }

  if ('phone' in profileInput) {
    const normalized =
      typeof profileInput.phone === 'string' ? profileInput.phone.trim() : ''
    profileUpdates.phone = normalized || null
  }

  if ('country' in profileInput) {
    const normalized =
      typeof profileInput.country === 'string'
        ? profileInput.country.trim()
        : ''
    profileUpdates.country = normalized || null
  }

  if ('sms_user' in profileInput) {
    const normalized =
      typeof profileInput.sms_user === 'string'
        ? profileInput.sms_user.trim()
        : ''
    profileUpdates.sms_user = normalized || null
  }

  if ('sms_password' in profileInput) {
    const normalized =
      typeof profileInput.sms_password === 'string'
        ? profileInput.sms_password.trim()
        : ''
    profileUpdates.sms_password = normalized || null
  }

  if ('sms_sender_name' in profileInput) {
    const normalized =
      typeof profileInput.sms_sender_name === 'string'
        ? profileInput.sms_sender_name.trim()
        : ''
    profileUpdates.sms_sender_name = normalized || null
  }

  if ('sms_sender_type' in profileInput) {
    const normalized =
      typeof profileInput.sms_sender_type === 'string'
        ? profileInput.sms_sender_type.trim()
        : ''
    profileUpdates.sms_sender_type = normalized || null
  }

  if ('resend_api_key' in profileInput) {
    const normalized =
      typeof profileInput.resend_api_key === 'string'
        ? profileInput.resend_api_key.trim()
        : ''
    profileUpdates.resend_api_key = normalized || null
  }

  if ('sms_user' in profileUpdates || 'sms_password' in profileUpdates) {
    profileUpdates.sms_creds_updated_at = new Date().toISOString()
  }

  const resendKey = profileUpdates.resend_api_key
  if (typeof resendKey === 'string' && resendKey.length) {
    profileUpdates.resend_api_key = encryptSecret(resendKey) ?? null
  }

  const smsPassword = profileUpdates.sms_password
  if (typeof smsPassword === 'string' && smsPassword.length) {
    profileUpdates.sms_password = encryptSecret(smsPassword) ?? null
  }

  const pendingProfile = {
    ...(existingProfile ?? {}),
    ...profileUpdates
  }

  let warning: string | null = null
  if (pendingProfile?.resend_api_key) {
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      new URL(request.url).origin
    try {
      const status = await getResendStatus({
        apiKey: decryptSecret(pendingProfile.resend_api_key) as string,
        domain: pendingProfile.domain,
        endpoint: `${origin}/api/events`
      })

      const webhookSecret = status.webhook?.secret
      if (webhookSecret) {
        profileUpdates.webhook_secret = webhookSecret
      }
    } catch (error: any) {
      warning =
        error?.message || 'Resend sync failed. Saved profile without updates.'
    }
  }

  await convex.mutation(api.profiles.save, {
    userId: identity.userId,
    sessionToken: identity.token,
    profile: profileUpdates
  })

  return NextResponse.json({ ok: true, warning })
}
