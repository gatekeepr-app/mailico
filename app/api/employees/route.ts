import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { sendEmployeeInvitationEmail } from "@/lib/employee-invitations";

export const runtime = "nodejs";

function isAuthorized(request: Request, expectedKey: string) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return false;
  const provided = Buffer.from(match[1]);
  const expected = Buffer.from(expectedKey);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function apiError(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const apiKey = process.env.MAILICO_EMPLOYEE_API_KEY;
  if (!apiKey) return apiError("NOT_CONFIGURED", "Employee provisioning API is not configured.", 503);
  if (!isAuthorized(request, apiKey)) return apiError("UNAUTHORIZED", "A valid bearer API key is required.", 401);

  const internalSecret = process.env.MAILICO_INTERNAL_SECRET;
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!internalSecret || !convexSiteUrl || !resendApiKey) {
    return apiError("NOT_CONFIGURED", "Employee invitation delivery is not configured.", 503);
  }
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return apiError("UNSUPPORTED_MEDIA_TYPE", "Send employee details as application/json.", 415);
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return apiError("INVALID_BODY", "Could not read the request body.", 400);
  }
  if (new TextEncoder().encode(body).byteLength > 8192) {
    return apiError("PAYLOAD_TOO_LARGE", "Employee details must be smaller than 8 KB.", 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return apiError("INVALID_JSON", "Request body must contain valid JSON.", 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return apiError("INVALID_EMPLOYEE", "Request body must be an employee object.", 422);
  }
  const data = payload as Record<string, unknown>;
  if (
    typeof data.name !== "string" || typeof data.employeeId !== "string" ||
    typeof data.primaryEmail !== "string" || typeof data.assignedEmail !== "string"
  ) {
    return apiError("INVALID_EMPLOYEE", "name, employeeId, primaryEmail, and assignedEmail are required strings.", 422);
  }

  const name = data.name.trim();
  const employeeId = data.employeeId.trim();
  const primaryEmail = data.primaryEmail.trim().toLowerCase();
  const assignedEmail = data.assignedEmail.trim().toLowerCase();
  if (name.length < 2 || name.length > 120) return apiError("INVALID_NAME", "Name must be between 2 and 120 characters.", 422);
  if (!employeeId || employeeId.length > 64 || /[\u0000-\u001f\u007f]/.test(employeeId)) {
    return apiError("INVALID_EMPLOYEE_ID", "Employee ID must be between 1 and 64 characters.", 422);
  }
  if (primaryEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryEmail)) {
    return apiError("INVALID_PRIMARY_EMAIL", "Enter a valid primary email address.", 422);
  }
  if (assignedEmail.length > 320 || !/^[a-z0-9._-]+@[^\s@]+\.[^\s@]+$/.test(assignedEmail)) {
    return apiError("INVALID_ASSIGNED_EMAIL", "Enter a valid company email address.", 422);
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  let createResponse: Response;
  try {
    createResponse = await fetch(new URL("/employees/create", convexSiteUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mailico-secret": internalSecret },
      body: JSON.stringify({ name, employeeId, accountEmail: primaryEmail, assignedEmail, tokenHash }),
      cache: "no-store",
    });
  } catch {
    return apiError("BACKEND_UNAVAILABLE", "Could not reach the employee provisioning service.", 502);
  }

  const created = await createResponse.json().catch(() => ({})) as {
    invitationId?: string;
    assignedEmail?: string;
    domain?: string;
    alreadyPending?: boolean;
    error?: string;
  };
  if (!createResponse.ok || !created.invitationId || !created.assignedEmail || !created.domain) {
    const message = created.error ?? "Could not create the employee invitation.";
    const conflict = /already|reserved|assigned|exists/i.test(message);
    return apiError(conflict ? "EMPLOYEE_CONFLICT" : "INVALID_EMPLOYEE", message, conflict ? 409 : 422);
  }

  if (created.alreadyPending) {
    return Response.json({
      ok: true,
      employee: { name, employeeId, primaryEmail, assignedEmail: created.assignedEmail },
      invitationStatus: "pending",
      emailSent: false,
    }, { status: 201 });
  }

  const invitationUrl = new URL(`/invite/${token}`, request.url).toString();
  try {
    await sendEmployeeInvitationEmail({
      apiKey: resendApiKey,
      name,
      accountEmail: primaryEmail,
      assignedEmail: created.assignedEmail,
      domain: created.domain,
      invitationUrl,
    });
  } catch {
    try {
      await fetch(new URL("/employees/cancel", convexSiteUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-mailico-secret": internalSecret },
        body: JSON.stringify({ invitationId: created.invitationId }),
        cache: "no-store",
      });
    } catch {
      // The invitation remains visible to the owner if cancellation also fails.
    }
    return apiError("DELIVERY_FAILED", "The setup email could not be sent. Check Resend and retry.", 502);
  }

  return Response.json({
    ok: true,
    employee: { name, employeeId, primaryEmail, assignedEmail: created.assignedEmail },
    invitationStatus: "pending",
    emailSent: true,
  }, { status: 201 });
}
