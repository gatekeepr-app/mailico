import { NextRequest, NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain) {
    return NextResponse.json({ error: 'Missing domain' }, { status: 400 })
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

  const convex = createConvexServerClient()
  const count = await convex.query(api.profiles.countByDomain, {
    domain,
    sessionToken: identity.token
  })

  return NextResponse.json({ count })
}
