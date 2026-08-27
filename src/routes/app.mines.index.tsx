import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowUpDown, MapPin, Search } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, Field, Input, Select } from '@/components/ui'
import { ProgressBar } from '@/components/ProgressBar'
import { StatusBadge } from '@/components/StatusBadge'
import { demoMines } from '@/data/demo'
import { useSession } from '@/context/SessionContext'
import { createMine, type MineInput } from '@/services/mines'

export const Route = createFileRoute('/app/mines/')({ component: MinesPageWithEntry })

function MinesPageWithEntry() {
	return <><MineEntryForm /><MinesPage /></>
}

const emptyMine: MineInput = { name: '', location: '', state: 'Jharkhand', district: '', operatorName: '', mineType: 'Underground', status: 'active' }

function MineEntryForm() {
	const { session } = useSession()
	const [values, setValues] = useState<MineInput>(emptyMine)
	const [message, setMessage] = useState('')
	const [saving, setSaving] = useState(false)

	function change(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
		setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setMessage('')
		setSaving(true)
		try {
			if (session?.isDemo) {
				const saved = JSON.parse(window.sessionStorage.getItem('minesaksham-demo-mines') ?? '[]') as MineInput[]
				window.sessionStorage.setItem('minesaksham-demo-mines', JSON.stringify([...saved, values]))
			} else {
				await createMine(values)
			}
			setValues(emptyMine)
			setMessage(session?.isDemo ? 'Mine saved for this Demo Mode session.' : 'Mine saved successfully.')
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Unable to save mine.')
		} finally {
			setSaving(false)
		}
	}

	return <Card className="mb-5 p-5"><div className="mb-4"><h2 className="font-display text-xl font-semibold text-emerald-950">Add mine</h2><p className="mt-1 text-sm text-slate-500">Enter the mine details for your operating portfolio.</p></div><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Mine name"><Input name="name" required value={values.name} onChange={change} /></Field><Field label="Location"><Input name="location" value={values.location} onChange={change} /></Field><Field label="State"><Input name="state" value={values.state} onChange={change} /></Field><Field label="District"><Input name="district" value={values.district} onChange={change} /></Field><Field label="Operator name"><Input name="operatorName" value={values.operatorName} onChange={change} /></Field><Field label="Mine type"><Select name="mineType" value={values.mineType} onChange={change}><option>Underground</option><option>Open Cast</option><option>Mixed</option></Select></Field><Field label="Status"><Select name="status" value={values.status} onChange={change}><option value="active">Active</option><option value="under_review">Under review</option><option value="inactive">Inactive</option></Select></Field><div className="flex items-end gap-3"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save mine'}</Button>{message && <span className="text-xs font-medium text-emerald-800">{message}</span>}</div></form></Card>
}
function MinesPage(){const [search,setSearch]=useState('');const [risk,setRisk]=useState('All');const [sort,setSort]=useState('name');const mines=useMemo(()=>[...demoMines.filter(mine=>(mine.name+mine.location+mine.subsidiary).toLowerCase().includes(search.toLowerCase())&&(risk==='All'||mine.risk===risk))].sort((a,b)=>sort==='compliance'?b.compliance-a.compliance:sort==='risk'?['Critical','High','Medium','Low'].indexOf(a.risk)-['Critical','High','Medium','Low'].indexOf(b.risk):a.name.localeCompare(b.name)),[search,risk,sort]);return <><PageHeader eyebrow="Mine portfolio" title="Mines overview" description="Search, filter and compare configurable synthetic mine records. Select a mine to open its details."/><Card className="mb-5 grid gap-4 p-4 md:grid-cols-[1fr_190px_210px]"><label className="relative"><span className="sr-only">Search mines</span><Search className="absolute left-3 top-5 size-4 text-slate-400"/><Input value={search} onChange={event=>setSearch(event.target.value)} className="mt-0 pl-9" placeholder="Search mine, location or subsidiary"/></label><label><span className="sr-only">Filter by risk</span><Select value={risk} onChange={event=>setRisk(event.target.value)} className="mt-0"><option>All</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></Select></label><label className="relative"><span className="sr-only">Sort mines</span><ArrowUpDown className="absolute right-3 top-3 size-4 text-slate-400"/><Select value={sort} onChange={event=>setSort(event.target.value)} className="mt-0 appearance-none"><option value="name">Sort: Mine name</option><option value="compliance">Sort: Compliance</option><option value="risk">Sort: Risk priority</option></Select></label></Card><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{mines.map(mine=><Link key={mine.id} to="/app/mines/$mineId" params={{mineId:mine.id}} className="group"><Card className="h-full overflow-hidden transition group-hover:-translate-y-1 group-hover:border-emerald-800/30 group-hover:shadow-lg"><div className="h-2 bg-emerald-950"><div className={`h-full ${mine.risk==='Low'?'w-1/4 bg-emerald-500':mine.risk==='Medium'?'w-1/2 bg-amber-400':mine.risk==='High'?'w-3/4 bg-orange-600':'w-full bg-red-700'}`}/></div><div className="p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2">{mine.isPrimaryDemo&&<span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">Primary demo</span>}<StatusBadge status={mine.risk}/></div><h2 className="mt-4 font-display text-xl font-semibold text-emerald-950">{mine.name}</h2><p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="size-3.5"/>{mine.location}</p></div><span className="text-2xl font-bold text-slate-900">{mine.compliance}%</span></div><div className="mt-5"><ProgressBar value={mine.compliance} label="Compliance" tone={mine.compliance<75?'red':mine.compliance<85?'amber':'green'}/></div><dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs"><div><dt className="text-slate-400">Mine type</dt><dd className="mt-1 font-semibold text-slate-700">{mine.type}</dd></div><div><dt className="text-slate-400">Open violations</dt><dd className="mt-1 font-semibold text-slate-700">{mine.openViolations}</dd></div><div className="col-span-2"><dt className="text-slate-400">Subsidiary</dt><dd className="mt-1 font-semibold text-slate-700">{mine.subsidiary}</dd></div></dl></div></Card></Link>)}</div></>}
