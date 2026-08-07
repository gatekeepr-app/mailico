import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 100_000;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function cleanEmail(value: string) {
  const match = value.match(/<([^<>\s@]+@[^<>\s@]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

function cleanName(value: string) {
  const trimmed = value.trim();
  const bracketIndex = trimmed.indexOf("<");
  return (bracketIndex >= 0 ? trimmed.slice(0, bracketIndex) : "")
    .replace(/^"|"$/g, "")
    .trim();
}

function collectEmails(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map(cleanEmail)
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") return collectEmails(item);
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const email = record.email ?? record.address;
        return typeof email === "string" ? collectEmails(email) : [];
      }
      return [];
    });
  }
  return [];
}

function uniqueEmails(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function textFromHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>(?=\s*)/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

async function retrieveReceivedEmail(emailId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to retrieve received email ${emailId}: ${response.status}`);
  }

  return asRecord(await response.json());
}

export async function POST(req: Request) {
  const receiveSecret = process.env.RECEIVE_WEBHOOK_SECRET;
  if (receiveSecret && req.headers.get("x-mailico-secret") !== receiveSecret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return Response.json({ error: "NEXT_PUBLIC_CONVEX_URL is not configured." }, { status: 500 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const eventType = stringValue(payload.type);
  if (eventType && eventType !== "email.received") {
    return Response.json({ ok: true, ignored: eventType });
  }

  const eventData = asRecord(payload.data || payload);
  const emailId = stringValue(eventData.email_id || eventData.id);
  const emailData = emailId ? await retrieveReceivedEmail(emailId) : null;
  const data = { ...eventData, ...(emailData ?? {}) };
  const headers = asRecord(data.headers);

  const fromRaw = data.from ?? data.sender;
  const fromValue = stringValue(fromRaw);
  const fromEmail = cleanEmail(fromValue);
  const to = uniqueEmails([
    ...collectEmails(data.to ?? data.recipients),
    ...collectEmails(data.received_for),
  ]);
  const cc = collectEmails(data.cc);
  const bcc = collectEmails(data.bcc);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    return Response.json({ error: "Inbound email requires a valid from address." }, { status: 400 });
  }
  if (to.length + cc.length + bcc.length === 0) {
    return Response.json({ error: "Inbound email requires at least one recipient." }, { status: 400 });
  }

  const text = stringValue(data.text);
  const html = stringValue(data.html);
  const body = (text || textFromHtml(html)).slice(0, MAX_BODY_LENGTH);
  const subject = stringValue(data.subject) || "(no subject)";
  const resendId = stringValue(data.email_id || data.id) || undefined;
  const messageIdHeader = stringValue(data.messageId) || stringValue(data.message_id);
  const idempotencyKey = messageIdHeader || resendId;

  const client = new ConvexHttpClient(convexUrl);
  const messageId = await client.mutation(api.mail.recordInboundMessage, {
    resendId,
    idempotencyKey,
    fromEmail,
    fromName: cleanName(stringValue(headers.from) || fromValue),
    to,
    cc,
    bcc,
    subject,
    body,
  });

  return Response.json({ ok: true, messageId });
}
