import { createClient } from '@supabase/supabase-js'
import { ConvexHttpClient } from 'convex/browser'
import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { api } from '../convex/_generated/api.js'

config()
const localEnvPath = resolve(process.cwd(), '.env.local')
if (existsSync(localEnvPath)) {
  config({ path: localEnvPath, override: true })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const convexUrl =
  process.env.CONVEX_MIGRATION_URL || process.env.NEXT_PUBLIC_CONVEX_URL

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Supabase credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and a key.'
  )
  process.exit(1)
}

if (!convexUrl) {
  console.error(
    'Convex URL missing. Set NEXT_PUBLIC_CONVEX_URL or CONVEX_MIGRATION_URL.'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
const convex = new ConvexHttpClient(convexUrl)
const adminSecret = process.env.CONVEX_ADMIN_SECRET

if (!adminSecret) {
  console.error('CONVEX_ADMIN_SECRET is required for migration scripts.')
  process.exit(1)
}

const DEFAULT_BATCH = 500

const isMissingTableError = error => {
  const message = error?.message ?? ''
  return (
    message.includes('Could not find the table') ||
    message.includes('relation "mailboxes" does not exist')
  )
}

async function iterateTable(table, handler, options = {}) {
  const batchSize = options.batchSize ?? DEFAULT_BATCH
  let offset = 0
  while (true) {
    let query = supabase.from(table).select(options.columns ?? '*')
    if (options.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.ascending !== false,
        nullsFirst: true
      })
    }

    const { data, error } = await query.range(offset, offset + batchSize - 1)
    if (error) {
      const root = error?.message || 'unknown error'
      if (error?.cause?.message) {
        throw new Error(
          `Failed to read ${table}: ${root} (${error.cause.message})`
        )
      }
      throw new Error(`Failed to read ${table}: ${root}`)
    }
    if (!data || data.length === 0) break

    for (const row of data) {
      await handler(row)
    }

    offset += batchSize
    if (data.length < batchSize) break
  }
}

const clean = value => {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' && value.trim() === '') return undefined
  return value
}

async function migrateProfiles() {
  let count = 0
  await iterateTable('profiles', async profile => {
    await convex.mutation(api.profiles.save, {
      userId: profile.user_id,
      adminSecret,
      profile: {
        email: clean(profile.email),
        name: clean(profile.name ?? profile.full_name),
        domain: clean(profile.domain),
        phone: clean(profile.phone),
        country: clean(profile.country),
        avatar: clean(profile.avatar),
        resend_api_key: clean(profile.resend_api_key),
        plan: clean(profile.plan),
        plan_name: clean(profile.plan_name),
        webhook_secret: clean(profile.webhook_secret)
      }
    })
    count += 1
    if (count % 50 === 0) {
      console.log(`  profiles migrated: ${count}`)
    }
  })
  console.log(`✓ Profiles migrated (${count})`)
}

async function migrateSenders() {
  let count = 0
  await iterateTable('sender_identities', async sender => {
    try {
      await convex.mutation(api.senderIdentities.create, {
        userId: sender.user_id,
        adminSecret,
        name: sender.name,
        address: sender.address,
        verified: sender.verified ?? true,
        createdAt: sender.created_at ?? undefined
      })
      count += 1
      if (count % 50 === 0) {
        console.log(`  sender identities migrated: ${count}`)
      }
    } catch (err) {
      console.warn(`  skipped sender ${sender.address}: ${err.message}`)
    }
  })
  console.log(`✓ Sender identities migrated (${count})`)
}

async function migrateMailboxes() {
  let count = 0
  try {
    await iterateTable('mailboxes', async mailbox => {
      await convex.mutation(api.mailboxes.upsert, {
        userId: mailbox.user_id,
        adminSecret,
        address: mailbox.address,
        createdAt: mailbox.created_at ?? undefined
      })
      count += 1
      if (count % 100 === 0) console.log(`  mailboxes migrated: ${count}`)
    })
    console.log(`✓ Mailboxes migrated (${count})`)
  } catch (err) {
    if (isMissingTableError(err)) {
      console.warn(
        'Skipping mailbox migration: Supabase table "mailboxes" was not found.'
      )
      return
    }
    throw err
  }
}

async function migrateUsageMetrics() {
  let count = 0
  await iterateTable('usage_metrics', async metric => {
    const emailsSent = metric.emails_sent || 0
    if (emailsSent === 0) return
    await convex.mutation(api.usage.incrementEmailCount, {
      userId: metric.user_id,
      adminSecret,
      amount: emailsSent
    })
    count += 1
  })
  console.log(`✓ Usage metrics migrated (${count})`)
}

async function migrateEmails() {
  const batch = []
  let total = 0
  const flush = async () => {
    if (!batch.length) return
    await convex.mutation(api.emails.bulkInsert, {
      adminSecret,
      emails: [...batch]
    })
    batch.length = 0
  }

  await iterateTable(
    'emails',
    async email => {
      batch.push({
        user_id: email.user_id,
        direction: email.direction,
        from_email: email.from_email,
        to_email: email.to_email,
        subject: email.subject ?? '(no subject)',
        message: clean(email.message),
        starred: email.starred ?? false,
        created_at: email.created_at ?? undefined,
        scheduled_at: email.scheduled_at ?? undefined,
        legacy_id: email.id ? String(email.id) : undefined
      })

      if (batch.length >= 100) {
        await flush()
      }

      total += 1
      if (total % 200 === 0) {
        console.log(`  emails prepared: ${total}`)
      }
    },
    { batchSize: 500 }
  )

  await flush()
  console.log(`✓ Emails migrated (${total})`)
}

async function main() {
  console.log('Starting Supabase → Convex migration...')
  await migrateProfiles()
  await migrateSenders()
  await migrateMailboxes()
  await migrateUsageMetrics()
  await migrateEmails()
  console.log('Migration completed!')
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
