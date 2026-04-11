export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return null

  const expected =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    new URL(request.url).origin

  if (origin !== expected) {
    return { error: 'Invalid request origin' }
  }

  return null
}
