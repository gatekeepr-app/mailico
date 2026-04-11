// app/(app)/control/page.tsx
import CredentialsClient from '@/components/credentials-client'
import { Card } from '@/components/ui/card'
import {
  ArrowRight,
  Bug,
  ExternalLink,
  FileText,
  Key,
  LifeBuoy,
  Shield,
  Webhook
} from 'lucide-react'
import Link from 'next/link'

// -----------------------------
// ✅ CONTROL PAGE
// -----------------------------
export default async function ControlPage() {
  return (
    <main className='mx-auto w-full max-w-6xl px-2 pb-28 pt-6 md:px-8 md:pb-10'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Control</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Security, credentials, and support resources in one place.
        </p>
      </div>

      <section className='mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'>
        <h2 className='text-base font-semibold text-slate-900 dark:text-white'>
          Credentials
        </h2>
        <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
          Manage email and SMS credentials for your workspace.
        </p>
        <div className='mt-4'>
          <CredentialsClient />
        </div>
      </section>

      {/* Support & Trust */}
      <section className='mt-6 grid grid-cols-1 gap-3 md:grid-cols-2'>
        <Card className='rounded-2xl p-4'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <p className='text-sm font-semibold'>Support</p>
              <p className='mt-1 text-sm text-muted-foreground'>
                Get help fast — docs, support, and bug reporting.
              </p>
            </div>
            <LifeBuoy className='h-5 w-5 text-muted-foreground' />
          </div>

          <div className='mt-4 grid gap-2'>
            <RowLink
              href='/support'
              icon={<LifeBuoy className='h-4 w-4' />}
              label='Help Center'
            />
            <RowLink
              href='/support/contact'
              icon={<FileText className='h-4 w-4' />}
              label='Contact Support'
            />
            <RowLink
              href='/support/bug'
              icon={<Bug className='h-4 w-4' />}
              label='Report a Bug'
            />
            <RowLink
              href='/status'
              icon={<ExternalLink className='h-4 w-4' />}
              label='Status Page'
            />
          </div>
        </Card>

        <Card className='rounded-2xl p-4'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <p className='text-sm font-semibold'>Security & Legal</p>
              <p className='mt-1 text-sm text-muted-foreground'>
                Privacy, terms, and security controls.
              </p>
            </div>
            <Shield className='h-5 w-5 text-muted-foreground' />
          </div>

          <div className='mt-4 grid gap-2'>
            <RowLink
              href='/credentials'
              icon={<Key className='h-4 w-4' />}
              label='Credentials'
            />
            <RowLink
              href='/security'
              icon={<Shield className='h-4 w-4' />}
              label='Security'
            />
            <RowLink
              href='/privacy'
              icon={<FileText className='h-4 w-4' />}
              label='Privacy Policy'
            />
            <RowLink
              href='/terms'
              icon={<FileText className='h-4 w-4' />}
              label='Terms of Service'
            />
            <RowLink
              href='/developers/webhooks'
              icon={<Webhook className='h-4 w-4' />}
              label='Webhooks'
            />
          </div>
        </Card>
      </section>
    </main>
  )
}

// -----------------------------
// UI bits
// -----------------------------
function RowLink(props: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={props.href}
      className='group flex items-center justify-between rounded-xl border bg-background/40 px-3 py-2 transition hover:border-foreground/20 hover:bg-foreground/[0.02]'
    >
      <div className='flex min-w-0 items-center gap-2'>
        <span className='shrink-0 text-muted-foreground'>{props.icon}</span>
        <span className='min-w-0 truncate text-sm'>{props.label}</span>
      </div>

      <ArrowRight className='h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5' />
    </Link>
  )
}
