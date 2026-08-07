import { NextRequest } from "next/server";
import { ALLOWED_DOMAIN } from "@/lib/types";
import { api } from "@/convex/_generated/api";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECIPIENTS = 50;
const MAX_LENGTH = 100_000;
const RESEND_TIMEOUT_MS = 10_000;

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
          "RESEND_API_KEY is not configured. Add it to .env.local to send email.",
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
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
  if (!assignedEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return Response.json(
      { error: `Assigned sender must use @${ALLOWED_DOMAIN}.` },
      { status: 400 },
    );
  }

  const localPart = assignedEmail.slice(0, -(ALLOWED_DOMAIN.length + 1));
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
  const subject = subjectRaw || "(no subject)";
  const bodyText = typeof data.body === "string" ? data.body.slice(0, MAX_LENGTH) : "";
  const idempotencyKey =
    typeof data.idempotencyKey === "string" && data.idempotencyKey.trim()
      ? data.idempotencyKey.trim().slice(0, 200)
      : crypto.randomUUID();

  try {
    const existing = await fetchAuthQuery(api.mail.getMessageByIdempotencyKey, {
      idempotencyKey,
    });
    if (existing) {
      return Response.json({ id: existing.resendId, from: assignedEmail, fromName: profile?.name, to, cc, bcc, subject });
    }

    const from = formatFrom(
      profile?.name ?? profileResult?.user?.name ?? assignedEmail,
      assignedEmail,
    );

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
      return Response.json(
        { error: result?.message ?? "Resend failed to send the message." },
        { status: 400 },
      );
    }

    await fetchAuthMutation(api.mail.recordSentMessage, {
      resendId: result?.id,
      idempotencyKey,
      to,
      cc,
      bcc,
      subject,
      body: bodyText,
    });

    return Response.json({ id: result?.id, from: assignedEmail, fromName: profile?.name, to, cc, bcc, subject });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected error while sending.";
    return Response.json({ error: message }, { status: 500 });
  }
}
