import Link from "next/link";
import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "Getting started",
    items: [
      "Create an account at /register or sign in at /login.",
      "After sign-in, open the authenticated mail app at /mail.",
      "Your account profile is created automatically the first time you open the app.",
      "The first profile created becomes the admin account. Later accounts default to user.",
    ],
  },
  {
    title: "Roles",
    items: [
      "Admin can manage roles, departments, and employee addresses.",
      "HR can create departments and assign employee email addresses, but HR cannot grant or modify admin access.",
      "User can send from their assigned company email and only see messages they sent or that were addressed to them.",
    ],
  },
  {
    title: "Assigning company email addresses",
    items: [
      "Admin or HR opens /admin.",
      "Create any departments needed, such as HR, Sales, Engineering, or Operations.",
      "For each employee, choose a role, optional department, and the local part of their company email.",
      "Only the local part is editable. The domain is always mail.darvizlabs.online.",
      "An employee cannot send mail until a company email address is assigned.",
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
      "Drafts auto-save to Convex and follow the signed-in account.",
      "Read/star/trash state is not yet persisted in Convex.",
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
