import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  authFields,
  ensureUserAuthorization,
  requireAdminAccess
} from './identity'

export const create = mutation({
  args: {
    order_id: v.string(),
    user_id: v.string(),
    plan: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    payment_status: v.string(),
    customer_name: v.optional(v.string()),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    created_at: v.optional(v.string()),
    ...authFields
  },
  handler: async (ctx, args) => {
    await ensureUserAuthorization({
      sessionToken: args.sessionToken,
      adminSecret: args.adminSecret,
      userId: args.user_id
    })
    return await ctx.db.insert('orders', {
      order_id: args.order_id,
      user_id: args.user_id,
      plan: args.plan,
      amount: args.amount,
      currency: args.currency,
      status: args.status,
      payment_status: args.payment_status,
      customer_name: args.customer_name,
      customer_email: args.customer_email,
      customer_phone: args.customer_phone,
      created_at: args.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }
})

export const getByOrderId = query({
  args: { order_id: v.string(), ...authFields },
  handler: async (ctx, args) => {
    requireAdminAccess(args)
    return await ctx.db
      .query('orders')
      .withIndex('by_order_id', q => q.eq('order_id', args.order_id))
      .unique()
  }
})

export const updateStatus = mutation({
  args: {
    order_id: v.string(),
    status: v.string(),
    payment_status: v.string(),
    ...authFields
  },
  handler: async (ctx, args) => {
    requireAdminAccess(args)
    const order = await ctx.db
      .query('orders')
      .withIndex('by_order_id', q => q.eq('order_id', args.order_id))
      .unique()

    if (!order?._id) return null

    await ctx.db.patch(order._id, {
      status: args.status,
      payment_status: args.payment_status,
      updated_at: new Date().toISOString()
    })
    return order._id
  }
})
