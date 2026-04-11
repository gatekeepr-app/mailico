import Link from 'next/link'

const channels = [
  {
    title: 'Meta Suite',
    desc: 'Sync comments, DMs, and ad responses into shared inbox views.'
  },
  {
    title: 'Slack',
    desc: 'Route priority conversations to team channels in real time.'
  },
  {
    title: 'Telegram',
    desc: 'Capture customer signals and automate follow-ups.'
  }
]

const workflows = [
  {
    title: 'Social to email handoff',
    desc: 'Convert high-intent threads into verified email sequences.'
  },
  {
    title: 'Auto-triage',
    desc: 'Tag, assign, and respond with SLA-backed automations.'
  },
  {
    title: 'Escalation lanes',
    desc: 'Notify sales or support when sentiment changes.'
  }
]

export default function SocialPage() {
  return (
    <main className='mx-auto w-full max-w-6xl px-2 pb-28 pt-6 md:px-8 md:pb-10'>
      <div className='flex flex-col gap-2'>
        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-500'>
          Social Hub
        </p>
        <h1 className='text-2xl font-semibold tracking-tight'>
          Unified social engagement
        </h1>
        <p className='max-w-2xl text-sm text-muted-foreground'>
          Mailico centralizes social messages alongside professional email so
          teams can orchestrate automated, cross-channel workflows from one
          dashboard.
        </p>
      </div>

      <section className='mt-6 grid grid-cols-1 gap-3 md:grid-cols-3'>
        {channels.map(channel => (
          <div
            key={channel.title}
            className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'
          >
            <p className='text-sm font-semibold text-slate-900 dark:text-white'>
              {channel.title}
            </p>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
              {channel.desc}
            </p>
          </div>
        ))}
      </section>

      <section className='mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h2 className='text-base font-semibold text-slate-900 dark:text-white'>
              Automation playbooks
            </h2>
            <p className='text-xs text-slate-500 dark:text-slate-400'>
              Orchestrate multi-channel sequences without leaving Mailico.
            </p>
          </div>
          <Link
            href='/automation'
            className='text-xs font-semibold text-emerald-600 hover:underline'
          >
            Manage automations →
          </Link>
        </div>

        <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-3'>
          {workflows.map(flow => (
            <div
              key={flow.title}
              className='rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10'
            >
              <p className='font-medium text-slate-900 dark:text-white'>
                {flow.title}
              </p>
              <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
                {flow.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
