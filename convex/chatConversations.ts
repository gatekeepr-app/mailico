import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { authFields, requireAdminAccess } from './identity'

export const getOrCreateByExternal = mutation({
  args: {
    user_id: v.string(),
    channel: v.string(),
    external_conversation_id: v.string(),
    external_user_id: v.optional(v.string()),
    created_at: v.optional(v.string()),
    last_message_at: v.optional(v.string()),
    ...authFields
  },
  handler: async (ctx, args) => {
    requireAdminAccess(args)
    const existing = await ctx.db
      .query('chat_conversations')
      .withIndex('by_user_channel_external', q =>
        q
          .eq('user_id', args.user_id)
          .eq('channel', args.channel)
          .eq('external_conversation_id', args.external_conversation_id)
      )
      .unique()

    if (existing?._id) {
      const next: Record<string, any> = {}
      if (args.external_user_id && !existing.external_user_id) {
        next.external_user_id = args.external_user_id
      }
      if (args.last_message_at) {
        next.last_message_at = args.last_message_at
      }
      if (Object.keys(next).length > 0) {
        await ctx.db.patch(existing._id, next)
      }
      return existing._id
    }

    return await ctx.db.insert('chat_conversations', {
      user_id: args.user_id,
      channel: args.channel,
      external_conversation_id: args.external_conversation_id,
      external_user_id: args.external_user_id,
      created_at: args.created_at ?? new Date().toISOString(),
      last_message_at: args.last_message_at
    })
  }
})
