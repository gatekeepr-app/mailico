import { Resend } from "resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function sendEmployeeInvitationEmail({
  apiKey,
  name,
  accountEmail,
  assignedEmail,
  domain,
  invitationUrl,
  departmentMessage,
}: {
  apiKey: string;
  name: string;
  accountEmail: string;
  assignedEmail: string;
  domain: string;
  invitationUrl: string;
  departmentMessage?: string;
}) {
  const resend = new Resend(apiKey);
  const escapedDepartmentMessage = departmentMessage ? `<p>${escapeHtml(departmentMessage)}</p>` : "";
  const result = await resend.emails.send({
    from: `Mailico <auth@${domain}>`,
    to: [accountEmail],
    subject: "You’re invited to your company Mailico account",
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your administrator invited you to use <strong>${escapeHtml(assignedEmail)}</strong> for company email.</p><p>Open the invitation to choose your personal or primary email, create a password, and verify that email. It will be used for account recovery.</p>${escapedDepartmentMessage}<p><a href="${escapeHtml(invitationUrl)}">Accept invitation</a></p><p>This invitation expires in seven days. If you were not expecting it, you can ignore this email.</p>`,
    text: `Hi ${name},\n\nYour administrator invited you to use ${assignedEmail} for company email. Open this link to choose your personal or primary email, create a password, and verify that email. It will be used for account recovery.${departmentMessage ? ` ${departmentMessage}` : ""}\n\n${invitationUrl}\n\nThis invitation expires in seven days. If you were not expecting it, you can ignore this email.`,
  });
  if (result.error) throw new Error("Resend could not deliver the employee invitation.");
}
