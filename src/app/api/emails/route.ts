import { NextRequest, NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const direction = req.nextUrl.searchParams.get('direction') ?? 'inbox'
  const limitParam = req.nextUrl.searchParams.get('limit')
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
  const emails = await convex.query(api.emails.listByDirection, {
    userId: identity.userId,
    sessionToken: identity.token,
    direction,
    limit
  })

  return NextResponse.json({ emails })
}
