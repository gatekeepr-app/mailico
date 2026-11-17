import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";
import { canAccessAdminPage } from "@/lib/admin";

const links = [
  ["Overview", "/admin"],
  ["Employees", "/admin/employees"],
  ["Departments", "/admin/departments"],
  ["Address requests", "/admin/requests"],
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!(await isAuthenticated())) redirect("/login");
  const authUser = await fetchAuthQuery(api.auth.getCurrentUser, {});
  if (!authUser) redirect("/login");
  if (!authUser.emailVerified) redirect(`/verify-email?email=${encodeURIComponent(authUser.email)}`);
  const data = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (!data?.companySettings) redirect("/setup");
  if (data.profile?.role === "admin" && !data.companySettings.isOwner) redirect("/mail");
  if (!canAccessAdminPage(data.user?.email, data.profile?.role)) redirect("/mail");

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f0] text-[#20332b]">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-[#d9ddd6] bg-[#fbfbf8] px-4 sm:px-6">
        <div className="flex items-center gap-3"><Link href="/admin" className="text-lg font-semibold tracking-tight">{process.env.NEXT_PUBLIC_APP_NAME || "Mailico"}</Link><span className="hidden border-l border-[#d9ddd6] pl-3 text-sm text-[#718078] sm:inline">Admin workspace</span></div>
        <div className="flex items-center gap-3 text-sm"><span className="hidden text-[#718078] md:inline">{data.companySettings.domain}</span><Link className="text-[#286653] hover:underline" href="/mail">Open mailbox</Link></div>
      </header>
      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-[#d9ddd6] bg-[#fbfbf8] p-3 lg:min-h-[calc(100dvh-4rem)] lg:border-b-0 lg:border-r lg:p-5">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#819087]">Workspace</p>
          <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto lg:flex-col">
            {links.map(([label, href]) => <Link key={href} href={href} className="whitespace-nowrap px-3 py-2.5 text-sm text-[#52635b] hover:bg-[#e9eee9] hover:text-[#20332b]">{label}</Link>)}
            {data.companySettings.isOwner && <><p className="hidden px-3 pb-1 pt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#819087] lg:block">Owner</p><Link href="/admin/settings" className="whitespace-nowrap px-3 py-2.5 text-sm text-[#52635b] hover:bg-[#e9eee9] hover:text-[#20332b]">Mail settings</Link></>}
          </nav>
          <div className="mt-8 hidden border-t border-[#e5e8e1] px-3 pt-4 text-xs leading-5 text-[#819087] lg:block"><p className="font-medium text-[#52635b]">Sending domain</p><p className="mt-1 break-all">{data.companySettings.domain}</p></div>
        </aside>
        <section className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</section>
      </div>
    </div>
  );
}
