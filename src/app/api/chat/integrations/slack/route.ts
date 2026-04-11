import crypto from 'crypto'
import { NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'
import { encryptSecret } from '@/lib/secrets'

export const runtime = 'nodejs'

type SlackIntegrationPayload = {
  signingSecret?: string
  teamId?: string
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

  const payload = (await request
    .json()
    .catch(() => ({}))) as SlackIntegrationPayload
  const signingSecret = payload?.signingSecret?.trim()
  const teamId = payload?.teamId?.trim()

  if (!signingSecret) {
    return NextResponse.json(
      { error: 'signingSecret is required' },
      { status: 400 }
    )
  }

  const encrypted = encryptSecret(signingSecret)
  if (!encrypted) {
    return NextResponse.json(
      { error: 'Unable to encrypt signing secret' },
      { status: 500 }
    )
  }

  const integrationId = crypto.randomUUID()
  const convex = createConvexServerClient()
  await convex.mutation(api.chatIntegrations.createForUser, {
    user_id: identity.userId,
    integration_id: integrationId,
    channel: 'slack',
    signing_secret: encrypted,
    external_team_id: teamId || undefined,
    sessionToken: identity.token
  })

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    new URL(request.url).origin

  return NextResponse.json({
    ok: true,
    integrationId,
    webhookUrl: `${origin}/api/chat/webhooks/slack/${integrationId}`
  })
}
