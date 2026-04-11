import { NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'

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
  const senders = await convex.query(api.senderIdentities.listByUser, {
    userId: identity.userId,
    sessionToken: identity.token
  })

  return NextResponse.json({ senders })
}

export async function POST(request: Request) {
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
  const name = payload?.name?.toString().trim()
  const address = payload?.address?.toString().trim()

  if (!name || !address) {
    return NextResponse.json(
      { error: 'Missing sender name or address' },
      { status: 400 }
    )
  }

  const convex = createConvexServerClient()
  await convex.mutation(api.senderIdentities.create, {
    userId: identity.userId,
    sessionToken: identity.token,
    name,
    address,
    verified: false
  })

  return NextResponse.json({ ok: true })
}
