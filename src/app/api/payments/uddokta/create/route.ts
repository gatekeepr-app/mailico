import crypto from 'crypto'
import { NextResponse } from 'next/server'

import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { requireIdentity } from '@/lib/identity/server'

export const runtime = 'nodejs'

type CreateChargePayload = {
  plan: string
  redirectUrl: string
  cancelUrl: string
  webhookUrl?: string
}

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  pro: 999,
  business: 3999
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

  const body = (await request
    .json()
    .catch(() => null)) as CreateChargePayload | null
  const plan = body?.plan?.toLowerCase().trim()
  const redirectUrl = body?.redirectUrl?.trim()
  const cancelUrl = body?.cancelUrl?.trim()
  const webhookUrl = body?.webhookUrl?.trim()

  if (!plan || !redirectUrl || !cancelUrl) {
    return NextResponse.json(
      { error: 'plan, redirectUrl, and cancelUrl are required' },
      { status: 400 }
    )
  }

  if (!(plan in PLAN_PRICES)) {
    return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
  }

  const amount = PLAN_PRICES[plan]
  const convex = createConvexServerClient()
  const profile = await convex.query(api.profiles.getByUserId, {
    userId: identity.userId,
    sessionToken: identity.token
  })

  const adminSecret = process.env.CONVEX_ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json(
      { error: 'CONVEX_ADMIN_SECRET is not configured' },
      { status: 500 }
    )
  }

  const orderId = crypto.randomUUID()
  const now = new Date().toISOString()
  await convex.mutation(api.orders.create, {
    order_id: orderId,
    user_id: identity.userId,
    plan,
    amount,
    currency: 'BDT',
    status: amount === 0 ? 'confirmed' : 'awaiting_payment',
    payment_status: amount === 0 ? 'paid' : 'pending',
    customer_name: profile?.name || undefined,
    customer_email: profile?.email || undefined,
    customer_phone: profile?.phone || undefined,
    created_at: now,
    sessionToken: identity.token
  })

  if (amount === 0) {
    await convex.mutation(api.payments.upsertByInvoice, {
      order_id: orderId,
      provider: 'uddoktapay',
      invoice_id: orderId,
      status: 'completed',
      gateway_status: 'completed',
      amount,
      currency: 'BDT',
      raw_request: { plan },
      raw_response: { status: 'free' },
      adminSecret
    })

    await convex.mutation(api.profiles.save, {
      userId: identity.userId,
      profile: { plan, plan_name: plan },
      adminSecret
    })

    return NextResponse.json({ ok: true, status: 'free', orderId })
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

  const requestBody = {
    full_name: profile?.name || 'Mailico Customer',
    email: profile?.email || 'unknown@mailico.app',
    amount: amount.toString(),
    currency: 'BDT',
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
    return_type: 'GET',
    webhook_url: webhookUrl,
    metadata: {
      order_id: orderId,
      user_id: identity.userId,
      plan
    }
  }

  try {
    const response = await fetch(`${baseUrl}/checkout-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'RT-UDDOKTAPAY-API-KEY': apiKey
      },
      body: JSON.stringify(requestBody)
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.message || 'Failed to create payment' },
        { status: 502 }
      )
    }

    const paymentUrl = payload?.payment_url
    const invoiceId = payload?.invoice_id || payload?.invoiceId

    if (!paymentUrl) {
      return NextResponse.json(
        { error: 'Missing payment_url from gateway' },
        { status: 502 }
      )
    }

    await convex.mutation(api.payments.upsertByInvoice, {
      order_id: orderId,
      provider: 'uddoktapay',
      invoice_id: invoiceId,
      status: 'redirected',
      gateway_status: payload?.status || 'redirected',
      amount,
      currency: 'BDT',
      raw_request: requestBody,
      raw_response: payload,
      adminSecret
    })

    return NextResponse.json({ ok: true, payment_url: paymentUrl, orderId })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create payment' },
      { status: 500 }
    )
  }
}
