import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createDemoSession, prototypeAuthService, sessionFromAuthUser } from '@/services/auth'
import { getCurrentOrganization } from '@/services/organizations'
import { supabase } from '@/config/supabase'
import type { Organization, PublicRole, SessionUser } from '@/types/domain'

interface SessionContextValue {
  session: SessionUser | null
  ready: boolean
  organization: Organization | null
  startDemo: (role: PublicRole) => void
  signOut: () => void
  refreshOrganization: () => Promise<void>
  applyAuthenticatedSession: (next: SessionUser) => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)
const storageKey = 'minesaksham-demo-session'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [ready, setReady] = useState(false)

  async function loadOrganization(nextSession: SessionUser | null) {
    if (!nextSession || nextSession.isDemo) {
      setOrganization(null)
      return
    }
    try {
      const current = await getCurrentOrganization()
      setOrganization(current)
      if (current) {
        setSession((currentSession) => currentSession && !currentSession.isDemo ? { ...currentSession, organization: current.name, organizationId: current.id } : currentSession)
      }
    } catch {
      setOrganization(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    const stored = window.sessionStorage.getItem(storageKey)
    if (stored) {
      setSession(JSON.parse(stored) as SessionUser)
      setOrganization(null)
      setReady(true)
    }

    const { data } = supabase.auth.onAuthStateChange((_event, authSession) => {
      void (async () => {
        if (window.sessionStorage.getItem(storageKey)) return
        if (!authSession?.user) {
          if (!cancelled) {
            setSession(null)
            setOrganization(null)
          }
          return
        }
        const next = await sessionFromAuthUser(authSession.user)
        if (cancelled) return
        setSession(next)
        await loadOrganization(next)
      })()
    })

    if (!stored) {
      void (async () => {
        const next = await prototypeAuthService.getSession()
        if (cancelled || window.sessionStorage.getItem(storageKey)) {
          setReady(true)
          return
        }
        setSession(next)
        await loadOrganization(next)
        setReady(true)
      })()
    }

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<SessionContextValue>(() => ({
    session,
    ready,
    organization,
    startDemo: (role) => {
      const next = createDemoSession(role)
      window.sessionStorage.setItem(storageKey, JSON.stringify(next))
      setOrganization(null)
      setSession(next)
    },
    signOut: () => {
      const wasDemo = session?.isDemo
      window.sessionStorage.removeItem(storageKey)
      setOrganization(null)
      setSession(null)
      if (!wasDemo) void prototypeAuthService.signOut()
    },
    refreshOrganization: async () => {
      await loadOrganization(session)
    },
    applyAuthenticatedSession: async (next) => {
      window.sessionStorage.removeItem(storageKey)
      setSession(next)
      await loadOrganization(next)
    },
  }), [organization, ready, session])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used within SessionProvider')
  return context
}
