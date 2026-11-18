import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Mailico";

export const metadata: Metadata = {
  title: `API Docs | ${appName}`,
  description: `Set up the ${appName} employee provisioning API from an external tool or agent.`,
};

const requestExample = `{
  "name": "Taylor Morgan",
  "employeeId": "EMP-1042",
  "primaryEmail": "taylor@example.com",
  "assignedEmail": "taylor.morgan@mail.example.com"
}`;

const curlExample = `curl -X POST "$MAILICO_API_URL/api/employees" \\
  -H "Authorization: Bearer $MAILICO_EMPLOYEE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Taylor Morgan",
    "employeeId": "EMP-1042",
    "primaryEmail": "taylor@example.com",
    "assignedEmail": "taylor.morgan@mail.example.com"
  }'`;

const agentPrompt = `Connect my external tool to the ${appName} employee provisioning API.

Goal
When an authorized operator creates an employee in this tool, call the existing ${appName} endpoint to create that employee and assign their company email. Do not add or call any other ${appName} API for this workflow.

Configuration
- Ask me to provide the ${appName} base URL and the MAILICO_EMPLOYEE_API_KEY through this tool's secure secret/configuration mechanism. Never put the API key in browser code, a public client bundle, source control, logs, or chat history.
- Store both as server-side configuration. Use the base URL format https://your-company-mail-domain.example and POST to /api/employees.
- Send Authorization: Bearer <key> and Content-Type: application/json.

Request mapping
Send a JSON object with exactly these fields:
- name: employee's display name
- employeeId: the employee identifier supplied by the operator, as a string
- primaryEmail: employee's personal/primary email where the setup invitation should be delivered
- assignedEmail: the company-domain email address to assign

Example:
{
  "name": "Taylor Morgan",
  "employeeId": "EMP-1042",
  "primaryEmail": "taylor@example.com",
  "assignedEmail": "taylor.morgan@mail.example.com"
}

Behavior and responses
- Treat HTTP 201 with ok: true as accepted. Show the returned employee and invitation status. emailSent: true means the setup invitation was sent; emailSent: false means the same pending invitation already exists and no duplicate email was sent.
- Explain that the employee must use the email link to verify their primary email and set a password. An administrator can assign a department later.
- For errors, show the API's error.message and let the operator correct the data or configuration. Handle 401 (wrong key), 409 (duplicate/conflicting employee), 422 (invalid data), 502 (service or email delivery failed), and 503 (API configuration missing). Do not retry non-idempotent failures in a tight loop.
- Only submit after the operator confirms the employee details. Do not create a fake employee just to test the live endpoint; use a user-approved test record.

Before finishing
- Confirm the secrets are stored server-side and are not exposed to the browser or logs.
- Show me the configured endpoint URL (without the key), field mapping, and how an operator invokes the action.
- Make one API call only when I explicitly approve a real employee record.`;

const errors = [
  ["401", "UNAUTHORIZED", "The bearer API key is invalid."],
  ["409", "EMPLOYEE_CONFLICT", "The email, assigned address, or employee ID conflicts with an existing record."],
  ["415", "UNSUPPORTED_MEDIA_TYPE", "Send the request as application/json."],
  ["422", "INVALID_*", "One or more fields are missing or invalid."],
  ["502", "BACKEND_UNAVAILABLE / DELIVERY_FAILED", "Mailico could not reach the service or send the setup email."],
  ["503", "NOT_CONFIGURED", "A required server environment variable is missing."],
];

