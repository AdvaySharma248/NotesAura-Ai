'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Clean up browser extension attributes that cause hydration warnings
    const cleanupExtensionAttributes = () => {
      const elements = document.querySelectorAll('[bis_skin_checked], [__processed_d702561d-9d91-45a9-9aa9-ee05d3b78c19__], [bis_register]')
      elements.forEach(el => {
        el.removeAttribute('bis_skin_checked')
        el.removeAttribute('__processed_d702561d-9d91-45a9-9aa9-ee05d3b78c19__')
        el.removeAttribute('bis_register')
      })
    }

    // Run cleanup after hydration
    cleanupExtensionAttributes()
    
    // Also run on DOM changes (when extension modifies DOM)
    const observer = new MutationObserver(cleanupExtensionAttributes)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['bis_skin_checked', '__processed_d702561d-9d91-45a9-9aa9-ee05d3b78c19__', 'bis_register'],
      subtree: true
    })

    return () => observer.disconnect()
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}