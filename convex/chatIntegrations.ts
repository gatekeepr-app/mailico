import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  authFields,
  ensureUserAuthorization,
  requireAdminAccess
} from './identity'

export const getByIntegrationId = query({
  args: { integration_id: v.string(), ...authFields },
  handler: async (ctx, args) => {
    requireAdminAccess(args)
    return await ctx.db
      .query('chat_integrations')
      .withIndex('by_integration', q =>
        q.eq('integration_id', args.integration_id)
      )
      .unique()
  }
})

export const createForUser = mutation({
  args: {
    user_id: v.string(),
    integration_id: v.string(),
    channel: v.string(),
    signing_secret: v.string(),
    external_team_id: v.optional(v.string()),
    created_at: v.optional(v.string()),
    ...authFields
  },
  handler: async (ctx, args) => {
    await ensureUserAuthorization({
      sessionToken: args.sessionToken,
      adminSecret: args.adminSecret,
      userId: args.user_id
    })

    return await ctx.db.insert('chat_integrations', {
      integration_id: args.integration_id,
      user_id: args.user_id,
      channel: args.channel,
      signing_secret: args.signing_secret,
      external_team_id: args.external_team_id,
      created_at: args.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }
})

export const setExternalTeamId = mutation({
  args: {
    integration_id: v.string(),
    external_team_id: v.string(),
    ...authFields
  },
  handler: async (ctx, args) => {
    requireAdminAccess(args)
    const integration = await ctx.db
      .query('chat_integrations')
      .withIndex('by_integration', q =>
        q.eq('integration_id', args.integration_id)
      )
      .unique()

    if (!integration?._id) return null

    await ctx.db.patch(integration._id, {
      external_team_id: args.external_team_id,
      updated_at: new Date().toISOString()
    })
    return integration._id
  }
})
