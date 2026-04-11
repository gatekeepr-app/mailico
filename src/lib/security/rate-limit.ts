type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  windowMs: number
  limit: number
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

declare global {
  // eslint-disable-next-line no-var
  var __mailicoRateLimitStore: Map<string, RateLimitEntry> | undefined
}

const store =
  globalThis.__mailicoRateLimitStore ??
  (globalThis.__mailicoRateLimitStore = new Map())

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

export function rateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs
    store.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      resetAt
    }
  }

  const nextCount = existing.count + 1
  existing.count = nextCount
  store.set(key, existing)

  return {
    allowed: nextCount <= options.limit,
    remaining: Math.max(0, options.limit - nextCount),
    resetAt: existing.resetAt
  }
}
