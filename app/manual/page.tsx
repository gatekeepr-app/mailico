import Link from "next/link";
import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "Getting started",
    items: [
      "The business owner creates the first account at /register, verifies their real email, then signs in at /login.",
      "The first account to complete setup configures the company domain and becomes the business owner.",
      "The setup page assigns the owner's first company sender address, such as admin@mail.example.com.",
      "After company setup, the business owner invites each employee from /admin. Employees cannot create company accounts through open registration.",
    ],
  },
  {
    title: "Roles",
    items: [
      "Admin creates employee invitations, manages roles and departments, and assigns company email addresses.",
      "Each department has one HR Lead. The owner can invite a new HR Lead to replace the current lead.",
      "HR can create departments and assign employee email addresses, but HR cannot grant or modify admin access.",
      "An employee can send from their assigned company email and only see messages they sent or that were addressed to them.",
    ],
  },
  {
    title: "Assigning company email addresses",
    items: [
      "The business owner opens /admin and creates departments, such as HR, Sales, Engineering, or Operations.",
      "Invite each department's HR Lead first. A department must have an active or invited HR Lead before regular employees can be added.",
      "In Invite an employee, enter the employee's name, real email, company email local part, department, and role.",
      "Mailico emails an invitation link to the real email. It expires after seven days; sending another invitation replaces the previous link.",
      "The employee opens the invitation, creates a password, and verifies their real email using the follow-up verification email.",
      "After verification and sign-in, Mailico activates the assigned company email and department access.",
      "Existing accounts can still use the address request panel; the owner can also assign addresses from the Employees table.",
    ],
  },
  {
    title: "Sending email",
    items: [
      "Open /mail and click Compose.",
      "Add To, Cc, and Bcc recipients as needed.",
      "The From field is read-only and uses your assigned company email.",
      "The sender display name uses the name from account creation/profile sync.",
      "After Resend accepts the message, Mailico records it in Convex.",
    ],
  },
  {
    title: "Viewing mail",
    items: [
      "Users see messages they sent and messages addressed to their account email or assigned company email.",
      "A department HR Lead sees their team's outgoing messages in the Department sent folder. This view is limited to employees currently assigned to that department.",
      "Drafts auto-save to Convex and follow the signed-in account.",
      "Read/unread, starred, and trash status are saved per user.",
    ],
  },
  {
    title: "Password recovery",
    items: [
      "On /login, click Forgot password? to open the reset dialog.",
      "Enter the account email and submit.",
      "If the account exists, Mailico sends a reset email through Resend.",
      "Use the reset link to choose a new password.",
      "Toast notifications show success or failure for sign-in, sign-up, reset request, and reset completion.",
    ],
  },
];

export default function ManualPage() {
  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10">
      <article className="mx-auto max-w-4xl rounded-2xl border bg-background p-6 shadow-sm md:p-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Mailico</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              User Manual
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              A practical guide for admins, HR, and employees using Mailico as
              an internal department email tool.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/mail">Open Mailico</Link>
          </Button>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold tracking-tight">
                {section.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
