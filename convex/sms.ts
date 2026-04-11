import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authFields, ensureUserAuthorization } from './identity'

const smsFields = {
  user_id: v.string(),
  direction: v.string(),
  to: v.string(),
  text: v.string(),
  mode: v.string(),
  purpose: v.string(),
  status: v.optional(v.string()),
  provider_response: v.optional(v.string()),
  created_at: v.optional(v.string())
} as const

export const listByDirection = query({
  args: {
    userId: v.string(),
    direction: v.string(),
    limit: v.optional(v.number()),
    ...authFields
  },
  handler: async (ctx, args) => {
    await ensureUserAuthorization(args)
    const iterator = ctx.db
      .query('sms_messages')
      .withIndex('by_user_direction', q =>
        q.eq('user_id', args.userId).eq('direction', args.direction)
      )
      .order('desc')

    const results = []
    for await (const doc of iterator) {
      results.push(doc)
      if (args.limit && results.length >= args.limit) {
        break
      }
    }

    return results
  }
})

export const create = mutation({
  args: { ...smsFields, ...authFields },
  handler: async (ctx, args) => {
    const { sessionToken, adminSecret, ...sms } = args
    await ensureUserAuthorization(
      { sessionToken, adminSecret, userId: sms.user_id },
      { allowAdmin: true }
    )

    return await ctx.db.insert('sms_messages', {
      ...sms,
      created_at: sms.created_at ?? new Date().toISOString()
    })
  }
})
