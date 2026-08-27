import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { SessionProvider } from '@/context/SessionContext'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'description', content: 'MineSaksham prototype for AI-powered coal mine governance and compliance intelligence.' },
      { title: 'MineSaksham | Governance & Compliance Intelligence' },
    ],
    links: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  return <SessionProvider><Outlet /></SessionProvider>
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body className="bg-stone-50 text-slate-950 antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
