import { betterAuth } from "better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { query } from "./_generated/server";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

const MAIL_DOMAIN = "mail.darvizlabs.online";

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
      from: `Mailico <auth@${MAIL_DOMAIN}>`,
      to: [user.email],
      subject: "Reset your Mailico password",
      html: `<p>Hi ${escapeHtml(user.name || "there")},</p><p>Use this link to reset your Mailico password:</p><p><a href="${escapeHtml(url)}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
      text: `Use this link to reset your Mailico password: ${url}`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend reset email failed: ${await res.text()}`);
  }
}

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    appName: "Mailico",
    baseURL: process.env.SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: sendResetPasswordEmail,
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
