import Link from 'next/link'

const connectors = [
  {
    title: 'Meta tools',
    desc: 'Sync campaigns, audience signals, and message threads.'
  },
  {
    title: 'Slack',
    desc: 'Send alerts, route approvals, and track handoffs.'
  },
  {
    title: 'Telegram',
    desc: 'Bridge automated notifications to private channels.'
  },
  {
    title: 'Webhooks',
    desc: 'Push events into your data lake or workflow engine.'
  }
]

const tools = [
  { label: 'API Keys', href: '/developers' },
  { label: 'Events', href: '/developers/logs' },
  { label: 'Webhooks', href: '/developers/webhooks' }
]

export default function IntegrationsPage() {
  return (
    <main className='mx-auto w-full max-w-6xl px-2 pb-28 pt-6 md:px-8 md:pb-10'>
      <div className='flex flex-col gap-2'>
        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-500'>
          Integrations
        </p>
        <h1 className='text-2xl font-semibold tracking-tight'>
          Interoperable by default
        </h1>
        <p className='max-w-2xl text-sm text-muted-foreground'>
          Connect Mailico to the tools your teams already use. Centralize
          communications across email, social, and automated systems without
          losing context.
        </p>
      </div>

      <section className='mt-6 grid grid-cols-1 gap-3 md:grid-cols-2'>
        {connectors.map(connector => (
          <div
            key={connector.title}
            className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'
          >
            <p className='text-sm font-semibold text-slate-900 dark:text-white'>
              {connector.title}
            </p>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
              {connector.desc}
            </p>
          </div>
        ))}
      </section>

      <section className='mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h2 className='text-base font-semibold text-slate-900 dark:text-white'>
              Developer tooling
            </h2>
            <p className='text-xs text-slate-500 dark:text-slate-400'>
              Control how data moves across channels and systems.
            </p>
          </div>
          <Link
            href='/control'
            className='text-xs font-semibold text-emerald-600 hover:underline'
          >
            View control center →
          </Link>
        </div>

        <div className='mt-4 flex flex-wrap gap-2'>
          {tools.map(tool => (
            <Link
              key={tool.label}
              href={tool.href}
              className='rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 dark:border-white/10 dark:text-white/80'
            >
              {tool.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
