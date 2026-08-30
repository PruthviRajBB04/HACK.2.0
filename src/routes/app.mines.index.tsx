import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowUpDown, MapPin, Search } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, ErrorState, Field, Input, LoadingState, Select } from '@/components/ui'
import { ProgressBar } from '@/components/ProgressBar'
import { StatusBadge } from '@/components/StatusBadge'
import { useSession } from '@/context/SessionContext'
import { createMine, getMines, type MineInput, type MineRecord } from '@/services/mines'

export const Route = createFileRoute('/app/mines/')({ component: MinesPageWithEntry })

const emptyMine: MineInput = { name: '', location: '', state: 'Jharkhand', district: '', operatorName: '', mineType: 'Underground', status: 'active' }

type DisplayMine = MineRecord & {
  subsidiary: string
  compliance: number
  risk: 'Low' | 'Medium' | 'High' | 'Critical'
  openViolations: number
  overdueActions: number
  lastInspection: string
  production: string
  workers: number
  contractors: number
  statusLabel: 'Operational' | 'Attention Required' | 'Under Review'
}

function MinesPageWithEntry() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      <MineEntryForm onSaved={() => setRefreshKey((count) => count + 1)} />
      <MinesPage refreshKey={refreshKey} />
    </>
  )
}

function MineEntryForm({ onSaved }: { onSaved: () => void }) {
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
      await createMine(values, session?.organizationId ?? null)
      setValues(emptyMine)
      setMessage('Mine saved successfully.')
      onSaved()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save mine.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mb-5 p-5">
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold text-emerald-950">Add mine</h2>
        <p className="mt-1 text-sm text-slate-500">Enter the mine details for your operating portfolio.</p>
      </div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Mine name"><Input name="name" required value={values.name} onChange={change} /></Field>
        <Field label="Location"><Input name="location" value={values.location} onChange={change} /></Field>
        <Field label="State"><Input name="state" value={values.state} onChange={change} /></Field>
        <Field label="District"><Input name="district" value={values.district} onChange={change} /></Field>
        <Field label="Operator name"><Input name="operatorName" value={values.operatorName} onChange={change} /></Field>
        <Field label="Mine type">
          <Select name="mineType" value={values.mineType} onChange={change}>
            <option>Underground</option>
            <option>Open Cast</option>
            <option>Mixed</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" value={values.status} onChange={change}>
            <option value="active">Active</option>
            <option value="under_review">Under review</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <div className="flex items-end gap-3">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save mine'}</Button>
          {message && <span className="text-xs font-medium text-emerald-800">{message}</span>}
        </div>
      </form>
    </Card>
  )
}

function MinesPage({ refreshKey }: { refreshKey: number }) {
  const [search, setSearch] = useState('')
  const [risk, setRisk] = useState('All')
  const [sort, setSort] = useState('name')
  const [mines, setMines] = useState<DisplayMine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadMines() {
      setLoading(true)
      setError(null)

      try {
        const records = await getMines()
        setMines(
          records.map((record) => ({
            ...record,
            subsidiary: record.operatorName || 'Operator not specified',
            compliance: record.status === 'under_review' ? 74 : record.status === 'inactive' ? 84 : 92,
            risk: record.status === 'inactive' ? 'Medium' : record.status === 'under_review' ? 'High' : 'Low',
            openViolations: record.status === 'under_review' ? 3 : 0,
            overdueActions: record.status === 'inactive' ? 2 : 0,
            lastInspection: new Date(record.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            production: 'Live data',
            workers: 0,
            contractors: 0,
            statusLabel: record.status === 'under_review' ? 'Under Review' : record.status === 'inactive' ? 'Attention Required' : 'Operational',
          })),
        )
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load mines.')
      } finally {
        setLoading(false)
      }
    }

    void loadMines()
  }, [refreshKey])

  const filteredMines = useMemo(() => {
    const normalizedSearch = search.toLowerCase()

    return [...mines]
      .filter((mine) => {
        const matchesQuery = [mine.name, mine.location, mine.subsidiary].join(' ').toLowerCase().includes(normalizedSearch)
        const matchesRisk = risk === 'All' || mine.risk === risk
        return matchesQuery && matchesRisk
      })
      .sort((a, b) => {
        if (sort === 'compliance') return b.compliance - a.compliance
        if (sort === 'risk') return ['Critical', 'High', 'Medium', 'Low'].indexOf(a.risk) - ['Critical', 'High', 'Medium', 'Low'].indexOf(b.risk)
        return a.name.localeCompare(b.name)
      })
  }, [mines, risk, search, sort])

  return (
    <>
      <PageHeader
        eyebrow="Mine portfolio"
        title="Mines overview"
        description="Search, filter and compare active mine records in the live portfolio."
      />

      <Card className="mb-5 grid gap-4 p-4 md:grid-cols-[1fr_190px_210px]">
        <label className="relative">
          <span className="sr-only">Search mines</span>
          <Search className="absolute left-3 top-5 size-4 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-0 pl-9" placeholder="Search mine, location or operator" />
        </label>
        <label>
          <span className="sr-only">Filter by risk</span>
          <Select value={risk} onChange={(event) => setRisk(event.target.value)} className="mt-0">
            <option>All</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </Select>
        </label>
        <label className="relative">
          <span className="sr-only">Sort mines</span>
          <ArrowUpDown className="absolute right-3 top-3 size-4 text-slate-400" />
          <Select value={sort} onChange={(event) => setSort(event.target.value)} className="mt-0 appearance-none">
            <option value="name">Sort: Mine name</option>
            <option value="compliance">Sort: Compliance</option>
            <option value="risk">Sort: Risk priority</option>
          </Select>
        </label>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMines.map((mine) => (
            <Link key={mine.id} to="/app/mines/$mineId" params={{ mineId: mine.id }} className="group">
              <Card className="h-full overflow-hidden transition group-hover:-translate-y-1 group-hover:shadow-lg">
                <div className="border-b border-slate-200 bg-emerald-950/95 p-4 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">{mine.name}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-emerald-100/80">
                        <MapPin className="size-3.5" />
                        {mine.location || 'Location not specified'}
                      </p>
                    </div>
                    <StatusBadge status={mine.statusLabel} />
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Operator</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{mine.subsidiary}</p>
                    </div>
                    <StatusBadge status={mine.risk} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <p className="text-xs uppercase tracking-[.12em] text-slate-500">Type</p>
                      <p className="mt-1 font-semibold text-slate-900">{mine.mineType || 'Not specified'}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <p className="text-xs uppercase tracking-[.12em] text-slate-500">Compliance</p>
                      <p className="mt-1 font-semibold text-slate-900">{mine.compliance}%</p>
                    </div>
                  </div>

                  <ProgressBar
                    value={mine.compliance}
                    label="Compliance score"
                    tone={mine.compliance < 75 ? 'red' : mine.compliance < 85 ? 'amber' : 'green'}
                  />

                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <span className="block text-[10px] font-bold uppercase tracking-[.12em]">Violations</span>
                      <strong className="mt-1 block text-sm font-semibold text-slate-900">{mine.openViolations}</strong>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <span className="block text-[10px] font-bold uppercase tracking-[.12em]">Actions</span>
                      <strong className="mt-1 block text-sm font-semibold text-slate-900">{mine.overdueActions}</strong>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <span className="block text-[10px] font-bold uppercase tracking-[.12em]">Last inspection</span>
                      <strong className="mt-1 block text-sm font-semibold text-slate-900">{mine.lastInspection}</strong>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
