import { NextResponse } from 'next/server'

import { getIdentityDbUrl } from '@/lib/identity/config'
import { setSessionCookie } from '@/lib/identity/server'
import { assertSameOrigin } from '@/lib/security/csrf'
import { getClientIp, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export async function POST(request: Request) {
  const originError = assertSameOrigin(request)
  if (originError) {
    return NextResponse.json({ error: originError.error }, { status: 403 })
  }

  const ip = getClientIp(request)
  const limit = rateLimit(`auth:register:${ip}`, {
    windowMs: 60_000,
    limit: 5
  })

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Try again shortly.' },
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

  const payload = await request.json().catch(() => null)

  const name = payload?.name?.toString().trim()
  const email = payload?.email?.toString().trim().toLowerCase()
  const password = payload?.password?.toString()
  const avatarUrl = payload?.avatarUrl?.toString().trim()

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: 'Name, email, and password are required.' },
      { status: 400 }
    )
  }

  if (!PASSWORD_RULE.test(password)) {
    return NextResponse.json(
      {
        error:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
      },
      { status: 400 }
    )
  }

  const identityUrl = `${getIdentityDbUrl()}/auth/register`

  const response = await fetch(identityUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      password,
      avatarUrl: avatarUrl || undefined
    })
  })

  const bodyText = await response.text()
  let identityPayload: any = null
  if (bodyText) {
    try {
      identityPayload = JSON.parse(bodyText)
    } catch {
      identityPayload = null
    }
  }

  if (!response.ok) {
    const message =
      identityPayload?.error ||
      identityPayload?.message ||
      'Registration failed. Please try again.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const sessionToken = identityPayload?.sessionToken
  if (!sessionToken) {
    return NextResponse.json(
      { error: 'Identity service did not return a session token.' },
      { status: 500 }
    )
  }

  await setSessionCookie(sessionToken)

  return NextResponse.json({ sessionToken })
}
