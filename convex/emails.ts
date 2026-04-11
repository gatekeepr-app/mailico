import { v } from 'convex/values'
import type { MutationCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import {
  authFields,
  ensureUserAuthorization,
  requireAdminAccess
} from './identity'

const emailFields = {
  user_id: v.string(),
  direction: v.string(),
  from_email: v.string(),
  to_email: v.string(),
  subject: v.string(),
  message: v.optional(v.string()),
  starred: v.optional(v.boolean()),
  created_at: v.optional(v.string()),
  scheduled_at: v.optional(v.string()),
  legacy_id: v.optional(v.string())
} as const

type EmailInput = {
  user_id: string
  direction: string
  from_email: string
  to_email: string
  subject: string
  message?: string
  starred?: boolean
  created_at?: string
  scheduled_at?: string
  legacy_id?: string
}

async function insertEmail(ctx: MutationCtx, args: EmailInput) {
  if (args.legacy_id) {
    const existing = await ctx.db
      .query('emails')
      .withIndex('by_legacy', q => q.eq('legacy_id', args.legacy_id))
      .unique()

    if (existing?._id) {
      return existing._id
    }
  }

  const createdAt = args.created_at ?? new Date().toISOString()

  return await ctx.db.insert('emails', {
    ...args,
    created_at: createdAt,
    starred: args.starred ?? false
  })
}

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
      .query('emails')
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
  args: { ...emailFields, ...authFields },
  handler: async (ctx, args) => {
    const { sessionToken, adminSecret, ...email } = args
    await ensureUserAuthorization(
      { sessionToken, adminSecret, userId: email.user_id },
      { allowAdmin: true }
    )
    return insertEmail(ctx, email)
  }
})

export const bulkInsert = mutation({
  args: {
    emails: v.array(v.object(emailFields)),
    ...authFields
  },
  handler: async (ctx, args) => {
    requireAdminAccess(args)
    for (const email of args.emails) {
      await insertEmail(ctx, email)
    }
  }
})
