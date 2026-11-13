export const ADMIN_PAGE_ROLES = ["admin", "chief", "hrLead", "hr"] as const;

export function canAccessAdminPage(
  _email: string | null | undefined,
  role: string | null | undefined,
) {
  return ADMIN_PAGE_ROLES.includes(role as never);
}

export function canChangeRoles(
  _email: string | null | undefined,
  role: string | null | undefined,
) {
  return role === "admin" || role === "chief";
}
