import { Link } from '@tanstack/react-router'
import { Brand } from '@/components/Brand'

export function PublicHeader({ dark = false }: { dark?: boolean }) {
  return <header className={`relative z-20 border-b ${dark ? 'border-white/10 text-white' : 'border-slate-200 bg-white/90 text-slate-900 backdrop-blur'}`}><div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6"><Link to="/" aria-label="MineSaksham home"><Brand inverse={dark}/></Link><nav className="flex items-center gap-2 text-sm font-semibold" aria-label="Public navigation"><Link to="/sign-in" className={`rounded-lg px-3 py-2 ${dark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>Sign In</Link><Link to="/create-account" className="hidden rounded-lg border border-current/20 px-3 py-2 sm:block">Create Account</Link><Link to="/demo" className={`rounded-lg px-3 py-2 ${dark ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-950 text-white'}`}>Try Demo</Link></nav></div></header>
}
