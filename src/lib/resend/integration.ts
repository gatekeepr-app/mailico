import { Resend, type GetDomainResponseSuccess } from 'resend'

type WebhookStatus = {
  id?: string
  endpoint?: string
  status?: string
  secret?: string | null
}

export type ResendStatusResponse = {
  domain?: GetDomainResponseSuccess | null
  webhook?: WebhookStatus | null
}

type StatusArgs = {
  apiKey: string
  domain?: string | null
  endpoint: string
}

export async function getResendStatus({
  apiKey,
  domain,
  endpoint
}: StatusArgs): Promise<ResendStatusResponse> {
  const resend = new Resend(apiKey)
  let domainStatus: GetDomainResponseSuccess | null = null
  if (domain?.trim()) {
    domainStatus = await ensureDomain(resend, domain.trim().toLowerCase())
  }

  const webhookStatus = await ensureWebhook(resend, endpoint)

  return {
    domain: domainStatus,
    webhook: webhookStatus
  }
}

async function ensureDomain(
  resend: Resend,
  domainName: string
): Promise<GetDomainResponseSuccess> {
  const list = await resend.domains.list()
  const listData = assertResendSuccess(list, 'list domains')
  let target = listData.data.find(
    entry => entry.name.toLowerCase() === domainName.toLowerCase()
  )

  if (!target) {
    const created = await resend.domains.create({
      name: domainName,
      region: 'us-east-1',
      capabilities: { sending: 'enabled', receiving: 'enabled' }
    })
    target = assertResendSuccess(created, 'create domain')
  }

  const details = await resend.domains.get(target.id)
  return assertResendSuccess(details, 'get domain details')
}

async function ensureWebhook(
  resend: Resend,
  endpoint: string
): Promise<WebhookStatus | null> {
  const normalizedEndpoint = endpoint.trim()
  if (!normalizedEndpoint) return null

  const list = await resend.webhooks.list()
  const listData = assertResendSuccess(list, 'list webhooks')
  const existing = listData.data.find(wh => wh.endpoint === normalizedEndpoint)

  if (existing) {
    const details = await resend.webhooks.get(existing.id)
    const webhook = assertResendSuccess(details, 'fetch webhook details')
    return {
      id: webhook.id,
      endpoint: webhook.endpoint,
      status: webhook.status,
      secret: webhook.signing_secret
    }
  }

  const created = await resend.webhooks.create({
    endpoint: normalizedEndpoint,
    events: ['email.received']
  })
  const webhook = assertResendSuccess(created, 'create webhook')
  return {
    id: webhook.id,
    endpoint: normalizedEndpoint,
    status: 'enabled',
    secret: webhook.signing_secret
  }
}

function assertResendSuccess<T>(
  response: { data: T | null; error: { message?: string } | null },
  action: string
): T {
  if (!response || response.error || !response.data) {
    throw new Error(response?.error?.message || `Resend failed to ${action}`)
  }
  return response.data
}
