import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  authFields,
  ensureUserAuthorization,
  requireAdminAccess
} from './identity'

export const listByUser = query({
  args: { userId: v.string(), ...authFields },
  handler: async (ctx, args) => {
    await ensureUserAuthorization(args, { allowAdmin: true })
    const senderIterator = ctx.db
      .query('sender_identities')
      .withIndex('by_user', q => q.eq('user_id', args.userId))
      .order('asc')

    const results = []
    for await (const doc of senderIterator) {
      results.push(doc)
    }

    return results
  }
})

export const create = mutation({
  args: {
    userId: v.string(),
    ...authFields,
    name: v.string(),
    address: v.string(),
    verified: v.optional(v.boolean()),
    createdAt: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await ensureUserAuthorization(args)
    const address = args.address.trim().toLowerCase()

    const existingByAddress = await ctx.db
      .query('sender_identities')
      .withIndex('by_address', q => q.eq('address', address))
      .unique()

    if (existingByAddress) {
      throw new Error('Sender address already exists')
    }

    const now = args.createdAt ?? new Date().toISOString()
    const id = await ctx.db.insert('sender_identities', {
      user_id: args.userId,
      name: args.name.trim(),
      address,
      verified: args.verified ?? true,
      created_at: now
    })

    // mirror mailbox entry for inbound routing
    const mailbox = await ctx.db
      .query('mailboxes')
      .withIndex('by_address', q => q.eq('address', address))
      .unique()

    if (!mailbox) {
      await ctx.db.insert('mailboxes', {
        user_id: args.userId,
        address,
        created_at: now
      })
    }

    return id
  }
})

export const remove = mutation({
  args: {
    id: v.id('sender_identities'),
    userId: v.optional(v.string()),
    ...authFields
  },
  handler: async (ctx, args) => {
    const userId = await ensureUserAuthorization(
      {
        sessionToken: args.sessionToken,
        adminSecret: args.adminSecret,
        userId: args.userId
      },
      { allowAdmin: true }
    )
    const sender = await ctx.db.get(args.id)
    if (!sender) return

    if (!args.adminSecret && sender.user_id !== userId) {
      throw new Error('Forbidden')
    }

    await ctx.db.delete(args.id)

    const mailbox = await ctx.db
      .query('mailboxes')
      .withIndex('by_address', q => q.eq('address', sender.address))
      .unique()

    if (mailbox?._id) {
      await ctx.db.delete(mailbox._id)
    }
  }
})

export const findByAddresses = query({
  args: { addresses: v.array(v.string()), ...authFields },
  handler: async (ctx, args) => {
    requireAdminAccess(args)
    const normalized = args.addresses.map(address =>
      address.trim().toLowerCase()
    )
    const matches = []

    for (const address of normalized) {
      const doc = await ctx.db
        .query('sender_identities')
        .withIndex('by_address', q => q.eq('address', address))
        .unique()

      if (doc) {
        matches.push(doc)
      }
    }

    return matches
  }
})
