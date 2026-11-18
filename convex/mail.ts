import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent } from "./auth";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;
const SEND_LIMIT_PER_HOUR = 30;
const SEND_WINDOW_MS = 60 * 60 * 1000;

async function getProfile(ctx: Ctx, authUserId: string) {
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
    .unique();
}

async function requireActiveProfile(ctx: Ctx, authUserId: string) {
  const profile = await getProfile(ctx, authUserId);
  if (!profile || profile.deactivatedAt) {
    throw new ConvexError("Workspace access has been removed or the employee profile is unavailable.");
  }
  return profile;
}

async function getCompanySettings(ctx: Ctx) {
  return await ctx.db
    .query("companySettings")
    .withIndex("by_key", (q) => q.eq("key", "primary"))
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

function inboxOwnerEmails(profile: Doc<"userProfiles">) {
  return uniqueLowercase([profile.accountEmail, profile.assignedEmail ?? ""]);
}

function uniqueLowercase(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function preview(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 240);
}

function validateEmailList(values: string[]) {
  if (values.length > 50 || values.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
    throw new ConvexError("Recipients must contain at most 50 valid email addresses.");
  }
}

async function getMailboxState(ctx: Ctx, ownerUserId: string, messageId: Id<"messages">) {
  return await ctx.db
    .query("mailboxStates")
    .withIndex("by_owner_message", (q) =>
      q.eq("ownerUserId", ownerUserId).eq("messageId", messageId),
    )
    .unique();
}

async function attachMailboxState<T extends { messageId: Id<"messages">; folder: string }>(
  ctx: Ctx,
  ownerUserId: string,
  entries: T[],
) {
  return await Promise.all(entries.map(async (entry) => {
    const state = await getMailboxState(ctx, ownerUserId, entry.messageId);
    return {
      ...entry,
      starred: state?.starred ?? false,
      read: state?.read ?? entry.folder !== "inbox",
      trashed: state?.trashed ?? false,
    };
  }));
}

async function requireVisibleMessage(
  ctx: Ctx,
  messageId: Id<"messages">,
  user: { _id: string },
  profile: Doc<"userProfiles">,
) {
  const message = await ctx.db.get(messageId);
  if (!message) throw new ConvexError("Message not found.");
  const settings = await getCompanySettings(ctx);
  const isAdmin = profile.role === "admin" &&
    (!settings || settings.ownerAuthUserId === user._id);
  if (isAdmin || message.senderUserId === user._id) return message;
  if (profile.role === "hrLead" && profile.departmentId) {
    const senderProfile = await getProfile(ctx, message.senderUserId);
    if (senderProfile?.departmentId === profile.departmentId) return message;
  }
  const ownerKeys = inboxOwnerEmails(profile).map(emailKey);

  const entry = await ctx.db
    .query("mailboxEntries")
    .withIndex("by_message", (q) => q.eq("messageId", messageId))
    .filter((q) =>
      q.or(...ownerKeys.map((ownerKey) => q.eq(q.field("ownerKey"), ownerKey))),
    )
    .first();
  if (!entry) throw new ConvexError("Message not found.");
  return message;
}

export const listMailboxEntries = query({
  args: {
    folder: v.union(
      v.literal("inbox"),
      v.literal("sent"),
      v.literal("starred"),
      v.literal("trash"),
      v.literal("department_sent"),
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?._id) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const profile = await getProfile(ctx, user._id);
    if (!profile || profile.deactivatedAt) return { page: [], isDone: true, continueCursor: "" };

    const settings = await getCompanySettings(ctx);
    const isAdmin = profile.role === "admin" &&
      (!settings || settings.ownerAuthUserId === user._id);

    if (args.folder === "department_sent") {
      if (profile.role !== "hrLead" || !profile.departmentId) {
        throw new ConvexError("Department sent mail is available only to an assigned department HR Lead.");
      }
      const result = await ctx.db.query("mailboxEntries")
        .withIndex("by_owner_folder_createdAt", (q) =>
          q.eq("ownerKey", `department:${profile.departmentId}`).eq("folder", "sent"),
        )
        .order("desc")
        .paginate(args.paginationOpts);
      const activeDepartmentEntries = (await Promise.all(result.page.map(async (entry) => {
        const message = await ctx.db.get(entry.messageId);
        if (!message) return null;
        const senderProfile = await getProfile(ctx, message.senderUserId);
        return senderProfile?.departmentId === profile.departmentId ? entry : null;
      }))).filter((entry) => entry !== null);
      const visible = await attachMailboxState(ctx, user._id, activeDepartmentEntries);
      return {
        ...result,
        page: visible.filter((entry) => !entry.trashed).map((entry) => ({
          ...entry,
          folder: "department_sent" as const,
        })),
      };
    }

    if (args.folder === "starred" || args.folder === "trash") {
      const statePage = args.folder === "starred"
        ? await ctx.db
            .query("mailboxStates")
            .withIndex("by_owner_starred_updatedAt", (q) =>
              q.eq("ownerUserId", user._id).eq("starred", true),
            )
            .filter((q) => q.eq(q.field("trashed"), false))
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("mailboxStates")
            .withIndex("by_owner_trashed_updatedAt", (q) =>
              q.eq("ownerUserId", user._id).eq("trashed", true),
            )
            .order("desc")
            .paginate(args.paginationOpts);
      const page = await Promise.all(statePage.page.map(async (state) => {
        const message = await requireVisibleMessage(ctx, state.messageId, user, profile);
        return {
          messageId: message._id,
          fromEmail: message.fromEmail,
          fromName: message.fromName,
          to: message.to,
          cc: message.cc,
          subject: message.subject,
          bodyPreview: preview(message.body),
          createdAt: message.createdAt,
          ownerKey: userKey(user._id),
          folder: args.folder,
          starred: state.starred,
          read: state.read,
        };
      }));
      return { ...statePage, page };
    }

    if (isAdmin && args.folder === "sent") {
      const page = await ctx.db
        .query("messages")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "sent"))
        .order("desc")
        .paginate(args.paginationOpts);
      const entries = page.page.map((message) => ({
        messageId: message._id,
        fromEmail: message.fromEmail,
        fromName: message.fromName,
        to: message.to,
        cc: message.cc,
        subject: message.subject,
        bodyPreview: preview(message.body),
        createdAt: message.createdAt,
        ownerKey: adminKey(),
        folder: "sent" as const,
      }));
      const withState = await attachMailboxState(ctx, user._id, entries);
      const visible = withState.filter((entry) => !entry.trashed);
      return {
        ...page,
        page: visible,
      };
    }

    if (args.folder === "inbox") {
      const offset = args.paginationOpts.cursor
        ? Number.parseInt(args.paginationOpts.cursor, 10)
        : 0;
      const start = Number.isFinite(offset) ? offset : 0;
      const ownerKeys = isAdmin
        ? [adminKey()]
        : inboxOwnerEmails(profile).map(emailKey);
      const pages = await Promise.all(
        ownerKeys.map((key) =>
          ctx.db
            .query("mailboxEntries")
            .withIndex("by_owner_folder_createdAt", (q) =>
              q.eq("ownerKey", key).eq("folder", "inbox"),
            )
            .order("desc")
            .take(start + args.paginationOpts.numItems + 1),
        ),
      );
      const seen = new Set<string>();
      const merged = pages
        .flat()
        .filter((entry) => {
          const key = String(entry.messageId);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => b.createdAt - a.createdAt);
      const rawPage = merged.slice(start, start + args.paginationOpts.numItems);
      const visible = await attachMailboxState(ctx, user._id, rawPage);
      const page = visible.filter((entry) => entry.trashed !== true);
      const nextOffset = start + rawPage.length;

      return {
        page,
        isDone: nextOffset >= merged.length,
        continueCursor: String(nextOffset),
      };
    }

    if (args.folder !== "sent") {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const ownerKey = userKey(user._id);
    const result = await ctx.db
      .query("mailboxEntries")
      .withIndex("by_owner_folder_createdAt", (q) =>
        q.eq("ownerKey", ownerKey).eq("folder", "sent"),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    const visible = await attachMailboxState(ctx, user._id, result.page);
    const withoutTrash = visible.filter((entry) => entry.trashed !== true);
    return { ...result, page: withoutTrash };
  },
});

export const getMessageByIdempotencyKey = query({
  args: {
    idempotencyKey: v.string(),
    to: v.array(v.string()),
    cc: v.array(v.string()),
    bcc: v.array(v.string()),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?._id) return null;
    const profile = await getProfile(ctx, user._id);
    if (!profile || profile.deactivatedAt) return null;
    const message = await ctx.db
      .query("messages")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (!message || message.senderUserId !== user._id) return null;
    const matches = (stored: string[], requested: string[]) =>
      JSON.stringify(uniqueLowercase(stored)) === JSON.stringify(uniqueLowercase(requested));
    if (
      !matches(message.to, args.to) ||
      !matches(message.cc, args.cc) ||
      !matches(message.bcc, args.bcc) ||
      message.subject !== args.subject ||
      message.body !== args.body
    ) {
      return { conflict: true as const };
    }
    return { id: message._id, resendId: message.resendId };
  },
});

export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const profile = await requireActiveProfile(ctx, user._id);
    const message = await requireVisibleMessage(ctx, args.messageId, user, profile);
    const settings = await getCompanySettings(ctx);
    const isAdmin = profile.role === "admin" &&
      (!settings || settings.ownerAuthUserId === user._id);
    return {
      ...message,
      bcc: isAdmin || message.senderUserId === user._id ? message.bcc : [],
    };
  },
});

