import type { ReactNode } from "react";
import { redirectAuthenticatedVisitors } from "@/lib/auth-page-guard";

export default async function RegisterLayout({ children }: Readonly<{ children: ReactNode }>) {
  await redirectAuthenticatedVisitors();
  return children;
}