import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { fetchAuthMutation, fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";
import MailApp from "@/components/MailApp";

export default async function MailPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
  let profileData = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (!profileData?.companySettings) redirect("/setup");
  if (!profileData.profile) {
    try {
      await fetchAuthMutation(api.profiles.ensureCurrentProfile, {});
      profileData = await fetchAuthQuery(api.profiles.getMyProfile, {});
    } catch {
      redirect("/invitation-required");
    }
  }
  if (!profileData?.profile) redirect("/invitation-required");
  return <MailApp />;
}
