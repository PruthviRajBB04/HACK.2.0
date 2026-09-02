import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Clock, Filter } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, LoadingState, Select } from '@/components/ui'
import { DataTable, type TableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { complianceBreakdown, demoCompliance, demoMines } from '@/data/demo'
import { getComplianceRecords } from '@/services/compliance'
import type { ComplianceRecord } from '@/types/domain'

export const Route = createFileRoute('/app/compliance')({ component: CompliancePage })

const mineName = (id: string) => demoMines.find((mine) => mine.id === id)?.name ?? 'Unknown demo mine'

const columns: TableColumn<ComplianceRecord>[] = [
  { key: 'requirement', label: 'Requirement', render: (record) => (
    <div>
      <p className="font-semibold text-slate-900">{record.requirement}</p>
      <p className="mt-1 text-xs text-slate-400">{record.id}</p>
    </div>
  ) },
  { key: 'category', label: 'Category', render: (record) => record.category },
  { key: 'mine', label: 'Mine', render: (record) => <div><p className="font-semibold text-slate-900">{mineName(record.mineId)}</p><p className="mt-1 text-xs text-slate-500">{record.responsibleDepartment}</p></div> },
  { key: 'due', label: 'Due Date', render: (record) => record.dueDate },
  { key: 'status', label: 'Status', render: (record) => <StatusBadge status={record.status}/> },
  { key: 'risk', label: 'Risk', render: (record) => <StatusBadge status={record.risk}/> },
]

function CompliancePage() {
  const [records, setRecords] = useState<ComplianceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('All')
  const [risk, setRisk] = useState('All')
  const [mine, setMine] = useState('All')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      try {
        const next = await getComplianceRecords()
        if (active) setRecords(next.length ? next : [...demoCompliance])
      } catch {
        if (active) setRecords([...demoCompliance])
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  const visibleRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesCategory = category === 'All' || record.category === category
      const matchesStatus = status === 'All' || record.status === status
      const matchesRisk = risk === 'All' || record.risk === risk
      const matchesMine = mine === 'All' || record.mineId === mine
      return matchesCategory && matchesStatus && matchesRisk && matchesMine
    })
  }, [records, category, status, risk, mine])

  const metrics = useMemo(() => ({
    total: records.length,
    compliant: records.filter((r) => r.status === 'Compliant').length,
    dueSoon: records.filter((r) => r.status === 'Due Soon').length,
    overdue: records.filter((r) => r.status === 'Overdue' || r.status === 'Non-Compliant').length,
  }), [records])

  return (
    <>
      <PageHeader
        eyebrow="Compliance monitoring"
        title="Compliance overview"
        description="Track and manage compliance requirements by category, status, risk and responsible department."
      />

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Total</p><Clock className="size-4 text-slate-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{metrics.total}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Compliant</p><CheckCircle2 className="size-4 text-emerald-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{metrics.compliant}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Due Soon</p><Clock className="size-4 text-amber-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{metrics.dueSoon}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Overdue</p><AlertTriangle className="size-4 text-red-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{metrics.overdue}</p></Card>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {complianceBreakdown.map(({ category: label, value }) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-emerald-950">{value}%</p>
          </Card>
        ))}
      </div>

      <Card className="mb-5 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-slate-500"><Filter className="size-4" />Filter records</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="sr-only">Category</span>
            <Select className="mt-0" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>All</option>
              <option>Safety</option>
              <option>Environment</option>
              <option>Labour</option>
              <option>Operations</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">Status</span>
            <Select className="mt-0" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>All</option>
              <option>Compliant</option>
              <option>Due Soon</option>
              <option>Pending</option>
              <option>Overdue</option>
              <option>Non-Compliant</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">Risk</span>
            <Select className="mt-0" value={risk} onChange={(event) => setRisk(event.target.value)}>
              <option>All</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">Mine</span>
            <Select className="mt-0" value={mine} onChange={(event) => setMine(event.target.value)}>
              <option>All</option>
              {demoMines.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </Select>
          </label>
        </div>
      </Card>

      {loading ? <LoadingState /> : <DataTable rows={visibleRecords} columns={columns} emptyMessage="No compliance records match the current filters." />}
    </>
  )
}
