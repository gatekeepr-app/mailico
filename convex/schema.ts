import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  companySettings: defineTable({
    key: v.literal("primary"),
    domain: v.string(),
    ownerAuthUserId: v.string(),
    ownerEmail: v.string(),
    ownerAddress: v.string(),
    resendStatus: v.union(
      v.literal("not_checked"),
      v.literal("missing_key"),
      v.literal("invalid_key"),
      v.literal("domain_missing"),
      v.literal("pending"),
      v.literal("partially_verified"),
      v.literal("failed"),
      v.literal("verified"),
    ),
    resendCheckedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  departments: defineTable({
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  userProfiles: defineTable({
    authUserId: v.string(),
    accountEmail: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("chief"),
      v.literal("hrLead"),
      v.literal("hr"),
      v.literal("user"),
    ),
    departmentId: v.optional(v.id("departments")),
    assignedEmail: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user", ["authUserId"])
    .index("by_assigned_email", ["assignedEmail"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_department", ["departmentId"]),

  messages: defineTable({
    resendId: v.optional(v.string()),
    senderUserId: v.string(),
    fromEmail: v.string(),
    fromName: v.string(),
    to: v.array(v.string()),
    cc: v.array(v.string()),
    bcc: v.array(v.string()),
    subject: v.string(),
    body: v.string(),
    status: v.union(v.literal("sent"), v.literal("received"), v.literal("failed")),
    idempotencyKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_sender", ["senderUserId"])
    .index("by_sender_createdAt", ["senderUserId", "createdAt"])
    .index("by_from_email", ["fromEmail"])
    .index("by_createdAt", ["createdAt"])
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  mailboxEntries: defineTable({
    ownerKey: v.string(),
    messageId: v.id("messages"),
    folder: v.union(v.literal("inbox"), v.literal("sent")),
    recipientKind: v.optional(
      v.union(v.literal("to"), v.literal("cc"), v.literal("bcc")),
    ),
    fromEmail: v.string(),
    fromName: v.string(),
    to: v.array(v.string()),
    cc: v.array(v.string()),
    subject: v.string(),
    bodyPreview: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner_folder_createdAt", ["ownerKey", "folder", "createdAt"])
    .index("by_message", ["messageId"]),

  mailboxStates: defineTable({
    ownerUserId: v.string(),
    messageId: v.id("messages"),
    starred: v.boolean(),
    read: v.boolean(),
    trashed: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_owner_message", ["ownerUserId", "messageId"])
    .index("by_owner_starred_updatedAt", ["ownerUserId", "starred", "updatedAt"])
    .index("by_owner_trashed_updatedAt", ["ownerUserId", "trashed", "updatedAt"]),

  sendRateLimits: defineTable({
    authUserId: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_auth_user", ["authUserId"]),

  emailAddressRequests: defineTable({
    authUserId: v.string(),
    requestedEmail: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
    updatedAt: v.number(),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_auth_user_createdAt", ["authUserId", "createdAt"])
    .index("by_status_createdAt", ["status", "createdAt"]),

  drafts: defineTable({
    draftKey: v.string(),
    ownerUserId: v.string(),
    fromEmail: v.string(),
    to: v.array(v.string()),
    cc: v.array(v.string()),
    bcc: v.array(v.string()),
    subject: v.string(),
    body: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_updatedAt", ["ownerUserId", "updatedAt"])
    .index("by_owner_draftKey", ["ownerUserId", "draftKey"]),
});
