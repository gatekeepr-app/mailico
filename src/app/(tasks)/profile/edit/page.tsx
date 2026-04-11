import { redirect } from 'next/navigation'

import ProfileEditClient from '@/components/profile-edit'
import { getIdentityFromCookies } from '@/lib/identity/server'

export default async function EditProfilePage() {
  const session = await getIdentityFromCookies()

  if (!session) redirect('/auth?next=/profile/edit')

  return <ProfileEditClient />
}
