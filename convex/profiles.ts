import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const MAIL_DOMAIN = "mail.darvizlabs.online";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeAssignedEmail(localOrEmail: string) {
  const value = localOrEmail.trim().toLowerCase();
  const local = value.includes("@") ? value.split("@")[0] : value;
  if (!/^[a-z0-9._-]+$/.test(local)) {
    throw new ConvexError("Email local part can only use letters, numbers, dots, underscores, and hyphens.");
  }
  return `${local}@${MAIL_DOMAIN}`;
}

function isConfiguredAdmin(email: string) {
  const configured = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(email.toLowerCase());
}

type Ctx = QueryCtx | MutationCtx;

async function requireAuth(ctx: Ctx) {
  const user = await authComponent.getAuthUser(ctx);
  if (!user?._id) throw new ConvexError("Not authenticated.");
  return user;
}

async function getProfileByAuthUserId(ctx: Ctx, authUserId: string) {
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
    .unique();
}

async function requireStaff(ctx: Ctx) {
  const user = await requireAuth(ctx);
  const profile = await getProfileByAuthUserId(ctx, user._id);
  if (!profile || (profile.role !== "admin" && profile.role !== "hr")) {
    throw new ConvexError("Admin or HR access required.");
  }
  return { user, profile };
}

async function requireAdmin(ctx: Ctx) {
  const user = await requireAuth(ctx);
  const profile = await getProfileByAuthUserId(ctx, user._id);
  if (!profile || profile.role !== "admin") {
    throw new ConvexError("Admin access required.");
  }
  return { user, profile };
}

export const ensureCurrentProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const existing = await getProfileByAuthUserId(ctx, user._id);
    const now = Date.now();

    if (existing) {
      const name = user.name || user.email.split("@")[0];
      if (existing.accountEmail !== user.email || existing.name !== name) {
        await ctx.db.patch(existing._id, {
          accountEmail: user.email,
          name,
          updatedAt: now,
        });
      }
      return await ctx.db.get(existing._id);
    }

    const role = isConfiguredAdmin(user.email) ? "admin" : "user";
    const profileId = await ctx.db.insert("userProfiles", {
      authUserId: user._id,
      accountEmail: user.email,
      name: user.name || user.email.split("@")[0],
      role,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(profileId);
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?._id) return null;
    const profile = await getProfileByAuthUserId(ctx, user._id);
    let department = null;
    if (profile?.departmentId) {
      department = await ctx.db.get(profile.departmentId);
    }
    return { user, profile, department };
  },
});

export const listProfiles = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const [profilePage, departments] = await Promise.all([
      ctx.db
        .query("userProfiles")
        .withIndex("by_updatedAt")
        .order("desc")
        .paginate(args.paginationOpts),
      ctx.db.query("departments").take(200),
    ]);
    const departmentsById = new Map(departments.map((d) => [d._id, d]));
    return {
      ...profilePage,
      page: profilePage.page.map((profile) => ({
        ...profile,
        department: profile.departmentId
          ? departmentsById.get(profile.departmentId) ?? null
          : null,
      })),
    };
  },
});

export const listDepartments = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    return await ctx.db.query("departments").take(200);
  },
});

export const createDepartment = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const name = args.name.trim();
    const slug = slugify(name);
    if (!name || !slug) throw new ConvexError("Department name is required.");
    const existing = await ctx.db
      .query("departments")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("departments", {
      name,
      slug,
      createdAt: Date.now(),
    });
  },
});

export const updateProfileAssignment = mutation({
  args: {
    profileId: v.id("userProfiles"),
    role: v.union(v.literal("admin"), v.literal("hr"), v.literal("user")),
    departmentId: v.optional(v.id("departments")),
    assignedEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { profile: actor } =
      args.role === "admin" ? await requireAdmin(ctx) : await requireStaff(ctx);
    const target = await ctx.db.get(args.profileId);
    if (!target) throw new ConvexError("User profile not found.");
    if (actor.role === "hr" && (target.role === "admin" || args.role === "admin")) {
      throw new ConvexError("HR cannot assign or modify admin access.");
    }

    let assignedEmail: string | undefined;
    if (args.assignedEmail?.trim()) {
      assignedEmail = normalizeAssignedEmail(args.assignedEmail);
      const existing = await ctx.db
        .query("userProfiles")
        .withIndex("by_assigned_email", (q) => q.eq("assignedEmail", assignedEmail))
        .unique();
      if (existing && existing._id !== args.profileId) {
        throw new ConvexError("That company email is already assigned.");
      }
    }

    await ctx.db.patch(args.profileId, {
      role: args.role,
      departmentId: args.departmentId,
      assignedEmail,
      updatedAt: Date.now(),
    });
  },
});
