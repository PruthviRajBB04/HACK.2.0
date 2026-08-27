import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, BriefcaseBusiness, ClipboardCheck, HardHat, Landmark, UserRoundSearch } from 'lucide-react'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/ui'
import { publicRoles, rolePermissions } from '@/config/app'
import { useSession } from '@/context/SessionContext'
import type { PublicRole } from '@/types/domain'

export const Route = createFileRoute('/demo')({ component: DemoPage })
const icons = { 'Corporate Management': BriefcaseBusiness, 'Mine Manager': HardHat, 'Field Officer': UserRoundSearch, 'Compliance Officer': ClipboardCheck, 'Regulatory Authority': Landmark }
function DemoPage(){const [role,setRole]=useState<PublicRole>('Corporate Management');const {startDemo}=useSession();const navigate=useNavigate();function enter(){startDemo(role);void navigate({to:'/app'})}return <AuthLayout eyebrow="Temporary demonstration session" title="Choose a Demo Mode role" description="Explore role-aware navigation without creating an employee account. This session is temporary and clearly identified as demonstration data."><div className="grid gap-3 sm:grid-cols-2">{publicRoles.map((item)=>{const Icon=icons[item];return <button key={item} type="button" onClick={()=>setRole(item)} className={`rounded-xl border p-4 text-left transition focus-visible:ring-2 focus-visible:ring-emerald-700 ${role===item?'border-emerald-800 bg-emerald-50 ring-1 ring-emerald-800':'border-slate-200 hover:border-slate-400'}`}><div className="flex items-center gap-3"><div className={`grid size-9 place-items-center rounded-lg ${role===item?'bg-emerald-950 text-amber-400':'bg-slate-100 text-slate-600'}`}><Icon className="size-4"/></div><span className="font-semibold text-slate-800">{item}</span></div><p className="mt-3 text-xs leading-5 text-slate-500">{rolePermissions[item].join(' · ')}</p></button>})}</div><div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Demo Mode:</strong> No permanent user is created. The selected role only configures this temporary browser session.</div><Button onClick={enter} className="mt-5 w-full">Enter Dashboard as {role}<ArrowRight className="size-4"/></Button></AuthLayout>}
