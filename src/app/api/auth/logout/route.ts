import { NextResponse } from 'next/server'

import { identityRequest } from '@/lib/identity/request'
import {
  clearSessionCookie,
  getIdentityFromCookies
} from '@/lib/identity/server'
import { assertSameOrigin } from '@/lib/security/csrf'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const originError = assertSameOrigin(request)
  if (originError) {
    return NextResponse.json({ error: originError.error }, { status: 403 })
  }

  const session = await getIdentityFromCookies()

  if (session?.token) {
    try {
      await identityRequest('/auth/logout', { sessionToken: session.token })
    } catch {
      // ignore failures; still clear cookie
    }
  }

  await clearSessionCookie()

  return NextResponse.json({ success: true })
}
