import { NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'

export const runtime = 'nodejs'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let identity
  try {
    identity = await requireIdentity()
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Missing sender id' }, { status: 400 })
  }

  const convex = createConvexServerClient()
  await convex.mutation(api.senderIdentities.remove, {
    id: id as any,
    userId: identity.userId,
    sessionToken: identity.token
  })

  return NextResponse.json({ ok: true })
}
