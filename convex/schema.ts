import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  profiles: defineTable({
    user_id: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    domain: v.optional(v.string()),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    avatar: v.optional(v.string()),
    resend_api_key: v.optional(v.string()),
    sms_user: v.optional(v.string()),
    sms_password: v.optional(v.string()),
    sms_creds_updated_at: v.optional(v.string()),
    sms_sender_name: v.optional(v.string()),
    sms_sender_type: v.optional(v.string()),
    sms_balance_checked_at: v.optional(v.string()),
    plan: v.optional(v.string()),
    plan_name: v.optional(v.string()),
    webhook_secret: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string())
  })
    .index('by_user', ['user_id'])
    .index('by_domain', ['domain']),

  sender_identities: defineTable({
    user_id: v.string(),
    name: v.string(),
    address: v.string(),
    verified: v.boolean(),
    created_at: v.optional(v.string())
  })
    .index('by_user', ['user_id'])
    .index('by_address', ['address']),

  emails: defineTable({
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
  })
    .index('by_user_direction', ['user_id', 'direction'])
    .index('by_user_created', ['user_id', 'created_at'])
    .index('by_legacy', ['legacy_id']),

  usage_metrics: defineTable({
    user_id: v.string(),
    emails_sent: v.number(),
    updated_at: v.optional(v.string())
  }).index('by_user', ['user_id']),

  sms_messages: defineTable({
    user_id: v.string(),
    direction: v.string(),
    to: v.string(),
    text: v.string(),
    mode: v.string(),
    purpose: v.string(),
    status: v.optional(v.string()),
    provider_response: v.optional(v.string()),
    created_at: v.optional(v.string())
  })
    .index('by_user_created', ['user_id', 'created_at'])
    .index('by_user_direction', ['user_id', 'direction']),

  mailboxes: defineTable({
    user_id: v.string(),
    address: v.string(),
    created_at: v.optional(v.string())
  })
    .index('by_user', ['user_id'])
    .index('by_address', ['address']),

  chat_conversations: defineTable({
    user_id: v.string(),
    channel: v.string(),
    external_conversation_id: v.string(),
    external_user_id: v.optional(v.string()),
    created_at: v.optional(v.string()),
    last_message_at: v.optional(v.string())
  })
    .index('by_user', ['user_id'])
    .index('by_user_channel_external', [
      'user_id',
      'channel',
      'external_conversation_id'
    ]),

  chat_messages: defineTable({
    user_id: v.string(),
    conversation_id: v.string(),
    channel: v.string(),
    external_message_id: v.optional(v.string()),
    external_user_id: v.optional(v.string()),
    text: v.optional(v.string()),
    raw: v.optional(v.any()),
    created_at: v.optional(v.string())
  })
    .index('by_user', ['user_id'])
    .index('by_conversation', ['conversation_id']),

  chat_integrations: defineTable({
    integration_id: v.string(),
    user_id: v.string(),
    channel: v.string(),
    signing_secret: v.string(),
    external_team_id: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string())
  })
    .index('by_integration', ['integration_id'])
    .index('by_user', ['user_id']),

  orders: defineTable({
    order_id: v.string(),
    user_id: v.string(),
    plan: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    payment_status: v.string(),
    customer_name: v.optional(v.string()),
    customer_email: v.optional(v.string()),
    customer_phone: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string())
  })
    .index('by_order_id', ['order_id'])
    .index('by_user', ['user_id']),

  payments: defineTable({
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
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string())
  })
    .index('by_order_id', ['order_id'])
    .index('by_invoice_id', ['invoice_id'])
})
