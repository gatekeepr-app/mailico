import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL

export function createConvexServerClient() {
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured')
  }

  return new ConvexHttpClient(convexUrl)
}

export { api }
