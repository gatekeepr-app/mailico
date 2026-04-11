import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authFields, ensureUserAuthorization } from './identity'

export const getByUserId = query({
  args: { userId: v.string(), ...authFields },
  handler: async (ctx, args) => {
    await ensureUserAuthorization(args, { allowAdmin: true })
    return await ctx.db
      .query('usage_metrics')
      .withIndex('by_user', q => q.eq('user_id', args.userId))
      .unique()
  }
})

export const incrementEmailCount = mutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    ...authFields
  },
  handler: async (ctx, args) => {
    await ensureUserAuthorization(args, { allowAdmin: true })
    const existing = await ctx.db
      .query('usage_metrics')
      .withIndex('by_user', q => q.eq('user_id', args.userId))
      .unique()

    const updated_at = new Date().toISOString()

    if (existing?._id) {
      await ctx.db.patch(existing._id, {
        emails_sent: existing.emails_sent + args.amount,
        updated_at
      })
      return existing._id
    }

    return await ctx.db.insert('usage_metrics', {
      user_id: args.userId,
      emails_sent: args.amount,
      updated_at
    })
  }
})