export const setMailboxState = mutation({
  args: {
    messageId: v.id("messages"),
    field: v.union(v.literal("starred"), v.literal("read"), v.literal("trashed")),
    value: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const profile = await requireActiveProfile(ctx, user._id);
    const message = await requireVisibleMessage(ctx, args.messageId, user, profile);

    const existing = await getMailboxState(ctx, user._id, args.messageId);
    const state = {
      ownerUserId: user._id,
      messageId: args.messageId,
      starred: existing?.starred ?? false,
      read: existing?.read ?? message.senderUserId === user._id,
      trashed: existing?.trashed ?? false,
      updatedAt: Date.now(),
    };
    state[args.field] = args.value;

    if (existing) await ctx.db.patch(existing._id, state);
    else await ctx.db.insert("mailboxStates", state);
  },
});

export const consumeSendQuota = internalMutation({
  args: { authUserId: v.string() },
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx, args.authUserId);
    if (!profile.assignedEmail) {
      throw new ConvexError("No company email is assigned to this user.");
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("sendRateLimits")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", args.authUserId))
      .unique();
    if (existing && now - existing.windowStart < SEND_WINDOW_MS) {
      if (existing.count >= SEND_LIMIT_PER_HOUR) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((existing.windowStart + SEND_WINDOW_MS - now) / 1000),
        };
      }
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else if (existing) {
      await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    } else {
      await ctx.db.insert("sendRateLimits", {
        authUserId: args.authUserId,
        windowStart: now,
        count: 1,
      });
    }
    return { allowed: true, retryAfterSeconds: 0 };
  },
});

