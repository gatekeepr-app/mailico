import { getIdentityDbUrl } from './config'

type IdentityError = {
  error?: string
  message?: string
}

export async function identityRequest<TResponse>(
  path: string,
  payload: Record<string, unknown>
): Promise<TResponse> {
  const url = `${getIdentityDbUrl()}${path}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  let data: any = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object'
        ? (data as IdentityError)?.error || (data as IdentityError)?.message
        : undefined
    throw new Error(message || 'Identity service request failed')
  }

  return data as TResponse
}
