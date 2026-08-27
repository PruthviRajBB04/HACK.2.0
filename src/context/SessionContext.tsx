import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createDemoSession } from '@/services/auth'
import type { PublicRole, SessionUser } from '@/types/domain'

interface SessionContextValue { session: SessionUser | null; ready: boolean; startDemo: (role: PublicRole) => void; signOut: () => void }
const SessionContext = createContext<SessionContextValue | null>(null)
const storageKey = 'minesaksham-demo-session'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => { const stored = window.sessionStorage.getItem(storageKey); if (stored) setSession(JSON.parse(stored) as SessionUser); setReady(true) }, [])
  const value = useMemo<SessionContextValue>(() => ({ session, ready, startDemo: (role) => { const next = createDemoSession(role); window.sessionStorage.setItem(storageKey, JSON.stringify(next)); setSession(next) }, signOut: () => { window.sessionStorage.removeItem(storageKey); setSession(null) } }), [ready, session])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
export function useSession() { const context = useContext(SessionContext); if (!context) throw new Error('useSession must be used within SessionProvider'); return context }
