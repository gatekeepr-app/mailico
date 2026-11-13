import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";
import MailApp from "@/components/MailApp";

export default async function MailPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
  const profileData = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (!profileData?.companySettings) redirect("/setup");
  return <MailApp />;
}
