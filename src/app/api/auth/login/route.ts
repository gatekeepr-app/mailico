import { NextResponse } from 'next/server'

import { identityRequest } from '@/lib/identity/request'
import { setSessionCookie } from '@/lib/identity/server'
import { assertSameOrigin } from '@/lib/security/csrf'
import { getClientIp, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const originError = assertSameOrigin(request)
  if (originError) {
    return NextResponse.json({ error: originError.error }, { status: 403 })
  }

  const ip = getClientIp(request)
  const limit = rateLimit(`auth:login:${ip}`, { windowMs: 60_000, limit: 10 })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again shortly.' },
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
  const email = payload?.email?.toString().trim().toLowerCase()
  const password = payload?.password?.toString()

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 }
    )
  }

  try {
    const { user, sessionToken } = await identityRequest<{
      user: any
      sessionToken: string
    }>('/auth/login', {
      email,
      password
    })

    await setSessionCookie(sessionToken)

    return NextResponse.json({ user })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Login failed.' },
      { status: 400 }
    )
  }
}
