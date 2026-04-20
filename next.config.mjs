/** @type {import('next').NextConfig} */
import withSerwistInit from '@serwist/next'

process.env.SERWIST_SUPPRESS_TURBOPACK_WARNING = '1'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  reloadOnOnline: true,
  disable: process.env.NODE_ENV !== 'production'
})

const remoteHosts = (process.env.NEXT_IMAGE_REMOTE_HOSTS || 'i.pravatar.cc')
  .split(',')
  .map(host => host.trim())
  .filter(Boolean)

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    remotePatterns: remoteHosts.map(hostname => ({
      protocol: 'https',
      hostname
    }))
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'Service-Worker-Allowed', value: '/' }
        ]
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }]
      },
      {
        source: '/favicon/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }]
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

export default withSerwist(nextConfig)
