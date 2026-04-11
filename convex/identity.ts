import { v } from 'convex/values'

const ADMIN_SECRET = process.env.CONVEX_ADMIN_SECRET

export const authFields = {
  sessionToken: v.optional(v.string()),
  adminSecret: v.optional(v.string())
}

type AuthArgs = {
  sessionToken?: string
  adminSecret?: string
  userId?: string
}

type IdentityUser = {
  _id?: string
  id?: string
  email?: string
}

export function hasAdminAccess(adminSecret?: string) {
  return Boolean(
    adminSecret &&
    ADMIN_SECRET &&
    typeof ADMIN_SECRET === 'string' &&
    ADMIN_SECRET === adminSecret
  )
}

function getIdentityDbUrl() {
  const url =
    process.env.IDENTITY_DB_URL || 'https://lovely-magpie-923.convex.site'
  return url.replace(/\/$/, '')
}

function getIdentityId(user: IdentityUser | null) {
  if (!user) return ''
  return user._id || user.id || user.email || ''
}

async function validateSessionToken(sessionToken: string) {
  const response = await fetch(`${getIdentityDbUrl()}/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken })
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error || payload?.message || 'Unauthorized'
    throw new Error(message)
  }

  return payload as IdentityUser | null
}

export async function ensureUserAuthorization(
  args: AuthArgs,
  options?: { allowAdmin?: boolean }
) {
  if (options?.allowAdmin && hasAdminAccess(args.adminSecret)) {
    if (!args.userId) {
      throw new Error('userId is required when using adminSecret')
    }
    return args.userId
  }

  if (!args.sessionToken) {
    throw new Error('Missing session token')
  }

  const user = await validateSessionToken(args.sessionToken)
  const identityId = getIdentityId(user)

  if (!identityId) {
    throw new Error('Invalid session')
  }

  if (!args.userId) {
    return identityId
  }

  if (args.userId !== identityId) {
    throw new Error('Forbidden')
  }

  return args.userId
}

export function requireAdminAccess(args: { adminSecret?: string }) {
  if (!hasAdminAccess(args.adminSecret)) {
    throw new Error('Forbidden')
  }
}
