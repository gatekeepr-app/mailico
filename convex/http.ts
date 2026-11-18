import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/setup/complete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.MAILICO_INTERNAL_SECRET;
    if (!secret) {
      return Response.json({ error: "Owner setup is not configured." }, { status: 503 });
    }
    if (request.headers.get("x-mailico-secret") !== secret) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json({ error: "Invalid owner setup payload." }, { status: 400 });
    }
    const data = payload as Record<string, unknown>;
    if (
      typeof data.domain !== "string" || data.domain.length > 253 ||
      typeof data.ownerLocalPart !== "string" || data.ownerLocalPart.length > 320 ||
      typeof data.ownerAuthUserId !== "string" || !data.ownerAuthUserId || data.ownerAuthUserId.length > 256 ||
      typeof data.ownerEmail !== "string" || !data.ownerEmail || data.ownerEmail.length > 320 ||
      typeof data.ownerName !== "string" || data.ownerName.length > 256
    ) {
      return Response.json({ error: "Invalid owner setup payload." }, { status: 400 });
    }

    try {
      const result = await ctx.runMutation(internal.profiles.completeCompanySetupInternal, {
        domain: data.domain,
        ownerLocalPart: data.ownerLocalPart,
        ownerAuthUserId: data.ownerAuthUserId,
        ownerEmail: data.ownerEmail,
        ownerName: data.ownerName,
      });
      return Response.json(result);
    } catch {
      return Response.json({ error: "Could not complete company setup." }, { status: 400 });
    }
  }),
});

http.route({
  path: "/employees/create",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.MAILICO_INTERNAL_SECRET;
    if (!secret) return Response.json({ error: "Employee provisioning is not configured." }, { status: 503 });
    if (request.headers.get("x-mailico-secret") !== secret) return Response.json({ error: "Unauthorized." }, { status: 401 });

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json({ error: "Invalid employee details." }, { status: 400 });
    }
    const data = payload as Record<string, unknown>;
    if (
      typeof data.name !== "string" || typeof data.employeeId !== "string" ||
      typeof data.accountEmail !== "string" || typeof data.assignedEmail !== "string" ||
      typeof data.tokenHash !== "string"
    ) {
      return Response.json({ error: "Employee name, employee ID, primary email, assigned email, and invitation token are required." }, { status: 400 });
    }

    try {
      const result = await ctx.runMutation(internal.profiles.createExternalEmployeeInvitationInternal, {
        name: data.name,
        employeeId: data.employeeId,
        accountEmail: data.accountEmail,
        assignedEmail: data.assignedEmail,
        tokenHash: data.tokenHash,
      });
      return Response.json({ ok: true, invitationId: result.invitationId, assignedEmail: result.assignedEmail, domain: result.domain, alreadyPending: result.alreadyPending }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create employee invitation.";
      return Response.json({ error: message }, { status: 400 });
    }
  }),
});

http.route({
  path: "/employees/cancel",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.MAILICO_INTERNAL_SECRET;
    if (!secret) return Response.json({ error: "Employee provisioning is not configured." }, { status: 503 });
    if (request.headers.get("x-mailico-secret") !== secret) return Response.json({ error: "Unauthorized." }, { status: 401 });

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || typeof (payload as Record<string, unknown>).invitationId !== "string") {
      return Response.json({ error: "Invalid invitation ID." }, { status: 400 });
    }
    try {
      await ctx.runMutation(internal.profiles.cancelExternalEmployeeInvitationInternal, {
        invitationId: (payload as { invitationId: Id<"employeeInvitations"> }).invitationId,
      });
      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: "Could not cancel the employee invitation." }, { status: 400 });
    }
  }),
});

http.route({
  path: "/mail/check-send-quota",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.MAILICO_INTERNAL_SECRET;
    if (!secret) {
      return Response.json({ error: "Mail sending is not configured." }, { status: 503 });
    }
    if (request.headers.get("x-mailico-secret") !== secret) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      typeof (payload as { authUserId?: unknown }).authUserId !== "string") {
      return Response.json({ error: "Invalid quota request." }, { status: 400 });
    }

    try {
      const quota = await ctx.runMutation(internal.mail.consumeSendQuota, {
        authUserId: (payload as { authUserId: string }).authUserId,
      });
      return Response.json(quota, {
        status: quota.allowed ? 200 : 429,
        headers: quota.allowed ? undefined : { "Retry-After": String(quota.retryAfterSeconds) },
      });
    } catch {
      return Response.json({ error: "Unable to check send quota." }, { status: 400 });
    }
  }),
});

http.route({
  path: "/mail/record-inbound",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.MAILICO_INTERNAL_SECRET;
    if (!secret) {
      return Response.json({ error: "Inbound webhook is not configured." }, { status: 503 });
    }
    if (request.headers.get("x-mailico-secret") !== secret) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json({ error: "Invalid inbound email payload." }, { status: 400 });
    }

    try {
      const result = await ctx.runMutation(
        internal.mail.recordInboundMessage,
        payload as {
          resendId?: string;
          idempotencyKey?: string;
          fromEmail: string;
          fromName?: string;
          to: string[];
          cc: string[];
          bcc: string[];
          subject: string;
          body: string;
        },
      );
      return Response.json({ ok: true, messageId: result });
    } catch {
      return Response.json({ error: "Invalid inbound email payload." }, { status: 400 });
    }
  }),
});

http.route({
  path: "/notifications/config",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const secret = process.env.MAILICO_INTERNAL_SECRET;
    if (!secret) return Response.json({ error: "Notification configuration is not available." }, { status: 503 });
    if (request.headers.get("x-mailico-secret") !== secret) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
      return Response.json({ enabled: false }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    return Response.json(
      { enabled: true, publicKey },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }),
});

http.route({
  path: "/mail/record-sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.MAILICO_INTERNAL_SECRET;
    if (!secret) {
      return Response.json({ error: "Mail persistence is not configured." }, { status: 503 });
    }
    if (request.headers.get("x-mailico-secret") !== secret) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json({ error: "Invalid sent email payload." }, { status: 400 });
    }

    try {
      const messageId = await ctx.runMutation(
        internal.mail.recordSentMessage,
        payload as {
          authUserId: string;
          resendId?: string;
          idempotencyKey: string;
          to: string[];
          cc: string[];
          bcc: string[];
          subject: string;
          body: string;
        },
      );
      return Response.json({ ok: true, messageId });
    } catch {
      return Response.json({ error: "Unable to record sent email." }, { status: 400 });
    }
  }),
});

export default http;
