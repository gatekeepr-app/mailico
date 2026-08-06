import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  departments: defineTable({
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  userProfiles: defineTable({
    authUserId: v.string(),
    accountEmail: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("hr"), v.literal("user")),
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
    status: v.union(v.literal("sent"), v.literal("failed")),
    idempotencyKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_sender", ["senderUserId"])
    .index("by_sender_createdAt", ["senderUserId", "createdAt"])
    .index("by_from_email", ["fromEmail"])
    .index("by_createdAt", ["createdAt"])
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
});
