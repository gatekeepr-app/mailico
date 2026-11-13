import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 100_000;
const MAX_WEBHOOK_BYTES = 512_000;
const MAX_PROVIDER_RESPONSE_BYTES = 1_000_000;
const REQUEST_BODY_TIMEOUT_MS = 15_000;
const PROVIDER_TIMEOUT_MS = 10_000;

class PayloadTooLargeError extends Error {}
class StreamTimeoutError extends Error {}

async function readStreamLimited(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  timeoutMs?: number,
): Promise<Uint8Array> {
  if (!stream) return new Uint8Array();

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const deadline = timeoutMs === undefined ? undefined : Date.now() + timeoutMs;

  try {
    while (true) {
      let result: ReadableStreamReadResult<Uint8Array>;
      if (deadline === undefined) {
        result = await reader.read();
      } else {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) throw new StreamTimeoutError();
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          result = await Promise.race([
            reader.read(),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(() => reject(new StreamTimeoutError()), remainingMs);
            }),
          ]);
        } finally {
          if (timeout !== undefined) clearTimeout(timeout);
        }
      }
      const { done, value } = result;
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new PayloadTooLargeError();
      }
      chunks.push(value);
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
  return bytes;
}

async function readRequestBodyLimited(request: Request, maxBytes: number) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new PayloadTooLargeError();
  }
  const bytes = await readStreamLimited(request.body, maxBytes, REQUEST_BODY_TIMEOUT_MS);
  return new TextDecoder().decode(bytes);
}

async function readResponseJsonLimited(response: Response, maxBytes: number) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new PayloadTooLargeError();
  }
  const bytes = await readStreamLimited(response.body, maxBytes);
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

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
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to retrieve received email ${emailId}: ${response.status}`);
  }

  return asRecord(await readResponseJsonLimited(response, MAX_PROVIDER_RESPONSE_BYTES));
}

export async function POST(req: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: "Inbound webhook is not configured." }, { status: 503 });
  }

  const internalSecret = process.env.MAILICO_INTERNAL_SECRET;
  if (!internalSecret) {
    return Response.json({ error: "Inbound storage is not configured." }, { status: 503 });
  }

  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!convexSiteUrl) {
    return Response.json({ error: "NEXT_PUBLIC_CONVEX_SITE_URL is not configured." }, { status: 500 });
  }

  let payload: Record<string, unknown>;
  try {
    const rawPayload = await readRequestBodyLimited(req, MAX_WEBHOOK_BYTES);
    const resend = new Resend(process.env.RESEND_API_KEY);
    payload = resend.webhooks.verify({
      payload: rawPayload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    }) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return Response.json({ error: "Webhook payload is too large." }, { status: 413 });
    }
    if (error instanceof StreamTimeoutError) {
      return Response.json({ error: "Webhook payload was not received in time." }, { status: 408 });
    }
    return Response.json({ error: "Invalid webhook signature or JSON body." }, { status: 401 });
  }

  const eventType = stringValue(payload.type);
  if (eventType && eventType !== "email.received") {
    return Response.json({ ok: true, ignored: eventType });
  }

  const eventData = asRecord(payload.data || payload);
  const emailId = stringValue(eventData.email_id || eventData.id);
  let emailData: Record<string, unknown> | null;
  try {
    emailData = emailId ? await retrieveReceivedEmail(emailId) : null;
  } catch {
    return Response.json({ error: "Could not retrieve the inbound message from the provider." }, { status: 502 });
  }
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

  const response = await fetch(`${convexSiteUrl.replace(/\/$/, "")}/mail/record-inbound`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mailico-secret": internalSecret,
    },
    body: JSON.stringify({
      resendId,
      idempotencyKey,
      fromEmail,
      fromName: cleanName(stringValue(headers.from) || fromValue),
      to,
      cc,
      bcc,
      subject,
      body,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return Response.json(
      { error: result?.error ?? "Failed to persist inbound email." },
      { status: response.status },
    );
  }
  return Response.json(result);
}
