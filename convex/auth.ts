import { betterAuth } from "better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { APIError } from "better-auth/api";
import { query } from "./_generated/server";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { GenericActionCtx } from "convex/server";
import authConfig from "./auth.config";

function getAppName() {
  return process.env.APP_NAME?.trim() || "Mailico";
}

function getAuthFrom() {
  const configured = process.env.AUTH_FROM_EMAIL?.trim();
  if (configured) return configured;
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) throw new Error("Set AUTH_FROM_EMAIL or SITE_URL in Convex env.");
  return `auth@${new URL(siteUrl).hostname}`;
}

function getTrustedOrigins() {
  const configuredOrigins = [
    process.env.SITE_URL,
    ...(process.env.TRUSTED_ORIGINS ?? "").split(","),
  ];
  const normalizedOrigins = configuredOrigins.flatMap((value) => {
    if (!value?.trim()) return [];
    try {
      return [new URL(value.trim()).origin];
    } catch {
      return [];
    }
  });
  return Array.from(
    new Set(
      [
        ...normalizedOrigins,
      ].filter((origin): origin is string => Boolean(origin)),
    ),
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

async function sendResetPasswordEmail({
  user,
  url,
}: {
  user: { email: string; name?: string | null };
  url: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured in Convex env.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${getAppName()} <${getAuthFrom()}>`,
      to: [user.email],
      subject: `Reset your ${getAppName()} password`,
      html: `<p>Hi ${escapeHtml(user.name || "there")},</p><p>Use this link to reset your ${escapeHtml(getAppName())} password:</p><p><a href="${escapeHtml(url)}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
      text: `Use this link to reset your ${getAppName()} password: ${url}`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend reset email failed: ${await res.text()}`);
  }
}

async function sendVerificationEmail({
  user,
  url,
}: {
  user: { email: string; name?: string | null };
  url: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured in Convex env.");

  const safeUrl = escapeHtml(url);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${getAppName()} <${getAuthFrom()}>`,
      to: [user.email],
      subject: `Verify your ${getAppName()} email address`,
      html: `<p>Hi ${escapeHtml(user.name || "there")},</p><p>Verify your email address if prompted while signing in:</p><p><a href="${safeUrl}">Verify email address</a></p><p>If you did not create this account, you can ignore this email.</p>`,
      text: `Verify your ${getAppName()} email address: ${url}`,
    }),
  });
  if (!res.ok) throw new Error(`Resend verification email failed (${res.status}).`);
}

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const actionCtx = ctx as GenericActionCtx<DataModel>;
  return betterAuth({
    appName: getAppName(),
    baseURL: process.env.SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: getTrustedOrigins(),
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: sendResetPasswordEmail,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const allowed = await actionCtx.runQuery(internal.profiles.canCreateAccountInternal, {
              emailNormalized: user.email.trim().toLowerCase(),
            });
            if (!allowed) {
              throw new APIError("FORBIDDEN", {
                message: `${getAppName()} accounts are created through employee invitations.`,
              });
            }
          },
        },
      },
    },
    plugins: [convex({ authConfig })],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx);
  },
});
