import { NextResponse, type NextRequest } from 'next/server'

import { IDENTITY_COOKIE_NAME, getIdentityDbUrl } from '@/lib/identity/config'

async function validateSession(sessionToken: string) {
  try {
    const response = await fetch(`${getIdentityDbUrl()}/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken })
    })
    if (!response.ok) return false
    const payload = await response.json().catch(() => null)
    return Boolean(payload)
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname
  const isProtected =
    pathname.startsWith('/sent') ||
    pathname.startsWith('/inbox') ||
    pathname.startsWith('/scheduled') ||
    pathname.startsWith('/sms') ||
    pathname.startsWith('/automation') ||
    pathname.startsWith('/social') ||
    pathname.startsWith('/integrations') ||
    pathname.startsWith('/control') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/credentials') ||
    pathname.startsWith('/profile')

  const sessionToken = request.cookies.get(IDENTITY_COOKIE_NAME)?.value
  let isAuthenticated = false

  if (sessionToken) {
    isAuthenticated = await validateSession(sessionToken)
    if (!isAuthenticated) {
      response.cookies.delete(IDENTITY_COOKIE_NAME)
    }
  }

  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/sent/:path*',
    '/inbox/:path*',
    '/scheduled/:path*',
    '/sms/:path*',
    '/automation/:path*',
    '/social/:path*',
    '/integrations/:path*',
    '/control/:path*',
    '/billing/:path*',
    '/credentials/:path*',
    '/profile/:path*'
  ]
}
