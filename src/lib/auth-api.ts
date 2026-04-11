const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function ensureOk(response: Response, fallback = 'Request failed') {
  if (response.ok) return

  let payload: any = null
  const text = await response.text().catch(() => '')
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  const errorMessage =
    typeof payload === 'string'
      ? payload
      : payload?.error || payload?.message || fallback

  throw new Error(errorMessage)
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  avatarUrl?: string
) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      name,
      email,
      password,
      avatarUrl: avatarUrl || undefined
    })
  })
  await ensureOk(res, 'Registration failed')
}

export async function signIn(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password })
  })
  await ensureOk(res, 'Login failed')
}

export async function signOut() {
  const res = await fetch('/api/auth/logout', { method: 'POST' })
  await ensureOk(res, 'Failed to sign out')
}

export async function fetchMe() {
  const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' })
  if (!sessionRes.ok) {
    const payload = await sessionRes.json().catch(() => ({}))
    throw new Error(payload?.error || 'Failed to load session')
  }

  const sessionPayload = await sessionRes.json()
  const identity = sessionPayload?.user

  if (!identity) return { user: null }

  const profileRes = await fetch('/api/profile', { cache: 'no-store' })
  if (!profileRes.ok) {
    const payload = await profileRes.json().catch(() => ({}))
    throw new Error(payload?.error || 'Failed to load profile')
  }

  const payload = await profileRes.json()
  const profile = payload?.profile ?? {}
  const senders = payload?.senders ?? []

  return {
    user: {
      id: identity._id || identity.id,
      email: identity.email,
      ...profile,
      default_email: senders
    }
  }
}
