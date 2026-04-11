import { NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'
import { decryptSecret } from '@/lib/secrets'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  let identity
  try {
    identity = await requireIdentity()
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unauthorized' },
      { status: 401 }
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

  if (!user || !password) {
    return NextResponse.json(
      { error: 'SMS credentials are not configured for this user' },
      { status: 400 }
    )
  }

  const url = new URL(request.url)
  const smsid = url.searchParams.get('smsid')?.trim()

  if (!smsid) {
    return NextResponse.json({ error: 'smsid is required' }, { status: 400 })
  }

  const params = new URLSearchParams({
    user,
    password,
    smsid
  })

  try {
    const response = await fetch(
      `https://panel.smsbangladesh.com/smsstatus?${params.toString()}`
    )
    const resultText = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { error: 'SMS provider error', details: resultText },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, provider: resultText })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch status' },
      { status: 500 }
    )
  }
}
