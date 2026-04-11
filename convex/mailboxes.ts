import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authFields, requireAdminAccess } from './identity'

export const findByAddress = query({
  args: { address: v.string(), ...authFields },
  handler: async (ctx, args) => {
    requireAdminAccess(args)
    const normalized = args.address.trim().toLowerCase()
    return await ctx.db
      .query('mailboxes')
      .withIndex('by_address', q => q.eq('address', normalized))
      .unique()
  }
})

export const upsert = mutation({
  args: {
    userId: v.string(),
    address: v.string(),
    createdAt: v.optional(v.string()),
    ...authFields
  },
  handler: async (ctx, args) => {
    requireAdminAccess(args)
    const normalized = args.address.trim().toLowerCase()
    const existing = await ctx.db
      .query('mailboxes')
      .withIndex('by_address', q => q.eq('address', normalized))
      .unique()

    if (existing?._id) {
      await ctx.db.patch(existing._id, { user_id: args.userId })
      return existing._id
    }

    return await ctx.db.insert('mailboxes', {
      user_id: args.userId,
      address: normalized,
      created_at: args.createdAt ?? new Date().toISOString()
    })
  }
})
