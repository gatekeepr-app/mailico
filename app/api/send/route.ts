import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECIPIENTS = 50;
const MAX_LENGTH = 100_000;
const MAX_SUBJECT_LENGTH = 998;
const MAX_REQUEST_BYTES = 512_000;
const REQUEST_BODY_TIMEOUT_MS = 15_000;
const RESEND_TIMEOUT_MS = 10_000;

class RequestBodyTooLargeError extends Error {}
class RequestBodyTimeoutError extends Error {}

async function readRequestTextLimited(request: Request): Promise<string> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new RequestBodyTooLargeError();
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const deadline = Date.now() + REQUEST_BODY_TIMEOUT_MS;
  try {
    while (true) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) throw new RequestBodyTimeoutError();
      let timeout: ReturnType<typeof setTimeout> | undefined;
      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new RequestBodyTimeoutError()), remainingMs);
          }),
        ]);
      } finally {
        if (timeout !== undefined) clearTimeout(timeout);
      }
      if (result.done) break;
      totalBytes += result.value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) throw new RequestBodyTooLargeError();
      chunks.push(result.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string): string {
  const paragraphs = escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
  return paragraphs || "<p></p>";
}

function normalizeEmails(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const clean = item.trim().toLowerCase();
    if (!clean) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return null;
    out.push(clean);
  }
  return out;
}

