import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

async function getProfile(ctx: Ctx, authUserId: string) {
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
    .unique();
}

function emailKey(email: string) {
  return `email:${email.toLowerCase()}`;
}

function userKey(authUserId: string) {
  return `user:${authUserId}`;
}

function adminKey() {
  return "admin:all";
}

function uniqueLowercase(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function preview(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 240);
}

async function requireVisibleMessage(
  ctx: Ctx,
  messageId: Id<"messages">,
  user: { _id: string },
  profile: Doc<"userProfiles">,
) {
  const message = await ctx.db.get(messageId);
  if (!message) throw new ConvexError("Message not found.");
  if (profile.role === "admin" || message.senderUserId === user._id) return message;
  if (!profile.assignedEmail) throw new ConvexError("Message not found.");

  const entry = await ctx.db
    .query("mailboxEntries")
    .withIndex("by_message", (q) => q.eq("messageId", messageId))
    .filter((q) => q.eq(q.field("ownerKey"), emailKey(profile.assignedEmail!)))
    .first();
  if (!entry) throw new ConvexError("Message not found.");
  return message;
}

export const listMailboxEntries = query({
  args: {
    folder: v.union(v.literal("inbox"), v.literal("sent")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?._id) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const profile = await getProfile(ctx, user._id);
    if (!profile) return { page: [], isDone: true, continueCursor: "" };

    if (profile.role === "admin" && args.folder === "inbox") {
      return await ctx.db
        .query("mailboxEntries")
        .withIndex("by_owner_folder_createdAt", (q) =>
          q.eq("ownerKey", adminKey()).eq("folder", "inbox"),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    const ownerKey =
      args.folder === "sent"
        ? userKey(user._id)
        : profile.assignedEmail
          ? emailKey(profile.assignedEmail)
          : null;

    if (!ownerKey) return { page: [], isDone: true, continueCursor: "" };

    return await ctx.db
      .query("mailboxEntries")
      .withIndex("by_owner_folder_createdAt", (q) =>
        q.eq("ownerKey", ownerKey).eq("folder", args.folder),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getMessageByIdempotencyKey = query({
  args: { idempotencyKey: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?._id) return null;
    const message = await ctx.db
      .query("messages")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (!message || message.senderUserId !== user._id) return null;
    return { id: message._id, resendId: message.resendId };
  },
});

export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const profile = await getProfile(ctx, user._id);
    if (!profile) throw new ConvexError("Profile not found.");
    const message = await requireVisibleMessage(ctx, args.messageId, user, profile);
    return {
      ...message,
      bcc: profile.role === "admin" || message.senderUserId === user._id ? message.bcc : [],
    };
  },
});

export const recordSentMessage = mutation({
  args: {
    resendId: v.optional(v.string()),
    idempotencyKey: v.string(),
    to: v.array(v.string()),
    cc: v.array(v.string()),
    bcc: v.array(v.string()),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const profile = await getProfile(ctx, user._id);
    if (!profile?.assignedEmail) {
      throw new ConvexError("No company email is assigned to this user.");
    }

    const existing = await ctx.db
      .query("messages")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (existing) return existing._id;

    const now = Date.now();
    const to = uniqueLowercase(args.to);
    const cc = uniqueLowercase(args.cc);
    const bcc = uniqueLowercase(args.bcc);
    const fromEmail = profile.assignedEmail.toLowerCase();
    const fromName = profile.name || user.name || fromEmail;
    const bodyPreview = preview(args.body);

    const messageId = await ctx.db.insert("messages", {
      resendId: args.resendId,
      idempotencyKey: args.idempotencyKey,
      senderUserId: user._id,
      fromEmail,
      fromName,
      to,
      cc,
      bcc,
      subject: args.subject,
      body: args.body,
      status: "sent",
      createdAt: now,
    });

    const listFields = {
      messageId,
      fromEmail,
      fromName,
      to,
      cc,
      subject: args.subject,
      bodyPreview,
      createdAt: now,
    };

    await ctx.db.insert("mailboxEntries", {
      ownerKey: userKey(user._id),
      folder: "sent",
      ...listFields,
    });

    await ctx.db.insert("mailboxEntries", {
      ownerKey: adminKey(),
      folder: "inbox",
      ...listFields,
    });

    for (const [kind, recipients] of [
      ["to", to],
      ["cc", cc],
      ["bcc", bcc],
    ] as const) {
      for (const email of recipients) {
        await ctx.db.insert("mailboxEntries", {
          ownerKey: emailKey(email),
          folder: "inbox",
          recipientKind: kind,
          ...listFields,
        });
      }
    }

    return messageId;
  },
});
