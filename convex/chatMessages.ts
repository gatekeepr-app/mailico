import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { authFields, requireAdminAccess } from './identity'

export const create = mutation({
  args: {
    user_id: v.string(),
    conversation_id: v.string(),
    channel: v.string(),
    external_message_id: v.optional(v.string()),
    external_user_id: v.optional(v.string()),
    text: v.optional(v.string()),
    raw: v.optional(v.any()),
    created_at: v.optional(v.string()),
    ...authFields
  },
  handler: async (ctx, args) => {
    requireAdminAccess(args)
    return await ctx.db.insert('chat_messages', {
      user_id: args.user_id,
      conversation_id: args.conversation_id,
      channel: args.channel,
      external_message_id: args.external_message_id,
      external_user_id: args.external_user_id,
      text: args.text,
      raw: args.raw,
      created_at: args.created_at ?? new Date().toISOString()
    })
  }
})
