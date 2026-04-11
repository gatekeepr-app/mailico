import { NextRequest, NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const direction = request.nextUrl.searchParams.get('direction') ?? 'outbound'
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Number(limitParam) : undefined

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
  const messages = await convex.query(api.sms.listByDirection, {
    userId: identity.userId,
    sessionToken: identity.token,
    direction,
    limit
  })

  return NextResponse.json({ messages })
}
