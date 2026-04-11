import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authFields, ensureUserAuthorization, hasAdminAccess } from './identity'

const nullableString = v.union(v.string(), v.null())

export const getByUserId = query({
  args: { userId: v.string(), ...authFields },
  handler: async (ctx, args) => {
    await ensureUserAuthorization(args, { allowAdmin: true })
    return await ctx.db
      .query('profiles')
      .withIndex('by_user', q => q.eq('user_id', args.userId))
      .unique()
  }
})

export const countByDomain = query({
  args: { domain: v.string(), ...authFields },
  handler: async (ctx, args) => {
    await ensureUserAuthorization(args)
    const normalized = args.domain.trim().toLowerCase()
    let count = 0

    const iterator = ctx.db
      .query('profiles')
      .withIndex('by_domain', q => q.eq('domain', normalized))

    for await (const _ of iterator) {
      count += 1
    }

    return count
  }
})

export const save = mutation({
  args: {
    userId: v.string(),
    ...authFields,
    profile: v.object({
      email: v.optional(nullableString),
      name: v.optional(nullableString),
      domain: v.optional(nullableString),
      phone: v.optional(nullableString),
      country: v.optional(nullableString),
      avatar: v.optional(nullableString),
      resend_api_key: v.optional(nullableString),
      sms_user: v.optional(nullableString),
      sms_password: v.optional(nullableString),
      sms_creds_updated_at: v.optional(nullableString),
      sms_sender_name: v.optional(nullableString),
      sms_sender_type: v.optional(nullableString),
      sms_balance_checked_at: v.optional(nullableString),
      plan: v.optional(nullableString),
      plan_name: v.optional(nullableString),
      webhook_secret: v.optional(nullableString)
    })
  },
  handler: async (ctx, args) => {
    const isAdmin = hasAdminAccess(args.adminSecret)
    await ensureUserAuthorization(args, { allowAdmin: true })
    const now = new Date().toISOString()
    const sanitizedProfile: Record<string, string | undefined> = {}
    const restrictedKeys = new Set(['plan', 'plan_name', 'webhook_secret'])

    for (const key of Object.keys(args.profile) as Array<
      keyof typeof args.profile
    >) {
      if (!isAdmin && restrictedKeys.has(key)) {
        continue
      }
      const value = args.profile[key]
      sanitizedProfile[key] =
        value === null || value === undefined ? undefined : value
    }

    const existing = await ctx.db
      .query('profiles')
      .withIndex('by_user', q => q.eq('user_id', args.userId))
      .unique()

    const nextProfile = {
      user_id: args.userId,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      ...sanitizedProfile
    }

    if (existing?._id) {
      await ctx.db.patch(existing._id, nextProfile)
      return existing._id
    }

    return await ctx.db.insert('profiles', nextProfile)
  }
})
