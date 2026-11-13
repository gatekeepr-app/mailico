import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const ADMIN_PAGE_ROLES = new Set(["admin", "chief", "hrLead", "hr"]);

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeDomain(value: string) {
  const domain = value.trim().toLowerCase().replace(/^@/, "");
  if (
    domain.length > 253 ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)
  ) {
    throw new ConvexError("Enter a valid business mail domain, such as mail.example.com.");
  }
  return domain;
}

function normalizeLocalPart(value: string) {
  const local = value.trim().toLowerCase().split("@")[0];
  if (!local || local.length > 64 || !/^[a-z0-9._-]+$/.test(local)) {
    throw new ConvexError("Email name can only use letters, numbers, dots, underscores, and hyphens.");
  }
  return local;
}

function normalizeAssignedEmail(localOrEmail: string, mailDomain: string) {
  const value = localOrEmail.trim().toLowerCase();
  if (value.includes("@") && !value.endsWith(`@${mailDomain}`)) {
    throw new ConvexError(`Assigned addresses must use @${mailDomain}.`);
  }
  return `${normalizeLocalPart(value)}@${mailDomain}`;
}

function canAccessAdminPage(_email: string, role: string | undefined) {
  return role ? ADMIN_PAGE_ROLES.has(role) : false;
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

async function getCompanySettings(ctx: Ctx) {
  return await ctx.db
    .query("companySettings")
    .withIndex("by_key", (q) => q.eq("key", "primary"))
    .unique();
}

async function requireStaff(ctx: Ctx) {
  const user = await requireAuth(ctx);
  const profile = await getProfileByAuthUserId(ctx, user._id);
  const settings = await getCompanySettings(ctx);
  if (!settings) {
    throw new ConvexError("Complete company setup before using staff tools.");
  }
  const effectiveRole = profile?.role === "admin" && settings && settings.ownerAuthUserId !== user._id
    ? "user"
    : profile?.role;
  if (!canAccessAdminPage(user.email, effectiveRole)) {
    throw new ConvexError("Admin, chief, or HR lead access required.");
  }
  return { user, profile };
}

export const ensureCurrentProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const existing = await getProfileByAuthUserId(ctx, user._id);
    const settings = await getCompanySettings(ctx);
    const now = Date.now();

    if (existing) {
      const name = user.name || user.email.split("@")[0];
      const role = settings
        ? settings.ownerAuthUserId === user._id ? "admin" : existing.role === "admin" ? "user" : existing.role
        : existing.role === "admin" ? "user" : existing.role;
      if (
        existing.accountEmail !== user.email ||
        existing.name !== name ||
        existing.role !== role
      ) {
        await ctx.db.patch(existing._id, {
          accountEmail: user.email,
          name,
          role,
          updatedAt: now,
        });
      }
      return await ctx.db.get(existing._id);
    }

    const role = settings?.ownerAuthUserId === user._id
      ? "admin"
      : "user";
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

export const completeCompanySetupInternal = internalMutation({
  args: {
    domain: v.string(),
    ownerLocalPart: v.string(),
    ownerAuthUserId: v.string(),
    ownerEmail: v.string(),
    ownerName: v.string(),
  },
  handler: async (ctx, args) => {
    if (await getCompanySettings(ctx)) {
      throw new ConvexError("Company setup has already been completed.");
    }

    const domain = normalizeDomain(args.domain);
    const ownerAddress = `${normalizeLocalPart(args.ownerLocalPart)}@${domain}`;
    const existingAddress = await ctx.db
      .query("userProfiles")
      .withIndex("by_assigned_email", (q) => q.eq("assignedEmail", ownerAddress))
      .unique();
    if (existingAddress && existingAddress.authUserId !== args.ownerAuthUserId) {
      throw new ConvexError("That business address is already assigned.");
    }

    const now = Date.now();
    const profile = await getProfileByAuthUserId(ctx, args.ownerAuthUserId);
    if (profile) {
      await ctx.db.patch(profile._id, {
        role: "admin",
        assignedEmail: ownerAddress,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        authUserId: args.ownerAuthUserId,
        accountEmail: args.ownerEmail,
        name: args.ownerName || args.ownerEmail.split("@")[0],
        role: "admin",
        assignedEmail: ownerAddress,
        createdAt: now,
        updatedAt: now,
      });
    }

    const legacyAdmins = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .take(1000);
    for (const legacyAdmin of legacyAdmins) {
      if (legacyAdmin.authUserId !== args.ownerAuthUserId) {
        await ctx.db.patch(legacyAdmin._id, { role: "user", updatedAt: now });
      }
    }

    await ctx.db.insert("companySettings", {
      key: "primary",
      domain,
      ownerAuthUserId: args.ownerAuthUserId,
      ownerEmail: args.ownerEmail.toLowerCase(),
      ownerAddress,
      resendStatus: "not_checked",
      createdAt: now,
      updatedAt: now,
    });
    return { domain, ownerAddress };
  },
});

export const setResendStatus = mutation({
  args: {
    status: v.union(
      v.literal("missing_key"),
      v.literal("invalid_key"),
      v.literal("domain_missing"),
      v.literal("pending"),
      v.literal("partially_verified"),
      v.literal("failed"),
      v.literal("verified"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const settings = await getCompanySettings(ctx);
    if (!settings || settings.ownerAuthUserId !== user._id) {
      throw new ConvexError("Only the business owner can update Resend status.");
    }
    await ctx.db.patch(settings._id, {
      resendStatus: args.status,
      resendCheckedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return args.status;
  },
});

export const correctUnverifiedCompanyDomain = mutation({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const settings = await getCompanySettings(ctx);
    if (!settings || settings.ownerAuthUserId !== user._id) {
      throw new ConvexError("Only the business owner can change the company domain.");
    }
    if (settings.resendStatus === "verified") {
      throw new ConvexError("A verified company domain cannot be changed here.");
    }

    const domain = normalizeDomain(args.domain);
    if (domain === settings.domain) return { domain, changed: false };

    const profiles = await ctx.db.query("userProfiles").take(1001);
    if (profiles.length > 1000) {
      throw new ConvexError("Domain correction is unavailable until the workspace can be reviewed safely.");
    }
    if (profiles.some((profile) => profile.authUserId !== user._id && profile.assignedEmail)) {
      throw new ConvexError("Domain correction is unavailable after employee addresses have been assigned.");
    }

    const pendingRequests = await ctx.db
      .query("emailAddressRequests")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "pending"))
      .take(1);
    if (pendingRequests.length) {
      throw new ConvexError("Review pending address requests before correcting the domain.");
    }

    const ownerProfile = await getProfileByAuthUserId(ctx, user._id);
    if (!ownerProfile) throw new ConvexError("Owner profile not found.");
    const existingOwnerAliasMail = await ctx.db
      .query("mailboxEntries")
      .withIndex("by_owner_folder_createdAt", (q) =>
        q.eq("ownerKey", `email:${settings.ownerAddress.toLowerCase()}`).eq("folder", "inbox"),
      )
      .take(1);
    if (existingOwnerAliasMail.length) {
      throw new ConvexError("Domain correction is unavailable because the current owner address already has inbound mail.");
    }
    const ownerLocalPart = settings.ownerAddress.split("@")[0];
    const ownerAddress = normalizeAssignedEmail(ownerLocalPart, domain);
    const conflictingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_assigned_email", (q) => q.eq("assignedEmail", ownerAddress))
      .unique();
    if (conflictingProfile && conflictingProfile._id !== ownerProfile._id) {
      throw new ConvexError("The owner's address already belongs to another account.");
    }

    const now = Date.now();
    await ctx.db.patch(settings._id, {
      domain,
      ownerAddress,
      resendStatus: "not_checked",
      resendCheckedAt: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(ownerProfile._id, {
      assignedEmail: ownerAddress,
      updatedAt: now,
    });
    return { domain, ownerAddress, changed: true };
  },
});

export const getCompanySettingsForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?._id) return null;
    const settings = await getCompanySettings(ctx);
    return settings
      ? {
          domain: settings.domain,
          ownerEmail: settings.ownerEmail,
          ownerAddress: settings.ownerAddress,
          resendStatus: settings.resendStatus,
          resendCheckedAt: settings.resendCheckedAt,
          isOwner: settings.ownerAuthUserId === user._id,
        }
      : null;
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?._id) return null;
    const profile = await getProfileByAuthUserId(ctx, user._id);
    const companySettings = await getCompanySettings(ctx);
    let department = null;
    if (profile?.departmentId) {
      department = await ctx.db.get(profile.departmentId);
    }
    return {
      user,
      profile,
      department,
      companySettings: companySettings
        ? {
            domain: companySettings.domain,
            ownerEmail: companySettings.ownerEmail,
            ownerAddress: companySettings.ownerAddress,
            resendStatus: companySettings.resendStatus,
            resendCheckedAt: companySettings.resendCheckedAt,
            isOwner: companySettings.ownerAuthUserId === user._id,
          }
        : null,
    };
  },
});

