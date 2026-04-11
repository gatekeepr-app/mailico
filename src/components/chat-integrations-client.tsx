'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SlackIntegrationResult = {
  integrationId: string
  webhookUrl: string
}

export default function ChatIntegrationsClient() {
  const [signingSecret, setSigningSecret] = useState('')
  const [teamId, setTeamId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SlackIntegrationResult | null>(null)

  const createIntegration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!signingSecret.trim()) {
      toast.error('Slack signing secret is required')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/chat/integrations/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signingSecret: signingSecret.trim(),
          teamId: teamId.trim() || undefined
        })
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to create integration')
      }

      setResult({
        integrationId: payload.integrationId,
        webhookUrl: payload.webhookUrl
      })
      toast.success('Slack integration created')
      setSigningSecret('')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create integration')
    } finally {
      setLoading(false)
    }
  }

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }

  return (
    <form onSubmit={createIntegration} className='space-y-4'>
      <div className='grid gap-3 md:grid-cols-2'>
        <div>
          <label className='text-xs font-semibold text-slate-600 dark:text-slate-300'>
            Slack signing secret
          </label>
          <Input
            type='password'
            value={signingSecret}
            onChange={event => setSigningSecret(event.target.value)}
            placeholder='Enter your Slack app signing secret'
            className='mt-2'
            autoComplete='off'
          />
        </div>
        <div>
          <label className='text-xs font-semibold text-slate-600 dark:text-slate-300'>
            Slack team ID (optional)
          </label>
          <Input
            value={teamId}
            onChange={event => setTeamId(event.target.value)}
            placeholder='T0123ABC'
            className='mt-2'
          />
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <Button type='submit' disabled={loading}>
          {loading ? 'Creating…' : 'Create Slack integration'}
        </Button>
        <p className='text-xs text-slate-500 dark:text-slate-400'>
          You will receive a webhook URL to paste into Slack Events API.
        </p>
      </div>

      {result ? (
        <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'>
          <div className='grid gap-2 md:grid-cols-[1fr_auto]'>
            <div>
              <p className='font-semibold text-slate-600 dark:text-slate-300'>
                Integration ID
              </p>
              <p className='mt-1 break-all'>{result.integrationId}</p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => copy(result.integrationId, 'Integration ID')}
              >
                Copy
              </Button>
            </div>
          </div>
          <div className='mt-3 grid gap-2 md:grid-cols-[1fr_auto]'>
            <div>
              <p className='font-semibold text-slate-600 dark:text-slate-300'>
                Webhook URL
              </p>
              <p className='mt-1 break-all'>{result.webhookUrl}</p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => copy(result.webhookUrl, 'Webhook URL')}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  )
}
