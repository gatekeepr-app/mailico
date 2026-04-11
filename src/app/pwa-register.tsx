'use client'
import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister())
      })
      return
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[PWA] SW registered:', reg.scope)
      })
      .catch(err => console.warn('[PWA] SW registration failed:', err))
  }, [])

  return null
}
