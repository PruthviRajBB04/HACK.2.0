import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { CalendarRange, ClipboardCheck, Filter, Plus } from 'lucide-react'
import { DataTable, type TableColumn } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { Card, LoadingState, Select } from '@/components/ui'
import { StatusBadge } from '@/components/StatusBadge'
import { demoInspections, demoMines } from '@/data/demo'
import { getInspections } from '@/services/inspections'
import type { Inspection } from '@/types/domain'

export const Route = createFileRoute('/app/inspections')({ component: InspectionsRoute })

const mineName = (id: string) => demoMines.find((mine) => mine.id === id)?.name ?? 'Unknown mine'
const actionLabel = (status: Inspection['status']) => {
  switch (status) {
    case 'Scheduled': return 'Start Inspection'
    case 'In Progress': return 'Continue Inspection'
    default: return 'Open Details'
  }
}

const columns: TableColumn<Inspection>[] = [
  { key: 'inspection', label: 'Inspection', render: (inspection) => (
    <div>
      <p className="font-semibold text-slate-900">{inspection.inspectionType}</p>
      <p className="mt-1 text-xs text-slate-400">{inspection.id}</p>
    </div>
  ) },
  { key: 'mine', label: 'Mine', render: (inspection) => <div><p className="font-semibold text-slate-900">{mineName(inspection.mineId)}</p><p className="mt-1 text-xs text-slate-500">{inspection.inspectorName}</p></div> },
  { key: 'date', label: 'Date', render: (inspection) => new Date(inspection.inspectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
  { key: 'status', label: 'Status', render: (inspection) => <StatusBadge status={inspection.status}/> },
  { key: 'risk', label: 'Risk', render: (inspection) => <StatusBadge status={inspection.riskLevel}/> },
  { key: 'action', label: 'Action', render: (inspection) => <Link to="/app/inspections/$id" params={{ id: inspection.id }} className="font-semibold text-emerald-800 hover:text-emerald-950">{actionLabel(inspection.status)}</Link> },
]

function InspectionsPage() {
  const [items, setItems] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('All')
  const [risk, setRisk] = useState('All')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const next = await getInspections()
        if (active) setItems(next.length ? next : demoInspections)
      } catch {
        if (active) setItems(demoInspections)
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  const visibleItems = useMemo(() => {
    return items.filter((inspection) => {
      const matchesStatus = status === 'All' || inspection.status === status
      const matchesRisk = risk === 'All' || inspection.riskLevel === risk
      return matchesStatus && matchesRisk
    })
  }, [items, risk, status])

  return (
    <>
      <PageHeader
        eyebrow="Site inspections"
        title="Inspection workflow"
        description="Plan, review and close inspection records while tracking critical findings for mine operations."
        action={
          <Link
            to="/app/inspections/create"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <Plus className="size-4" />
            Schedule inspection
          </Link>
        }
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Total</p><ClipboardCheck className="size-4 text-emerald-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{items.length}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">In progress</p><CalendarRange className="size-4 text-blue-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{items.filter((item) => item.status === 'In Progress').length}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Critical</p><Filter className="size-4 text-red-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{items.filter((item) => item.riskLevel === 'Critical').length}</p></Card>
      </div>

      <Card className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="sr-only">Filter by status</span>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-0">
              <option>All</option>
              <option>Scheduled</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </Select>
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
        </div>
      </Card>

      {loading ? <LoadingState /> : <DataTable rows={visibleItems} columns={columns} emptyMessage="No inspections match the current filters." />}
    </>
  )
}

function InspectionsRoute() {
  const location = useLocation()

  return location.pathname === '/app/inspections' ? <InspectionsPage /> : <Outlet />
}
