import { redirect } from "next/navigation";
import AdminPanel from "@/components/AdminPanel";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery } from "@/lib/auth-server";
export default async function Page() {
  const data = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (!data?.companySettings?.isOwner) redirect("/admin");
  return <AdminPanel section="settings" />;
}
