import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { decryptSecret } from '@/lib/secrets'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { Webhook } from 'svix'

export const runtime = 'nodejs'

// Minimal shape of Resend webhook payload we care about
type ResendEmailReceivedEvent = {
  type: 'email.received'
  created_at?: string
  data: {
    email_id: string
    to?: string[]
    from?: string
    subject?: string
    // other fields exist but we don't need them for routing
  }
}

// Generic event fallback (other event types)
type ResendAnyEvent = {
  type: string
  data?: any
  created_at?: string
}

export async function POST(req: NextRequest) {
  const payload = await req.text()

  const convex = createConvexServerClient()
  const svixHeaders = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? ''
  }

  if (
    !svixHeaders['svix-id'] ||
    !svixHeaders['svix-timestamp'] ||
    !svixHeaders['svix-signature']
  ) {
    return new NextResponse('Invalid webhook', { status: 400 })
  }

  const globalWebhookSecret = process.env.RESEND_WEBHOOK_SECRET
  let verified: unknown
  let event: ResendAnyEvent
  let mailbox: { user_id?: string } | null = null
  let profile: {
    webhook_secret?: string | null
    resend_api_key?: string | null
  } | null = null

  if (globalWebhookSecret) {
    try {
      const wh = new Webhook(globalWebhookSecret)
      verified = wh.verify(payload, svixHeaders)
    } catch {
      return new NextResponse('Invalid webhook', { status: 400 })
    }
    event = verified as ResendAnyEvent
  } else {
    let preliminaryEvent: ResendAnyEvent | null = null
    try {
      preliminaryEvent = JSON.parse(payload)
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const potentialRecipient = (preliminaryEvent as ResendEmailReceivedEvent)
      ?.data?.to?.[0]

    if (!potentialRecipient) {
      return NextResponse.json(
        { ok: false, error: 'Missing recipient address' },
        { status: 400 }
      )
    }

    const adminSecret = process.env.CONVEX_ADMIN_SECRET
    if (!adminSecret) {
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured' },
        { status: 500 }
      )
    }

    mailbox = await convex.query(api.mailboxes.findByAddress, {
      address: potentialRecipient,
      adminSecret
    })

    if (!mailbox?.user_id) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    profile = await convex.query(api.profiles.getByUserId, {
      userId: mailbox.user_id,
      adminSecret
    })

    const webhookSecret = profile?.webhook_secret
    if (!webhookSecret) {
      return new NextResponse('Missing RESEND_WEBHOOK_SECRET', { status: 500 })
    }

    try {
      const wh = new Webhook(webhookSecret)
      verified = wh.verify(payload, svixHeaders)
    } catch {
      return new NextResponse('Invalid webhook', { status: 400 })
    }
    event = verified as ResendAnyEvent
  }

  // Now treat it as our event shape
  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true })
  }

  const received = event as ResendEmailReceivedEvent

  const emailId = received.data.email_id
  const recipient = received.data.to?.[0]

  if (!emailId || !recipient) {
    return NextResponse.json(
      { ok: false, error: 'Missing email_id or recipient' },
      { status: 400 }
    )
  }

  const adminSecret = process.env.CONVEX_ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json(
      { ok: false, error: 'Server misconfigured' },
      { status: 500 }
    )
  }

  if (!mailbox) {
    mailbox = await convex.query(api.mailboxes.findByAddress, {
      address: recipient,
      adminSecret
    })
  }

  if (!mailbox?.user_id) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  if (!profile) {
    profile = await convex.query(api.profiles.getByUserId, {
      userId: mailbox.user_id,
      adminSecret
    })
  }

  // Route recipient -> user_id
  if (!profile?.resend_api_key) {
    return NextResponse.json(
      { ok: false, error: 'Resend API key not configured for this user' },
      { status: 400 }
    )
  }

  // Fetch full email content (html/text) using Receiving API
  const resendKey = decryptSecret(profile.resend_api_key) as string
  const resend = new Resend(resendKey)
  const { data: email, error: emailErr } =
    await resend.emails.receiving.get(emailId)

  if (emailErr || !email) {
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch email content' },
      { status: 500 }
    )
  }

  // Insert into DB
  await convex.mutation(api.emails.create, {
    user_id: mailbox.user_id,
    adminSecret,
    direction: 'inbox',
    from_email: email.from,
    to_email: recipient,
    subject: email.subject ?? '',
    message: email.html ?? email.text ?? '',
    created_at: email.created_at ?? new Date().toISOString()
  })

  return NextResponse.json({ ok: true })
}
