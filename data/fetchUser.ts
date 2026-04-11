import { api, createConvexServerClient } from '@/lib/convex/server-client'
import { getIdentityFromCookies, getIdentityId } from '@/lib/identity/server'

export async function fetchUser() {
  const session = await getIdentityFromCookies()

  let userData = {
    name: 'Guest',
    email: 'guest@example.com',
    avatar: '',
    domain: 'example.com',
    plan_name: 'free'
  }

  if (session) {
    const convex = createConvexServerClient()
    const profile = await convex.query(api.profiles.getByUserId, {
      userId: getIdentityId(session.user),
      sessionToken: session.token
    })

    userData = {
      name: profile?.name || session.user?.name || session.user?.email || '',
      email: session.user?.email || '',
      avatar: profile?.avatar || session.user?.avatarUrl || '',
      domain: profile?.domain || 'example.com',
      plan_name: profile?.plan_name || profile?.plan || 'free'
    }
  }

  return userData
}
