import { NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'

export const runtime = 'nodejs'

type WebhookPayload = {
  invoice_id?: string
  status?: string
}

export async function POST(request: Request) {
  const apiKey = process.env.UDDOKTAPAY_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'UDDOKTAPAY_API_KEY is not configured' },
      { status: 500 }
    )
  }

  const headerKey = request.headers.get('rt-uddoktapay-api-key')
  if (!headerKey || headerKey !== apiKey) {
    return NextResponse.json({ error: 'Unauthorized Action' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as WebhookPayload | null
  const invoiceId = body?.invoice_id?.trim()

  if (!invoiceId) {
    return NextResponse.json(
      { error: 'invoice_id is required' },
      { status: 400 }
    )
  }

  const baseUrl =
    process.env.UDDOKTAPAY_BASE_URL || 'https://gatekeepr.paymently.io/api'

  try {
    const response = await fetch(`${baseUrl}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'RT-UDDOKTAPAY-API-KEY': apiKey
      },
      body: JSON.stringify({ invoice_id: invoiceId })
    })

    const gateway = await response.json().catch(() => null)
    if (!response.ok) {
      return NextResponse.json(
        { error: gateway?.message || 'Failed to verify payment' },
        { status: 502 }
      )
    }

    const status = (gateway?.status || gateway?.payment_status || '').toString()
    const normalized = status.toLowerCase() || 'failed'

    const adminSecret = process.env.CONVEX_ADMIN_SECRET
    if (!adminSecret) {
      return NextResponse.json(
        { error: 'CONVEX_ADMIN_SECRET is not configured' },
        { status: 500 }
      )
    }

    const convex = createConvexServerClient()
    const orderId = gateway?.metadata?.order_id
    if (orderId) {
      const orderStatus =
        normalized === 'completed'
          ? 'confirmed'
          : normalized === 'pending'
            ? 'pending_verification'
            : 'payment_failed'

      const paymentStatus =
        normalized === 'completed'
          ? 'paid'
          : normalized === 'pending'
            ? 'pending'
            : 'failed'

      await convex.mutation(api.orders.updateStatus, {
        order_id: orderId,
        status: orderStatus,
        payment_status: paymentStatus,
        adminSecret
      })

      await convex.mutation(api.payments.upsertByInvoice, {
        order_id: orderId,
        provider: 'uddoktapay',
        invoice_id: invoiceId,
        transaction_id: gateway?.transaction_id || gateway?.trx_id,
        status: normalized,
        gateway_status: status,
        amount: Number(gateway?.amount || 0),
        currency: gateway?.currency || 'BDT',
        raw_request: body,
        raw_response: gateway,
        adminSecret
      })

      if (normalized === 'completed') {
        const plan = gateway?.metadata?.plan
        const userId = gateway?.metadata?.user_id
        if (plan && userId) {
          await convex.mutation(api.profiles.save, {
            userId,
            profile: { plan, plan_name: plan },
            adminSecret
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to process webhook' },
      { status: 500 }
    )
  }
}
