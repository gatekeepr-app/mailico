import { NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'

export const runtime = 'nodejs'

type VerifyPayload = {
  invoiceId?: string
  orderId?: string
}

const STATUS_MAP: Record<string, { order: string; payment: string }> = {
  completed: { order: 'confirmed', payment: 'paid' },
  pending: { order: 'pending_verification', payment: 'pending' },
  error: { order: 'payment_failed', payment: 'failed' },
  failed: { order: 'payment_failed', payment: 'failed' }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as VerifyPayload | null
  const invoiceId = body?.invoiceId?.trim()
  const orderId = body?.orderId?.trim()

  if (!invoiceId && !orderId) {
    return NextResponse.json(
      { error: 'invoiceId or orderId is required' },
      { status: 400 }
    )
  }

  const apiKey = process.env.UDDOKTAPAY_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'UDDOKTAPAY_API_KEY is not configured' },
      { status: 500 }
    )
  }

  const baseUrl =
    process.env.UDDOKTAPAY_BASE_URL || 'https://gatekeepr.paymently.io/api'

  const payload = {
    invoice_id: invoiceId
  }

  try {
    const response = await fetch(`${baseUrl}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'RT-UDDOKTAPAY-API-KEY': apiKey
      },
      body: JSON.stringify(payload)
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
    const mapped = STATUS_MAP[normalized] || STATUS_MAP.failed

    const adminSecret = process.env.CONVEX_ADMIN_SECRET
    if (!adminSecret) {
      return NextResponse.json(
        { error: 'CONVEX_ADMIN_SECRET is not configured' },
        { status: 500 }
      )
    }

    const convex = createConvexServerClient()
    let order = null
    if (orderId) {
      order = await convex.query(api.orders.getByOrderId, {
        order_id: orderId,
        adminSecret
      })
    }

    const resolvedOrderId = order?.order_id || gateway?.metadata?.order_id
    if (!resolvedOrderId) {
      return NextResponse.json(
        { error: 'Unable to resolve order id' },
        { status: 400 }
      )
    }

    await convex.mutation(api.orders.updateStatus, {
      order_id: resolvedOrderId,
      status: mapped.order,
      payment_status: mapped.payment,
      adminSecret
    })

    await convex.mutation(api.payments.upsertByInvoice, {
      order_id: resolvedOrderId,
      provider: 'uddoktapay',
      invoice_id: invoiceId || gateway?.invoice_id,
      transaction_id: gateway?.transaction_id || gateway?.trx_id,
      status: normalized,
      gateway_status: status,
      amount: Number(gateway?.amount || order?.amount || 0),
      currency: gateway?.currency || order?.currency || 'BDT',
      raw_request: payload,
      raw_response: gateway,
      adminSecret
    })

    if (normalized === 'completed') {
      const plan = order?.plan || gateway?.metadata?.plan
      const userId = order?.user_id || gateway?.metadata?.user_id
      if (plan && userId) {
        await convex.mutation(api.profiles.save, {
          userId,
          profile: { plan, plan_name: plan },
          adminSecret
        })
      }
    }

    return NextResponse.json({
      success: normalized === 'completed',
      status: normalized,
      order,
      gateway
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