export const recordSentMessage = internalMutation({
  args: {
    authUserId: v.string(),
    resendId: v.optional(v.string()),
    idempotencyKey: v.string(),
    to: v.array(v.string()),
    cc: v.array(v.string()),
    bcc: v.array(v.string()),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx, args.authUserId);
    const settings = await getCompanySettings(ctx);
    if (!profile.assignedEmail) {
      throw new ConvexError("No company email is assigned to this user.");
    }
    if (!settings || !profile.assignedEmail.toLowerCase().endsWith(`@${settings.domain}`)) {
      throw new ConvexError("Assigned sender must use the configured company domain.");
    }
    validateEmailList(args.to);
    validateEmailList(args.cc);
    validateEmailList(args.bcc);
    if (args.to.length === 0 || args.to.length + args.cc.length + args.bcc.length > 50) {
      throw new ConvexError("At least one To recipient is required; 50 total recipients are allowed.");
    }
    if (args.subject.length > 998 || args.body.length > 100_000) {
      throw new ConvexError("Subject or message body is too long.");
    }
    if (!args.idempotencyKey || args.idempotencyKey.length > 256) {
      throw new ConvexError("A valid send operation ID is required.");
    }

    const existing = await ctx.db
      .query("messages")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (existing) {
      if (existing.senderUserId !== args.authUserId) {
        throw new ConvexError("Idempotency key has already been used.");
      }
      const matches = (stored: string[], requested: string[]) =>
        JSON.stringify(uniqueLowercase(stored)) === JSON.stringify(uniqueLowercase(requested));
      if (
        !matches(existing.to, args.to) ||
        !matches(existing.cc, args.cc) ||
        !matches(existing.bcc, args.bcc) ||
        existing.subject !== args.subject ||
        existing.body !== args.body
      ) {
        throw new ConvexError("Idempotency key has already been used for different content.");
      }
      return existing._id;
    }

    const now = Date.now();
    const to = uniqueLowercase(args.to);
    const cc = uniqueLowercase(args.cc);
    const bcc = uniqueLowercase(args.bcc);
    const fromEmail = profile.assignedEmail.toLowerCase();
    const fromName = profile.name || fromEmail;
    const bodyPreview = preview(args.body);

    const messageId = await ctx.db.insert("messages", {
      resendId: args.resendId,
      idempotencyKey: args.idempotencyKey,
      senderUserId: args.authUserId,
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
      ownerKey: userKey(args.authUserId),
      folder: "sent",
      ...listFields,
    });

    await ctx.db.insert("mailboxEntries", {
      ownerKey: adminKey(),
      folder: "inbox",
      ...listFields,
    });

    if (profile.departmentId) {
      await ctx.db.insert("mailboxEntries", {
        ownerKey: `department:${profile.departmentId}`,
        folder: "sent",
        ...listFields,
      });
    }

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

export const recordInboundMessage = internalMutation({
  args: {
    resendId: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    fromEmail: v.string(),
    fromName: v.optional(v.string()),
    to: v.array(v.string()),
    cc: v.array(v.string()),
    bcc: v.array(v.string()),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("messages")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey!))
        .unique();
      if (existing) return existing._id;
    }

    validateEmailList([args.fromEmail]);
    validateEmailList(args.to);
    validateEmailList(args.cc);
    validateEmailList(args.bcc);
    if (args.to.length + args.cc.length + args.bcc.length === 0 ||
      args.to.length + args.cc.length + args.bcc.length > 50) {
      throw new ConvexError("Inbound mail must have 1 to 50 valid recipients.");
    }
    if (args.subject.length > 998 || args.body.length > 100_000) {
      throw new ConvexError("Inbound subject or body is too long.");
    }

    const now = Date.now();
    const fromEmail = args.fromEmail.trim().toLowerCase();
    const fromName = args.fromName?.trim() || fromEmail;
    const to = uniqueLowercase(args.to);
    const cc = uniqueLowercase(args.cc);
    const bcc = uniqueLowercase(args.bcc);
    const subject = args.subject.trim() || "(no subject)";
    const bodyPreview = preview(args.body);

    const messageId = await ctx.db.insert("messages", {
      resendId: args.resendId,
      idempotencyKey: args.idempotencyKey,
      senderUserId: "inbound",
      fromEmail,
      fromName,
      to,
      cc,
      bcc,
      subject,
      body: args.body,
      status: "received",
      createdAt: now,
    });

    const listFields = {
      messageId,
      fromEmail,
      fromName,
      to,
      cc,
      subject,
      bodyPreview,
      createdAt: now,
    };

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

    const settings = await getCompanySettings(ctx);
    const recipientEmails = uniqueLowercase([...to, ...cc, ...bcc]);
    const recipientUserIds = new Set<string>();
    if (settings?.ownerAuthUserId) recipientUserIds.add(settings.ownerAuthUserId);

    for (const email of recipientEmails) {
      const [assignedProfiles, accountProfiles] = await Promise.all([
        ctx.db.query("userProfiles")
          .withIndex("by_assigned_email", (q) => q.eq("assignedEmail", email))
          .take(25),
        ctx.db.query("userProfiles")
          .withIndex("by_account_email_normalized", (q) => q.eq("accountEmailNormalized", email))
          .take(25),
      ]);
      for (const profile of [...assignedProfiles, ...accountProfiles]) {
        recipientUserIds.add(profile.authUserId);
      }
    }

    const subscriptions = (await Promise.all(
      [...recipientUserIds].map((authUserId) =>
        ctx.db.query("pushSubscriptions")
          .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
          .take(20),
      ),
    )).flat().slice(0, 100).map(({ endpoint, p256dh, auth }) => ({
      endpoint,
      keys: { p256dh, auth },
    }));

    if (subscriptions.length && process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
      await ctx.scheduler.runAfter(0, internal.push.sendNewMail, { subscriptions });
    }

    return messageId;
  },
});

