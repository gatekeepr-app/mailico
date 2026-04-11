import crypto from 'crypto'

const PREFIX = 'enc:v1:'

function getKey() {
  const raw = process.env.CREDENTIALS_SECRET
  if (!raw) {
    throw new Error('CREDENTIALS_SECRET is not configured')
  }
  return crypto.createHash('sha256').update(raw).digest()
}

export function encryptSecret(value: string | null | undefined) {
  if (!value) return value
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final()
  ])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) return value
  if (!value.startsWith(PREFIX)) return value
  const raw = value.slice(PREFIX.length)
  const segments = raw.split(':')
  if (segments.length !== 3) {
    throw new Error('Invalid encrypted secret format')
  }
  const [ivB64, tagB64, dataB64] = segments
  const key = getKey()
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  if (tag.length !== 16) {
    throw new Error('Invalid authentication tag length')
  }
  const data = Buffer.from(dataB64, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, {
    authTagLength: 16
  })
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}
