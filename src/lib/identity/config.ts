const SEVEN_DAYS = 60 * 60 * 24 * 7

export const IDENTITY_COOKIE_NAME = 'workspace_session_token'
export const IDENTITY_SESSION_MAX_AGE = SEVEN_DAYS

export function getIdentityDbUrl() {
  const url =
    process.env.IDENTITY_DB_URL || 'https://lovely-magpie-923.convex.site'
  return url.replace(/\/$/, '')
}

export function isProduction() {
  return process.env.NODE_ENV === 'production'
}
