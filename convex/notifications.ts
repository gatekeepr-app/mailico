import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { authComponent } from "./auth";

function validateEndpoint(endpoint: string) {
  if (endpoint.length > 2048) throw new ConvexError("Invalid push endpoint.");
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new ConvexError("Invalid push endpoint.");
  }
  const allowedHost = parsed.hostname === "fcm.googleapis.com" ||
    parsed.hostname === "web.push.apple.com" ||
    parsed.hostname === "push.services.mozilla.com" ||
    parsed.hostname === "notify.windows.com" ||
    parsed.hostname.endsWith(".push.services.mozilla.com") ||
    parsed.hostname.endsWith(".notify.windows.com") ||
    parsed.hostname === "push.services.opera.com" ||
    parsed.hostname.endsWith(".push.services.opera.com");
  if (parsed.protocol !== "https:" || !allowedHost || parsed.username || parsed.password ||
    (parsed.port && parsed.port !== "443")) {
    throw new ConvexError("Unsupported push service endpoint.");
  }
}

export const saveSubscription = mutation({
  args: {
    endpoint: v.string(),
    keys: v.object({ p256dh: v.string(), auth: v.string() }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", user._id))
      .unique();
    if (!profile) throw new ConvexError("Set up your Mailico profile before enabling notifications.");
    validateEndpoint(args.endpoint);
    if (args.keys.p256dh.length > 512 || args.keys.auth.length > 512 ||
      !/^[A-Za-z0-9_-]+$/.test(args.keys.p256dh) || !/^[A-Za-z0-9_-]+$/.test(args.keys.auth)) {
      throw new ConvexError("Invalid push subscription keys.");
    }

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (existing && existing.authUserId !== String(user._id)) {
      throw new ConvexError("This device is already linked to another account.");
    }
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        p256dh: args.keys.p256dh,
        auth: args.keys.auth,
        updatedAt: now,
      });
    } else {
      const currentSubscriptions = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_auth_user", (q) => q.eq("authUserId", String(user._id)))
        .take(20);
      if (currentSubscriptions.length >= 20) {
        throw new ConvexError("This account has reached its device notification limit.");
      }
      await ctx.db.insert("pushSubscriptions", {
        authUserId: String(user._id),
        endpoint: args.endpoint,
        p256dh: args.keys.p256dh,
        auth: args.keys.auth,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const removeSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    validateEndpoint(args.endpoint);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (existing?.authUserId === String(user._id)) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const removeExpired = internalMutation({
  args: { endpoints: v.array(v.string()) },
  handler: async (ctx, args) => {
    for (const endpoint of [...new Set(args.endpoints)].slice(0, 200)) {
      const existing = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
        .unique();
      if (existing) await ctx.db.delete(existing._id);
    }
  },
});
