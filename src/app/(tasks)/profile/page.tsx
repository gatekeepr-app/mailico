import { redirect } from 'next/navigation'

import ProfileClient from '@/components/profile-client'
import { getIdentityFromCookies } from '@/lib/identity/server'

export default async function ProfilePage() {
  const session = await getIdentityFromCookies()

  if (!session) redirect('/auth?next=/profile')

  return <ProfileClient />
}
