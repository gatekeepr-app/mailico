import GlobalAuthNav from '@/components/global-auth-nav'
import { Toaster } from '@/components/ui/sonner'
import { getIdentityFromCookies } from '@/lib/identity/server'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ConvexClientProvider } from './ConvexClientProvider'
import './globals.css'
import PwaRegister from './pwa-register'

const inter = Inter({ subsets: ['latin'] })

const APP_NAME = 'Mailico'
const APP_DEFAULT_TITLE = 'Mailico — Email infrastructure for product teams'
const APP_TITLE_TEMPLATE = '%s - Mailico'
const APP_DESCRIPTION =
  'The modern email layer for SaaS. Ship transactional & marketing emails from one dashboard.'

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE
  },
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',

  // 🔥 Light & dark browser UI colors
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#05060A' }
  ],

  // 🧊 Light / dark favicons
  icons: {
    icon: [
      { url: '/favicon-light.svg', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-dark.svg', media: '(prefers-color-scheme: dark)' }
    ],
    apple: '/favicon/icon-192.png'
  },

  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_DEFAULT_TITLE
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  },
  twitter: {
    card: 'summary',
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  minimumScale: 1,
  maximumScale: 1
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getIdentityFromCookies()

  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${inter.className} bg-background text-foreground antialiased`}
      >
        <ConvexClientProvider>
          <GlobalAuthNav user={session?.user} />
          <div className='mx-auto flex min-h-screen flex-col bg-background text-foreground transition-colors'>
            <main className='flex grow flex-col'>{children}</main>
          </div>
          <PwaRegister />
          <Toaster />
        </ConvexClientProvider>
      </body>
    </html>
  )
}