export const getMyEmailAddressRequest = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?._id) return null;
    return await ctx.db
      .query("emailAddressRequests")
      .withIndex("by_auth_user_createdAt", (q) => q.eq("authUserId", user._id))
      .order("desc")
      .first();
  },
});

export const requestEmailAddress = mutation({
  args: { localPart: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const profile = await getProfileByAuthUserId(ctx, user._id);
    const settings = await getCompanySettings(ctx);
    if (!settings || !profile) throw new ConvexError("Complete company setup before requesting an address.");
    if (profile.assignedEmail) throw new ConvexError("You already have a company address assigned.");

    const existingRequests = await ctx.db
      .query("emailAddressRequests")
      .withIndex("by_auth_user_createdAt", (q) => q.eq("authUserId", user._id))
      .order("desc")
      .take(20);
    if (existingRequests.some((request) => request.status === "pending")) {
      throw new ConvexError("You already have an address request awaiting review.");
    }

    const requestedEmail = normalizeAssignedEmail(args.localPart, settings.domain);
    const assigned = await ctx.db
      .query("userProfiles")
      .withIndex("by_assigned_email", (q) => q.eq("assignedEmail", requestedEmail))
      .unique();
    if (assigned) throw new ConvexError("That address is already assigned.");

    const now = Date.now();
    const requestId = await ctx.db.insert("emailAddressRequests", {
      authUserId: user._id,
      requestedEmail,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return requestId;
  },
});

export const listEmailAddressRequests = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const [requests, profiles] = await Promise.all([
      ctx.db
        .query("emailAddressRequests")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "pending"))
        .order("desc")
        .take(100),
      ctx.db.query("userProfiles").take(1000),
    ]);
    const profilesByUserId = new Map(profiles.map((profile) => [profile.authUserId, profile]));
    return requests.map((request) => ({
      ...request,
      profile: profilesByUserId.get(request.authUserId) ?? null,
    }));
  },
});

