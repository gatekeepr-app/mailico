import type { ReactNode } from "react";
import { redirectAuthenticatedVisitors } from "@/lib/auth-page-guard";

export default async function LoginLayout({ children }: Readonly<{ children: ReactNode }>) {
  await redirectAuthenticatedVisitors();
  return children;
}