import { ShieldCheck } from 'lucide-react'
import { appConfig } from '@/config/app'

export function Brand({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return <div className="flex items-center gap-3"><div className={`relative grid size-10 place-items-center rounded-xl ${inverse ? 'bg-white/10 text-amber-300' : 'bg-emerald-950 text-amber-400'}`}><ShieldCheck className="size-6" strokeWidth={1.8}/><span className="absolute -bottom-1 h-1.5 w-5 rounded-full bg-amber-600"/></div>{!compact && <div><div className={`font-display text-lg font-semibold leading-none ${inverse ? 'text-white' : 'text-emerald-950'}`}>{appConfig.name}</div><div className={`mt-1 text-[9px] font-bold uppercase tracking-[.18em] ${inverse ? 'text-emerald-100/60' : 'text-slate-500'}`}>Governance Intelligence</div></div>}</div>
}
