import { NextResponse } from 'next/server'

import { getIdentityFromCookies } from '@/lib/identity/server'

export const runtime = 'nodejs'

export async function GET() {
  const identity = await getIdentityFromCookies({ allowCookieMutation: true })
  if (!identity) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  return NextResponse.json({ user: identity.user })
}
