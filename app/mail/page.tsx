import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import MailApp from "@/components/MailApp";

export default async function MailPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
  return <MailApp />;
}