function formatFrom(name: string, email: string): string {
  const safeName = name.replace(/[<>]/g, "").trim();
  if (!safeName || safeName.toLowerCase() === email.toLowerCase()) return email;
  const escapedName = safeName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escapedName}" <${email}>`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "RESEND_API_KEY is not configured in the Next.js server environment.",
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    const rawBody = await readRequestTextLimited(req);
    body = JSON.parse(rawBody);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "Request body is too large." }, { status: 413 });
    }
    if (error instanceof RequestBodyTimeoutError) {
      return Response.json({ error: "Request body was not received in time." }, { status: 408 });
    }
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }
  const data = body as Record<string, unknown>;

  let profileResult;
  try {
    profileResult = await fetchAuthQuery(api.profiles.getMyProfile, {});
  } catch {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const profile = profileResult?.profile;
  const assignedEmail = profile?.assignedEmail?.toLowerCase();
  if (!assignedEmail) {
    return Response.json(
      { error: "No company email is assigned to this user yet." },
      { status: 403 },
    );
  }
  const mailDomain = profileResult?.companySettings?.domain;
  if (!mailDomain) {
    return Response.json({ error: "Company mail setup is incomplete." }, { status: 503 });
  }
  if (profileResult?.companySettings?.resendStatus !== "verified") {
    return Response.json(
      { error: "The business owner must verify the Resend API key and sending domain before mail can be sent." },
      { status: 409 },
    );
  }
  if (!assignedEmail.endsWith(`@${mailDomain}`)) {
    return Response.json(
      { error: `Assigned sender must use @${mailDomain}.` },
      { status: 400 },
    );
  }

  const localPart = assignedEmail.slice(0, -(mailDomain.length + 1));
  if (!/^[a-z0-9._-]+$/i.test(localPart)) {
    return Response.json(
      { error: `Invalid sender local part "${localPart}".` },
      { status: 400 },
    );
  }

  const to = normalizeEmails(data.to);
  const cc = normalizeEmails(data.cc ?? []);
  const bcc = normalizeEmails(data.bcc ?? []);
  if (!to || !cc || !bcc) {
    return Response.json(
      { error: "Recipients must be valid email addresses." },
      { status: 400 },
    );
  }
  const recipientCount = to.length + cc.length + bcc.length;
  if (to.length === 0) {
    return Response.json({ error: "At least one To recipient is required." }, { status: 400 });
  }
  if (recipientCount > MAX_RECIPIENTS) {
    return Response.json(
      { error: `Too many recipients (max ${MAX_RECIPIENTS}).` },
      { status: 400 },
    );
  }

  const subjectRaw = typeof data.subject === "string" ? data.subject.trim() : "";
  if (subjectRaw.length > MAX_SUBJECT_LENGTH) {
    return Response.json(
      { error: `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }
  const subject = subjectRaw || "(no subject)";
  if (typeof data.body === "string" && data.body.length > MAX_LENGTH) {
    return Response.json(
      { error: `Message body must be ${MAX_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }
  const bodyText = typeof data.body === "string" ? data.body : "";
  const clientOperationId = typeof data.idempotencyKey === "string" ? data.idempotencyKey.trim() : "";
  if (!clientOperationId || clientOperationId.length > 256) {
    return Response.json({ error: "A valid send operation ID is required. Reopen the compose window and try again." }, { status: 400 });
  }

  try {
    const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
    const internalSecret = process.env.MAILICO_INTERNAL_SECRET;
    const authUserId = profileResult?.user?._id;
    if (!convexSiteUrl || !internalSecret || !authUserId) {
      return Response.json({ error: "Mail sending is not configured." }, { status: 503 });
    }

    const from = formatFrom(
      profile?.name ?? profileResult?.user?.name ?? assignedEmail,
      assignedEmail,
    );

    // Keep compatibility with messages recorded before keys were namespaced and payload-bound.
    const legacy = await fetchAuthQuery(api.mail.getMessageByIdempotencyKey, {
      idempotencyKey: clientOperationId,
      to,
      cc,
      bcc,
      subject,
      body: bodyText,
    });
    if (legacy?.conflict) {
      return Response.json({ error: "This send operation was already used for different content. Open a new message to send the edited version." }, { status: 409 });
    }
    if (legacy) {
      return Response.json({ id: legacy.resendId, from: assignedEmail, fromName: profile?.name, to, cc, bcc, subject });
    }

    // Bind retries to both the authenticated sender, compose operation, and exact payload.
    // Editing a failed draft gets a new provider key; retrying unchanged content reuses it.
    const idempotencyKey = `mailico-v1-${createHash("sha256")
      .update(JSON.stringify({ authUserId, clientOperationId, from, to, cc, bcc, subject, body: bodyText }))
      .digest("hex")}`;
    const existing = await fetchAuthQuery(api.mail.getMessageByIdempotencyKey, {
      idempotencyKey,
      to,
      cc,
      bcc,
      subject,
      body: bodyText,
    });
    if (existing?.conflict) {
      return Response.json({ error: "This send operation was already used for different content. Open a new message to send the edited version." }, { status: 409 });
    }
    if (existing) {
      return Response.json({ id: existing.resendId, from: assignedEmail, fromName: profile?.name, to, cc, bcc, subject });
    }

    const quotaResponse = await fetch(`${convexSiteUrl.replace(/\/$/, "")}/mail/check-send-quota`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mailico-secret": internalSecret,
      },
      body: JSON.stringify({ authUserId }),
    });
    if (quotaResponse.status === 429) {
      return Response.json(
        { error: "You have reached the hourly sending limit. Try again later." },
        { status: 429, headers: { "Retry-After": quotaResponse.headers.get("Retry-After") ?? "3600" } },
      );
    }
    if (!quotaResponse.ok) {
      return Response.json({ error: "Unable to check the sending limit." }, { status: 503 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);
    let resendResponse: Response;
    try {
      resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          reply_to: assignedEmail,
          subject,
          text: bodyText,
          html: textToHtml(bodyText),
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    const result = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      if (resendResponse.status === 409) {
        return Response.json(
          { error: "This send is already being processed. Retry with the same content in a moment." },
          { status: 409 },
        );
      }
      return Response.json(
        { error: "Email provider rejected the message. Check the recipients and try again." },
        { status: 400 },
      );
    }

    const recordResponse = await fetch(`${convexSiteUrl.replace(/\/$/, "")}/mail/record-sent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mailico-secret": internalSecret,
      },
      body: JSON.stringify({
        authUserId,
        resendId: result?.id,
        idempotencyKey,
        to,
        cc,
        bcc,
        subject,
        body: bodyText,
      }),
    });
    if (!recordResponse.ok) throw new Error("Unable to record sent email.");

    return Response.json({ id: result?.id, from: assignedEmail, fromName: profile?.name, to, cc, bcc, subject });
  } catch (err) {
    console.error("Mail send request failed", err);
    return Response.json(
      { error: "The message could not be sent right now. Please try again." },
      { status: 500 },
    );
  }
}
