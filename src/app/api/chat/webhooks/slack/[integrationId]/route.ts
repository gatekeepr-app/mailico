import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { decryptSecret } from '@/lib/secrets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SlackEventCallback = {
  type: 'event_callback'
  team_id?: string
  event?: {
    type?: string
    subtype?: string
    user?: string
    text?: string
    channel?: string
    ts?: string
    client_msg_id?: string
    bot_id?: string
  }
}

type SlackUrlVerification = {
  type: 'url_verification'
  challenge?: string
}

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function verifySlackSignature(params: {
  body: string
  timestamp: string
  signature: string
  secret: string
}) {
  const base = `v0:${params.timestamp}:${params.body}`
  const digest = crypto
    .createHmac('sha256', params.secret)
    .update(base)
    .digest('hex')
  const expected = `v0=${digest}`
  return timingSafeEqual(expected, params.signature)
}

function parseSlackTimestamp(timestamp: string) {
  const parsed = Number(timestamp)
  if (!Number.isFinite(parsed)) return null
  return parsed
}

function parseSlackEventTimestamp(ts?: string) {
  if (!ts) return null
  const parsed = Number(ts)
  if (!Number.isFinite(parsed)) return null
  return new Date(parsed * 1000).toISOString()
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params
  if (!integrationId) {
    return NextResponse.json(
      { error: 'Missing integration id' },
      { status: 400 }
    )
  }

  const adminSecret = process.env.CONVEX_ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const convex = createConvexServerClient()
  const integration = await convex.query(
    api.chatIntegrations.getByIntegrationId,
    {
      integration_id: integrationId,
      adminSecret
    }
  )

  if (!integration || integration.channel !== 'slack') {
    return NextResponse.json({ error: 'Unknown integration' }, { status: 404 })
  }

  const signingSecret = decryptSecret(integration.signing_secret) as string
  if (!signingSecret) {
    return NextResponse.json(
      { error: 'Slack signing secret not configured' },
      { status: 500 }
    )
  }

  const timestamp = request.headers.get('x-slack-request-timestamp')
  const signature = request.headers.get('x-slack-signature')
  const rawBody = await request.text()

  if (!timestamp || !signature) {
    return NextResponse.json(
      { error: 'Missing Slack signature headers' },
      { status: 400 }
    )
  }

  const timestampValue = parseSlackTimestamp(timestamp)
  if (!timestampValue) {
    return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 })
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestampValue)
  if (ageSeconds > 60 * 5) {
    return NextResponse.json({ error: 'Stale Slack request' }, { status: 400 })
  }

  const isValid = verifySlackSignature({
    body: rawBody,
    timestamp,
    signature,
    secret: signingSecret
  })

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: SlackEventCallback | SlackUrlVerification
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge || '' })
  }

  if (payload.type !== 'event_callback') {
    return NextResponse.json({ ok: true })
  }

  if (payload.team_id) {
    if (!integration.external_team_id) {
      await convex.mutation(api.chatIntegrations.setExternalTeamId, {
        integration_id: integrationId,
        external_team_id: payload.team_id,
        adminSecret
      })
    } else if (integration.external_team_id !== payload.team_id) {
      return NextResponse.json({ error: 'Team mismatch' }, { status: 403 })
    }
  }

  const event = payload.event
  if (!event || !event.type) {
    return NextResponse.json({ ok: true })
  }

  if (event.subtype || event.bot_id) {
    return NextResponse.json({ ok: true })
  }

  if (event.type !== 'message' && event.type !== 'app_mention') {
    return NextResponse.json({ ok: true })
  }

  const channelId = event.channel
  const senderId = event.user
  if (!channelId || !senderId) {
    return NextResponse.json(
      { error: 'Missing Slack channel or user' },
      { status: 400 }
    )
  }

  const receivedAt = parseSlackEventTimestamp(event.ts)

  const conversationId = await convex.mutation(
    api.chatConversations.getOrCreateByExternal,
    {
      user_id: integration.user_id,
      channel: 'slack',
      external_conversation_id: channelId,
      external_user_id: senderId,
      last_message_at: receivedAt ?? new Date().toISOString(),
      adminSecret
    }
  )

  await convex.mutation(api.chatMessages.create, {
    user_id: integration.user_id,
    conversation_id: conversationId,
    channel: 'slack',
    external_message_id: event.client_msg_id || event.ts,
    external_user_id: senderId,
    text: event.text,
    raw: payload,
    created_at: receivedAt ?? new Date().toISOString(),
    adminSecret
  })

  return NextResponse.json({ ok: true })
}
