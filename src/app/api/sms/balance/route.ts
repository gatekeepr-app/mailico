import { NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'
import { decryptSecret } from '@/lib/secrets'

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

  const params = new URLSearchParams({
    user,
    password
  })

  try {
    const response = await fetch('https://panel.smsbangladesh.com/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
    const resultText = await response.text()
    let balance: string | null = null

    try {
      const parsed = JSON.parse(resultText)
      balance =
        typeof parsed?.['AVAILABLE BALANCE ='] === 'string'
          ? parsed['AVAILABLE BALANCE ='].trim()
          : typeof parsed?.available_balance === 'string'
            ? parsed.available_balance.trim()
            : null
    } catch {
      const match = resultText.match(/AVAILABLE\s+BALANCE\s*=\s*([0-9.]+)/i)
      if (match?.[1]) balance = match[1]
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'SMS provider error', details: resultText },
        { status: 502 }
      )
    }

    await convex.mutation(api.profiles.save, {
      userId: identity.userId,
      sessionToken: identity.token,
      profile: { sms_balance_checked_at: new Date().toISOString() }
    })

    return NextResponse.json({ ok: true, provider: resultText, balance })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch balance' },
      { status: 500 }
    )
  }
}