function CodeBlock({ children, copyValue }: { children: string; copyValue?: string }) {
  return (
    <div className="overflow-hidden border border-[#d9ded7] bg-[#182b25]">
      <div className="flex min-h-11 items-center justify-between border-b border-white/10 px-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b7c9be]">Example</span>
        {copyValue && <CopyButton value={copyValue} label="Copy" />}
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-[#edf4ed] sm:text-sm"><code>{children}</code></pre>
    </div>
  );
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#202820]">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-b border-[#202820]/10 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight" aria-label={`${appName} home`}>
            <span className="flex size-8 items-center justify-center rounded-full bg-[#193e37] text-white"><Mail size={15} /></span>{appName}
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-4 text-sm text-[#58645b]">
            <Link href="/manual" className="hover:text-[#193e37]">User guide</Link>
            <Link href="/pricing" className="hover:text-[#193e37]">Plans</Link>
            <Link href="/login" className="font-medium text-[#193e37]">Sign in</Link>
          </nav>
        </header>

        <div className="grid gap-12 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-20">
          <article className="min-w-0">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-[#69756d] hover:text-[#193e37]"><ArrowLeft size={14} /> Home</Link>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#557066]">Developer documentation</p>
            <h1 className="mt-3 text-4xl font-medium leading-tight tracking-[-0.05em] sm:text-5xl">Employee provisioning API</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#606a61]">Create a pending employee invitation from an external HR tool, spreadsheet workflow, or automation agent. Mailico delivers the same password setup email used by the admin invite flow.</p>

            <section id="requirements" className="mt-10 scroll-mt-8 border-l-2 border-[#286653] bg-[#edf1e9] px-5 py-4">
              <h2 className="text-sm font-semibold">Before you connect</h2>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[#59665d]">
                <li>Complete company setup in Mailico and verify the sending domain in Resend.</li>
                <li>Configure <code className="font-mono text-xs">MAILICO_EMPLOYEE_API_KEY</code> in the Mailico server environment. Use a unique, high-entropy key.</li>
                <li>Keep the key in the external tool’s server-side secret store. Never expose it in a browser or public client.</li>
              </ul>
            </section>

            <section id="endpoint" className="mt-10 scroll-mt-8">
              <h2 className="text-2xl font-medium tracking-tight">Endpoint and authentication</h2>
              <div className="mt-4 flex flex-wrap items-center gap-3 border border-[#d9ded7] bg-white px-4 py-3">
                <span className="bg-[#e3eee7] px-2 py-1 text-[11px] font-bold tracking-wide text-[#286653]">POST</span>
                <code className="break-all font-mono text-sm">https://your-mailico-domain.example/api/employees</code>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#606a61]">Include a bearer token and JSON content type. The key is separate from the internal Convex secret.</p>
              <CodeBlock copyValue={`Authorization: Bearer <MAILICO_EMPLOYEE_API_KEY>\nContent-Type: application/json`}>{`Authorization: Bearer <MAILICO_EMPLOYEE_API_KEY>
Content-Type: application/json`}</CodeBlock>
            </section>

            <section id="request" className="mt-10 scroll-mt-8">
              <h2 className="text-2xl font-medium tracking-tight">Request fields</h2>
              <p className="mt-3 text-sm leading-6 text-[#606a61]">All four fields are required. The assigned address must belong to the company domain configured in Mailico.</p>
              <dl className="mt-4 divide-y divide-[#e3e5de] border-y border-[#e3e5de]">
                {[["name", "Employee’s display name (2–120 characters)."], ["employeeId", "External employee identifier, sent as a string (1–64 characters)."], ["primaryEmail", "Personal or primary email address where the setup invitation is delivered."], ["assignedEmail", "Company email address to assign, such as taylor@company.example."]].map(([field, description]) => (
                  <div key={field} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4"><dt><code className="font-mono text-xs font-semibold text-[#286653]">{field}</code></dt><dd className="text-sm leading-6 text-[#606a61]">{description}</dd></div>
                ))}
              </dl>
              <div className="mt-5"><CodeBlock copyValue={requestExample}>{requestExample}</CodeBlock></div>
            </section>

            <section id="call" className="mt-10 scroll-mt-8">
              <h2 className="text-2xl font-medium tracking-tight">Make a request</h2>
              <p className="mt-3 text-sm leading-6 text-[#606a61]">Set the base URL and API key as server-side environment variables in the calling tool, then use the example below.</p>
              <div className="mt-5"><CodeBlock copyValue={curlExample}>{curlExample}</CodeBlock></div>
            </section>

            <section id="response" className="mt-10 scroll-mt-8">
              <h2 className="text-2xl font-medium tracking-tight">Success response</h2>
              <p className="mt-3 text-sm leading-6 text-[#606a61]">A new invitation returns HTTP 201. The setup email is sent to <code className="font-mono text-xs">primaryEmail</code>.</p>
              <div className="mt-5"><CodeBlock copyValue={`{
  "ok": true,
  "employee": {
    "name": "Taylor Morgan",
    "employeeId": "EMP-1042",
    "primaryEmail": "taylor@example.com",
    "assignedEmail": "taylor.morgan@mail.example.com"
  },
  "invitationStatus": "pending",
  "emailSent": true
}`}>{`{
  "ok": true,
  "employee": {
    "name": "Taylor Morgan",
    "employeeId": "EMP-1042",
    "primaryEmail": "taylor@example.com",
    "assignedEmail": "taylor.morgan@mail.example.com"
  },
  "invitationStatus": "pending",
  "emailSent": true
}`}</CodeBlock></div>
              <p className="mt-3 text-sm leading-6 text-[#606a61]">An identical request for an existing active invitation is idempotent: it returns success with <code className="font-mono text-xs">emailSent: false</code> and does not send a duplicate email. Employees created this way start without a department; an admin can assign one later.</p>
            </section>

            <section id="errors" className="mt-10 scroll-mt-8">
              <h2 className="text-2xl font-medium tracking-tight">Errors</h2>
              <div className="mt-4 overflow-x-auto border-y border-[#e3e5de]">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead><tr className="border-b border-[#e3e5de] text-xs uppercase tracking-wide text-[#738077]"><th className="py-3 pr-4 font-semibold">HTTP</th><th className="py-3 pr-4 font-semibold">Code</th><th className="py-3 font-semibold">Meaning</th></tr></thead>
                  <tbody>{errors.map(([status, code, meaning]) => <tr key={status} className="border-b border-[#e3e5de] last:border-0"><td className="py-3 pr-4 font-mono text-xs">{status}</td><td className="py-3 pr-4 font-mono text-xs text-[#286653]">{code}</td><td className="py-3 text-[#606a61]">{meaning}</td></tr>)}</tbody>
                </table>
              </div>
            </section>

            <section id="agent-prompt" className="mt-12 scroll-mt-8 border border-[#d9ded7] bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#557066]">Agent handoff</p><h2 className="mt-2 text-2xl font-medium tracking-tight">Prompt to configure an external tool</h2></div>
                <CopyButton value={agentPrompt} label="Copy prompt" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[#606a61]">Give this prompt to the agent building the integration. It tells the agent how to handle credentials, field mapping, responses, and live calls.</p>
              <pre className="mt-5 max-h-[560px] overflow-auto whitespace-pre-wrap border border-[#e3e5de] bg-[#fafaf7] p-4 text-xs leading-6 text-[#3d4840] sm:text-sm"><code>{agentPrompt}</code></pre>
            </section>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#202820]/10 pt-6 text-sm">
              <Link href="/manual" className="inline-flex items-center gap-2 text-[#52645a] hover:text-[#193e37]">Read the user guide <ArrowRight size={14} /></Link>
              <Link href="/admin/employees" className="inline-flex items-center gap-2 font-medium text-[#286653] hover:text-[#193e37]">Manage employees in Mailico <ArrowRight size={14} /></Link>
            </div>
          </article>

          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-8 border-l border-[#d9ded7] pl-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#77827a]">On this page</p>
              <ul className="space-y-2.5 text-sm text-[#606a61]">
                {[["requirements", "Before you connect"], ["endpoint", "Endpoint & auth"], ["request", "Request fields"], ["call", "Make a request"], ["response", "Success response"], ["errors", "Errors"], ["agent-prompt", "Agent prompt"]].map(([id, label]) => <li key={id}><a className="transition-colors hover:text-[#286653]" href={`#${id}`}>{label}</a></li>)}
              </ul>
            </nav>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#202820]/10 py-6 text-xs text-[#738077]">
          <span>{appName} · Employee API</span>
          <Link href="/" className="hover:text-[#193e37]">Return to {appName} <ArrowRight size={12} className="ml-1 inline" /></Link>
        </footer>
      </div>
    </main>
  );
}
