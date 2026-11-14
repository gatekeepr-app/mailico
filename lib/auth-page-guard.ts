import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, isAuthenticated } from "@/lib/auth-server";

export async function redirectAuthenticatedVisitors() {
  if (!(await isAuthenticated())) return;

  const profileData = await fetchAuthQuery(api.profiles.getMyProfile, {});
  redirect(profileData?.companySettings ? "/mail" : "/setup");
}