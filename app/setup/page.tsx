import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";
import SetupWizard from "@/components/SetupWizard";

export default async function SetupPage() {
  if (!(await isAuthenticated())) redirect("/login");
  const profileData = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (profileData?.companySettings) redirect("/mail");
  return <SetupWizard accountEmail={profileData?.user?.email ?? ""} />;
}
