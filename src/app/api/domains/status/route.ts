import { NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'
import { getResendStatus } from '@/lib/resend/integration'
import { decryptSecret } from '@/lib/secrets'

export const runtime = 'nodejs'

export async function GET(request: Request) {
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
  const profile = await convex.query(api.profiles.getByUserId, {
    userId: identity.userId,
    sessionToken: identity.token
  })

  if (!profile?.domain || !profile?.resend_api_key) {
    return NextResponse.json(
      {
        error:
          'Add your workspace domain and Resend API key to view deliverability status.'
      },
      { status: 400 }
    )
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    new URL(request.url).origin

  try {
    const status = await getResendStatus({
      apiKey: decryptSecret(profile.resend_api_key) as string,
      domain: profile.domain,
      endpoint: `${origin}/api/events`
    })

    if (
      status.webhook?.secret &&
      status.webhook.secret !== profile.webhook_secret
    ) {
      await convex.mutation(api.profiles.save, {
        userId: identity.userId,
        sessionToken: identity.token,
        profile: { webhook_secret: status.webhook.secret }
      })
    }

    const secretSuffix =
      status.webhook?.secret?.slice(-6) ??
      profile?.webhook_secret?.slice(-6) ??
      null

    return NextResponse.json({
      domain: status.domain,
      webhook: {
        endpoint: status.webhook?.endpoint,
        status: status.webhook?.status,
        hasSecret: Boolean(secretSuffix),
        secretSuffix
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load Resend status' },
      { status: 400 }
    )
  }
}
