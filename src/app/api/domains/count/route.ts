import { NextRequest, NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'
import { PLAN_LIMITS, type PlanType } from '@/lib/plans'
import { getClientIp, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')?.trim().toLowerCase()
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

  const ip = getClientIp(req)
  const limitResult = rateLimit(`domain:count:${identity.userId}:${ip}`, {
    windowMs: 60_000,
    limit: 30
  })

  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            (limitResult.resetAt - Date.now()) / 1000
          ).toString()
        }
      }
    )
  }

  const convex = createConvexServerClient()
  const profile = await convex.query(api.profiles.getByUserId, {
    userId: identity.userId,
    sessionToken: identity.token
  })
  const userPlan = (profile?.plan_name || profile?.plan || 'free') as PlanType
  const limits = PLAN_LIMITS[userPlan] ?? PLAN_LIMITS.free

  const count = await convex.query(api.profiles.countByDomain, {
    domain,
    sessionToken: identity.token
  })

  return NextResponse.json({
    allowed: (count || 0) < limits.maxTotalUsersForDomain
  })
}
