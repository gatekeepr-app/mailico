import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'
import { decryptSecret } from '@/lib/secrets'
import { assertSameOrigin } from '@/lib/security/csrf'
import { getClientIp, rateLimit } from '@/lib/security/rate-limit'
import { Resend } from 'resend'

export const runtime = 'nodejs'

function stripHtml(input: string) {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(request: Request) {
  try {
    const originError = assertSameOrigin(request)
    if (originError) {
      return Response.json({ error: originError.error }, { status: 403 })
    }

    let identity
    try {
      identity = await requireIdentity()
    } catch (error: any) {
      return Response.json(
        { error: error?.message || 'Unauthorized' },
        { status: 401 }
      )
    }

    const ip = getClientIp(request)
    const rateLimitResult = rateLimit(`send:email:${identity.userId}:${ip}`, {
      windowMs: 60_000,
      limit: 60
    })

    if (!rateLimitResult.allowed) {
      return Response.json(
        { error: 'Too many send attempts. Try again shortly.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (rateLimitResult.resetAt - Date.now()) / 1000
            ).toString()
          }
        }
      )
    }
    const convex = createConvexServerClient()

    const body = await request.json()

    const from = body?.from as string | undefined
    const toRaw = body?.email as string | undefined
    const subject = (body?.subject as string | undefined) ?? '(no subject)'
    const message = (body?.message as string | undefined) ?? ''
    const fromName = (body?.fromName as string | undefined) ?? 'Mailico'
    const scheduledAtRaw = body?.scheduledAt as string | undefined

    if (!from || !toRaw || !message) {
      return Response.json(
        { error: 'Missing required fields (from, email, message)' },
        { status: 400 }
      )
    }

    const to = toRaw
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)

    let scheduledAt: string | undefined
    if (scheduledAtRaw) {
      scheduledAt = new Date(scheduledAtRaw).toISOString()
    }

    const profile = await convex.query(api.profiles.getByUserId, {
      userId: identity.userId,
      sessionToken: identity.token
    })

    const senders = await convex.query(api.senderIdentities.listByUser, {
      userId: identity.userId,
      sessionToken: identity.token
    })

    const normalizedFrom = from.trim().toLowerCase()
    const allowedSender = senders.find(
      sender => sender.address.toLowerCase() === normalizedFrom
    )

    if (!allowedSender) {
      return Response.json(
        {
          error: 'Choose a verified sender identity before sending.',
          reason: 'Save the address under Sender Identities first.'
        },
        { status: 400 }
      )
    }

    const fromDomain = normalizedFrom.split('@')[1]
    const allowedDomains = new Set<string>()
    if (profile?.domain) {
      allowedDomains.add(profile.domain.trim().toLowerCase())
    }
    senders.forEach(sender => {
      const part = sender.address.split('@')[1]?.toLowerCase()
      if (part) allowedDomains.add(part)
    })

    if (!fromDomain || !allowedDomains.has(fromDomain)) {
      return Response.json(
        {
          error: 'Sender domain is not approved',
          reason:
            'Update your domain in Settings → Profile to match this address.'
        },
        { status: 400 }
      )
    }

    const planName = (
      profile?.plan_name ||
      profile?.plan ||
      'free'
    ).toLowerCase()

    const usage = await convex.query(api.usage.getByUserId, {
      userId: identity.userId,
      sessionToken: identity.token
    })
    const emailsSent = usage?.emails_sent || 0

    const LIMITS: Record<string, number> = {
      free: 3000,
      pro: 50000,
      enterprise: 1000000000
    }

    const limit = LIMITS[planName] || LIMITS.free

    if (emailsSent >= limit) {
      return Response.json(
        {
          error: 'Monthly email limit reached',
          reason: `You have reached the limit for your ${planName} plan (${limit.toLocaleString()} emails).`
        },
        { status: 403 }
      )
    }

    if (!profile?.resend_api_key) {
      return Response.json(
        { error: 'Resend API key not configured' },
        { status: 400 }
      )
    }

    const resendKey = decryptSecret(profile.resend_api_key) as string
    const resend = new Resend(resendKey)

    const fromHeader = `${fromName} <${from}>`

    const { data, error } = await resend.emails.send({
      from: fromHeader,
      to,
      subject,
      html: message,
      text: stripHtml(message),
      scheduledAt: scheduledAt
    })

    if (error) {
      console.error('Resend error:', error)
      return Response.json({ error }, { status: 500 })
    }

    await convex.mutation(api.emails.create, {
      user_id: identity.userId,
      sessionToken: identity.token,
      direction: scheduledAt ? 'scheduled' : 'sent',
      from_email: from,
      to_email: to.join(', '),
      subject,
      message,
      created_at: new Date().toISOString()
    })

    if (!scheduledAt) {
      try {
        const adminSecret = process.env.CONVEX_ADMIN_SECRET
        if (!adminSecret) {
          throw new Error('CONVEX_ADMIN_SECRET is not configured')
        }

        const identities = await convex.query(
          api.senderIdentities.findByAddresses,
          { addresses: to, adminSecret }
        )

        if (identities.length > 0) {
          await convex.mutation(api.emails.bulkInsert, {
            adminSecret,
            emails: identities.map(identityRecord => ({
              user_id: identityRecord.user_id,
              direction: 'inbox',
              from_email: from,
              to_email: to.join(', '),
              subject,
              message,
              created_at: new Date().toISOString()
            }))
          })
        }
      } catch (err) {
        console.error('Failed to deliver internal inbox message:', err)
      }
    }

    try {
      await convex.mutation(api.usage.incrementEmailCount, {
        userId: identity.userId,
        sessionToken: identity.token,
        amount: 1
      })
    } catch (err) {
      console.error('Failed to update usage metrics:', err)
    }

    return Response.json({ success: true, data }, { status: 200 })
  } catch (err: any) {
    console.error('Send API error:', err)
    return Response.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
