import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { decryptSecret } from '@/lib/secrets'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { Webhook } from 'svix'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ResendEmailReceivedEvent = {
  type: 'email.received'
  data: {
    email_id: string
    to?: string[]
  }
}

type ResendAnyEvent = {
  type: string
  data?: any
}

export async function POST(req: NextRequest) {
  const payload = await req.text()

  const adminSecret = process.env.CONVEX_ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json(
      { ok: false, error: 'Server misconfigured' },
      { status: 500 }
    )
  }

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new NextResponse('Missing RESEND_WEBHOOK_SECRET', { status: 500 })
  }

  // 1️⃣ Verify webhook signature
  let verified: unknown
  try {
    const wh = new Webhook(webhookSecret)
    verified = wh.verify(payload, {
      'svix-id': req.headers.get('svix-id') ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? ''
    })
  } catch {
    return new NextResponse('Invalid webhook', { status: 400 })
  }

  const base = verified as ResendAnyEvent
  if (base.type !== 'email.received') {
    return NextResponse.json({ ok: true })
  }

  const event = verified as ResendEmailReceivedEvent
  const emailId = event.data.email_id
  const recipient = event.data.to?.[0]

  if (!emailId || !recipient) {
    return NextResponse.json(
      { ok: false, error: 'Missing email_id or recipient' },
      { status: 400 }
    )
  }

  // 2️⃣ Route inbox → user
  const convex = createConvexServerClient()
  const mailbox = await convex.query(api.mailboxes.findByAddress, {
    address: recipient,
    adminSecret
  })

  if (!mailbox?.user_id) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const profile = await convex.query(api.profiles.getByUserId, {
    userId: mailbox.user_id,
    adminSecret
  })

  if (!profile?.resend_api_key) {
    return NextResponse.json(
      { ok: false, error: 'Resend API key not configured' },
      { status: 400 }
    )
  }

  // 4️⃣ Fetch full email body (required by Resend)
  const resendKey = decryptSecret(profile.resend_api_key) as string
  const resend = new Resend(resendKey)
  const { data: email } = await resend.emails.receiving.get(emailId)

  if (!email) {
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch email content' },
      { status: 500 }
    )
  }

  // 5️⃣ Insert into DB
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
