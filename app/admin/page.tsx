import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import AdminPanel from "@/components/AdminPanel";

export default async function AdminPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
  return <AdminPanel />;
}
