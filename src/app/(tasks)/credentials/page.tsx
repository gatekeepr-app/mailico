import { redirect } from 'next/navigation'

import CredentialsClient from '@/components/credentials-client'
import { getIdentityFromCookies } from '@/lib/identity/server'

export default async function CredentialsPage() {
  const session = await getIdentityFromCookies()

  if (!session) redirect('/auth?next=/credentials')

  return (
    <main className='mx-auto w-full max-w-[1100px] px-4 py-10'>
      <CredentialsClient />
    </main>
  )
}