export const reviewEmailAddressRequest = mutation({
  args: {
    requestId: v.id("emailAddressRequests"),
    decision: v.union(v.literal("approve"), v.literal("reject")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireStaff(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") {
      throw new ConvexError("This address request is no longer pending.");
    }
    const settings = await getCompanySettings(ctx);
    const profile = await getProfileByAuthUserId(ctx, request.authUserId);
    if (!settings || !profile) throw new ConvexError("Company or employee profile not found.");

    const now = Date.now();
    if (args.decision === "approve") {
      if (!request.requestedEmail.endsWith(`@${settings.domain}`)) {
        throw new ConvexError("The requested address no longer matches the business domain.");
      }
      const assigned = await ctx.db
        .query("userProfiles")
        .withIndex("by_assigned_email", (q) => q.eq("assignedEmail", request.requestedEmail))
        .unique();
      if (assigned && assigned._id !== profile._id) {
        throw new ConvexError("That address has already been assigned to someone else.");
      }
      await ctx.db.patch(profile._id, {
        assignedEmail: request.requestedEmail,
        updatedAt: now,
      });
    }

    await ctx.db.patch(request._id, {
      status: args.decision === "approve" ? "approved" : "rejected",
      reviewedBy: user._id,
      reviewedAt: now,
      updatedAt: now,
    });
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
    role: v.union(
      v.literal("admin"),
      v.literal("chief"),
      v.literal("hrLead"),
      v.literal("hr"),
      v.literal("user"),
    ),
    departmentId: v.optional(v.id("departments")),
    assignedEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, profile: actor } = await requireStaff(ctx);
    const target = await ctx.db.get(args.profileId);
    if (!target) throw new ConvexError("User profile not found.");
    const settings = await getCompanySettings(ctx);
    const targetIsAdminAccount = Boolean(settings && settings.ownerAuthUserId === target.authUserId);
    const actorIsAdmin = Boolean(settings && settings.ownerAuthUserId === user._id);
    const actorRole = actorIsAdmin ? "admin" : actor?.role;

    if (!actorIsAdmin && targetIsAdminAccount) {
      throw new ConvexError("Only the configured admin can modify the admin account.");
    }
    if (args.role === "admin" && !targetIsAdminAccount) {
      throw new ConvexError("Only the business owner can have the admin role.");
    }
    if (targetIsAdminAccount && args.role !== "admin") {
      throw new ConvexError("The configured admin account cannot be demoted.");
    }
    if ((actorRole === "hr" || actorRole === "hrLead") && args.role !== target.role) {
      throw new ConvexError("HR lead cannot change roles.");
    }

    let assignedEmail: string | undefined;
    if (args.assignedEmail?.trim()) {
      const settings = await getCompanySettings(ctx);
      if (!settings) throw new ConvexError("Complete company setup before assigning addresses.");
      assignedEmail = normalizeAssignedEmail(args.assignedEmail, settings.domain);
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
