import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authFields, requireAdminAccess } from './identity'

export const upsertByInvoice = mutation({
  args: {
    order_id: v.string(),
    provider: v.string(),
    invoice_id: v.optional(v.string()),
    transaction_id: v.optional(v.string()),
    status: v.string(),
    gateway_status: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    raw_request: v.optional(v.any()),
    raw_response: v.optional(v.any()),
    ...authFields
  },
  handler: async (ctx, args) => {
    requireAdminAccess(args)
    let existing = null
    if (args.invoice_id) {
      existing = await ctx.db
        .query('payments')
        .withIndex('by_invoice_id', q => q.eq('invoice_id', args.invoice_id))
        .unique()
    }

    if (existing?._id) {
      await ctx.db.patch(existing._id, {
        order_id: args.order_id,
        provider: args.provider,
        invoice_id: args.invoice_id,
        transaction_id: args.transaction_id,
        status: args.status,
        gateway_status: args.gateway_status,
        amount: args.amount,
        currency: args.currency,
        raw_request: args.raw_request,
        raw_response: args.raw_response,
        updated_at: new Date().toISOString()
      })
      return existing._id
    }

    return await ctx.db.insert('payments', {
      order_id: args.order_id,
      provider: args.provider,
      invoice_id: args.invoice_id,
      transaction_id: args.transaction_id,
      status: args.status,
      gateway_status: args.gateway_status,
      amount: args.amount,
      currency: args.currency,
      raw_request: args.raw_request,
      raw_response: args.raw_response,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }
})

export const getByInvoice = query({
  args: { invoice_id: v.string(), ...authFields },
  handler: async (ctx, args) => {
    requireAdminAccess(args)
    return await ctx.db
      .query('payments')
      .withIndex('by_invoice_id', q => q.eq('invoice_id', args.invoice_id))
      .unique()
  }
})
