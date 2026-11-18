import { createHash, randomBytes } from "node:crypto";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { fetchAuthMutation, fetchAuthQuery } from "@/lib/auth-server";
import { sendEmployeeInvitationEmail } from "@/lib/employee-invitations";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return Response.json({ error: "Invalid request origin." }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Invalid request origin." }, { status: 403 });
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return Response.json({ error: "Employee invitations are not configured." }, { status: 503 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ error: "Invalid invitation details." }, { status: 400 });
  }
  const data = payload as Record<string, unknown>;
  if (
    typeof data.name !== "string" || data.name.length > 120 ||
    typeof data.employeeId !== "string" || data.employeeId.length > 64 ||
    typeof data.accountEmail !== "string" || data.accountEmail.length > 320 ||
    typeof data.assignedLocalPart !== "string" || data.assignedLocalPart.length > 320 ||
    typeof data.departmentId !== "string" || data.departmentId.length > 128 ||
    (data.role !== "user" && data.role !== "hrLead")
  ) {
    return Response.json({ error: "Enter a name, valid real email, company email, department, and role." }, { status: 400 });
  }

  const name = data.name.trim();
  const employeeId = data.employeeId.trim();
  const accountEmail = data.accountEmail.trim().toLowerCase();
  if (name.length < 2 || !employeeId || /[\u0000-\u001f\u007f]/.test(employeeId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
    return Response.json({ error: "Enter a valid employee name, employee ID, and real email address." }, { status: 400 });
  }

  let profileData;
  try {
    profileData = await fetchAuthQuery(api.profiles.getMyProfile, {});
  } catch {
    return Response.json({ error: "Sign in again before creating an employee invitation." }, { status: 401 });
  }
  if (!profileData?.profile || !profileData.companySettings?.isOwner) {
    return Response.json({ error: "Only the business owner can invite employees." }, { status: 403 });
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  let invitationId: Id<"employeeInvitations">;
  try {
    invitationId = await fetchAuthMutation(api.profiles.createEmployeeInvitation, {
      name,
      employeeId,
      accountEmail,
      assignedLocalPart: data.assignedLocalPart,
      departmentId: data.departmentId as Id<"departments">,
      role: data.role,
      tokenHash,
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Could not create the employee invitation.",
    }, { status: 400 });
  }

  const invitationUrl = new URL(`/invite/${token}`, request.url).toString();
  let sendError: unknown = null;
  try {
    await sendEmployeeInvitationEmail({
      apiKey,
      name,
      accountEmail,
      assignedEmail: data.assignedLocalPart.trim().toLowerCase() + "@" + profileData.companySettings.domain,
      domain: profileData.companySettings.domain,
      invitationUrl,
      departmentMessage: "Your department HR Lead can review messages sent from department accounts.",
    });
  } catch (error) {
    sendError = error;
  }

  if (sendError) {
    try {
      await fetchAuthMutation(api.profiles.cancelEmployeeInvitation, { invitationId });
    } catch {
      // The invitation remains visible to the owner for cleanup if cancellation also fails.
    }
    console.error("Could not send Mailico employee invitation.");
    return Response.json({ error: "The invitation could not be emailed. Check Resend and try again." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
