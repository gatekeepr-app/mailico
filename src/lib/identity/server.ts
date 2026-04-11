import { cookies } from 'next/headers'

import {
  IDENTITY_COOKIE_NAME,
  IDENTITY_SESSION_MAX_AGE,
  getIdentityDbUrl,
  isProduction
} from './config'

export type IdentityUser = {
  _id?: string
  id?: string
  email?: string
  name?: string
  avatarUrl?: string
  [key: string]: any
}

type IdentityValidationResult = {
  token: string
  user: IdentityUser
}

async function validateSessionToken(sessionToken: string) {
  const response = await fetch(`${getIdentityDbUrl()}/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken })
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload?.error || payload?.message || 'Identity validation failed'
    throw new Error(message)
  }

  if (!payload) {
    throw new Error('Identity service unavailable')
  }

  return payload as IdentityUser | null
}

export async function setSessionCookie(sessionToken: string) {
  const store = await cookies()
  store.set(IDENTITY_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: IDENTITY_SESSION_MAX_AGE
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(IDENTITY_COOKIE_NAME)
}

export async function getIdentityFromCookies(options?: {
  required?: boolean
  allowCookieMutation?: boolean
}): Promise<IdentityValidationResult | null> {
  const store = await cookies()
  const sessionToken = store.get(IDENTITY_COOKIE_NAME)?.value

  if (!sessionToken) {
    if (options?.required) {
      throw new Error('Unauthorized')
    }
    return null
  }

  let user: IdentityUser | null = null
  try {
    user = await validateSessionToken(sessionToken)
  } catch (error) {
    if (options?.allowCookieMutation) {
      await clearSessionCookie()
    }
    if (options?.required) {
      throw error
    }
    return null
  }

  if (!user) {
    if (options?.allowCookieMutation) {
      await clearSessionCookie()
    }
    if (options?.required) {
      throw new Error('Invalid session')
    }
    return null
  }

  return { token: sessionToken, user }
}

export function getIdentityId(user: IdentityUser) {
  return user._id || user.id || user.email || ''
}

export async function requireIdentity() {
  const session = await getIdentityFromCookies({ required: true })
  if (!session) {
    throw new Error('Unauthorized')
  }
  return {
    token: session.token,
    user: session.user,
    userId: getIdentityId(session.user)
  }
}