export const listDrafts = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?._id) return [];
    const profile = await getProfile(ctx, user._id);
    if (!profile || profile.deactivatedAt) return [];

    return await ctx.db
      .query("drafts")
      .withIndex("by_owner_updatedAt", (q) => q.eq("ownerUserId", user._id))
      .order("desc")
      .take(100);
  },
});

export const upsertDraft = mutation({
  args: {
    draftKey: v.string(),
    fromEmail: v.string(),
    to: v.array(v.string()),
    cc: v.array(v.string()),
    bcc: v.array(v.string()),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    await requireActiveProfile(ctx, user._id);
    const now = Date.now();
    const existing = await ctx.db
      .query("drafts")
      .withIndex("by_owner_draftKey", (q) =>
        q.eq("ownerUserId", user._id).eq("draftKey", args.draftKey),
      )
      .unique();

    const patch = {
      fromEmail: args.fromEmail,
      to: uniqueLowercase(args.to),
      cc: uniqueLowercase(args.cc),
      bcc: uniqueLowercase(args.bcc),
      subject: args.subject,
      body: args.body,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("drafts", {
      draftKey: args.draftKey,
      ownerUserId: user._id,
      createdAt: now,
      ...patch,
    });
  },
});

export const deleteDraft = mutation({
  args: { draftKey: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    await requireActiveProfile(ctx, user._id);
    const existing = await ctx.db
      .query("drafts")
      .withIndex("by_owner_draftKey", (q) =>
        q.eq("ownerUserId", user._id).eq("draftKey", args.draftKey),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
