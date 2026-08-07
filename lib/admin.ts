export const ADMIN_EMAIL = "contact.gatekeepr@gmail.com";
export const ADMIN_PAGE_ROLES = ["admin", "chief", "hrLead", "hr"] as const;

export function isAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}

export function canAccessAdminPage(
  email: string | null | undefined,
  role: string | null | undefined,
) {
  return isAdminEmail(email) || ADMIN_PAGE_ROLES.includes(role as never);
}

export function canChangeRoles(
  email: string | null | undefined,
  role: string | null | undefined,
) {
  return isAdminEmail(email) || role === "chief";
}
