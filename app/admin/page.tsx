import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";
import { canAccessAdminPage } from "@/lib/admin";
import AdminPanel from "@/components/AdminPanel";

export default async function AdminPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
  const profileData = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (!canAccessAdminPage(profileData?.user?.email, profileData?.profile?.role)) {
    redirect("/mail");
  }
  return <AdminPanel />;
}
