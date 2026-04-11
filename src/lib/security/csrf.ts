export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  const expected =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    new URL(request.url).origin

  if (origin) {
    if (origin !== expected) {
      return { error: 'Invalid request origin' }
    }
    return null
  }

  if (referer) {
    if (!referer.startsWith(expected)) {
      return { error: 'Invalid request origin' }
    }
    return null
  }

  if (!origin && !referer) {
    return { error: 'Invalid request origin' }
  }

  return null
}
