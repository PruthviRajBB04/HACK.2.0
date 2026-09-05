import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Clock, Filter, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, Dialog, ErrorState, Field, Input, LoadingState, Select } from '@/components/ui'
import { DataTable, type TableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { createComplianceRequirement, deleteComplianceRecord, getComplianceRecords, getComplianceRequirements, updateComplianceRecord, type ComplianceRequirement, type ComplianceRequirementInput, type ComplianceRecordInput } from '@/services/compliance'
import { getMines, type MineRecord } from '@/services/mines'
import { getInspections } from '@/services/inspections'
import type { Inspection } from '@/types/domain'
import type { ComplianceRecord } from '@/types/domain'
import { useSession } from '@/context/SessionContext'

export const Route = createFileRoute('/app/compliance')({ component: CompliancePage })

const createColumns = (mineName: (id: string) => string, inspectionName: (id?: string) => string, selectRecord: (record: ComplianceRecord) => void): TableColumn<ComplianceRecord>[] => [
  { key: 'requirement', label: 'Requirement', render: (record) => (
    <button type="button" onClick={() => selectRecord(record)} className="text-left">
      <p className="font-semibold text-slate-900 hover:text-emerald-800">{record.requirement}</p>
      <p className="mt-1 text-xs text-slate-400">{record.id}</p>
    </button>
  ) },
  { key: 'category', label: 'Category', render: (record) => record.category },
  { key: 'mine', label: 'Mine', render: (record) => <div><p className="font-semibold text-slate-900">{record.mineId ? mineName(record.mineId) : 'No mine assigned'}</p></div> },
  { key: 'inspection', label: 'Source Inspection', render: (record) => record.inspectionId ? inspectionName(record.inspectionId) : 'Not linked' },
  { key: 'due', label: 'Due Date', render: (record) => record.dueDate },
  { key: 'completed', label: 'Completed', render: (record) => record.completedDate ?? 'Not completed' },
  { key: 'status', label: 'Status', render: (record) => <StatusBadge status={record.status}/> },
  { key: 'risk', label: 'Risk', render: (record) => record.risk ? <StatusBadge status={record.risk}/> : <span>Not available</span> },
]

function CompliancePage() {
  const [records, setRecords] = useState<ComplianceRecord[]>([])
  const [mines, setMines] = useState<MineRecord[]>([])
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([])
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('All')
  const [risk, setRisk] = useState('All')
  const [mine, setMine] = useState('All')
  const [search, setSearch] = useState('')
  const [due, setDue] = useState('All')
  const [selected, setSelected] = useState<ComplianceRecord | null>(null)
  const [editing, setEditing] = useState<ComplianceRecord | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [requirementOpen, setRequirementOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [requirementSaving, setRequirementSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<ComplianceRecordInput>({ requirementId: '', mineId: '', dueDate: '', status: 'Pending', completedDate: '', remarks: '' })
  const [requirementForm, setRequirementForm] = useState<ComplianceRequirementInput>({ title: '', category: 'Safety', description: '', regulation: '', frequency: '', dueDays: undefined })
  const { session } = useSession()

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [next, mineRecords, requirementRecords, inspectionRecords] = await Promise.all([getComplianceRecords(), getMines(), getComplianceRequirements(), getInspections()])
        if (active) {
          setRecords(next)
          setMines(mineRecords)
          setRequirements(requirementRecords)
          setInspections(inspectionRecords)
        }
      } catch (caughtError) {
        if (active) setError(caughtError instanceof Error ? caughtError.message : 'Unable to load compliance records.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  const mineName = (id: string) => mines.find((mine) => mine.id === id)?.name ?? 'Unknown mine'
  const inspectionName = (id?: string) => inspections.find((inspection) => inspection.id === id)?.inspectionType ?? id ?? 'Unknown inspection'
  const columns = useMemo(() => createColumns(mineName, inspectionName, setSelected), [mines, inspections])
  const today = new Date().toISOString().slice(0, 10)

  const visibleRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesCategory = category === 'All' || record.category === category
      const matchesStatus = status === 'All' || record.status === status
      const matchesMine = mine === 'All' || record.mineId === mine
      const matchesRisk = risk === 'All' || record.risk === risk
      const matchesSearch = record.requirement.toLowerCase().includes(search.toLowerCase()) || record.description?.toLowerCase().includes(search.toLowerCase())
      const matchesDue = due === 'All' || due === 'Overdue' && record.dueDate < today && !record.completedDate && record.status !== 'Compliant' || due === 'Upcoming' && record.dueDate >= today && !record.completedDate
      return matchesCategory && matchesStatus && matchesRisk && matchesMine && matchesSearch && matchesDue
    })
  }, [records, category, status, risk, mine, search, due, today])

  const metrics = useMemo(() => ({
    total: records.length,
    compliant: records.filter((r) => r.status === 'Compliant').length,
    dueSoon: records.filter((r) => r.status === 'Due Soon').length,
    overdue: records.filter((r) => r.dueDate < today && !r.completedDate && r.status !== 'Compliant').length,
    pending: records.filter((r) => r.status === 'Pending').length,
    partiallyCompliant: 0,
    percentage: records.length ? Math.round((records.filter((r) => r.status === 'Compliant').length / records.length) * 100) : null,
  }), [records, today])

  function openEdit(record: ComplianceRecord) {
    setSelected(null); setEditing(record); setFormOpen(true); setFormError(null)
    setForm({ requirementId: record.requirementId ?? '', mineId: record.mineId, inspectionId: record.inspectionId, dueDate: record.dueDate, status: record.status, completedDate: record.completedDate ?? '', remarks: record.remarks ?? '' })
  }

  async function saveRecord() {
    if (!session?.organizationId) { setFormError('This session is not linked to an organization.'); return }
    if (!form.requirementId || !form.mineId || !form.dueDate) { setFormError('Requirement, mine, and due date are required.'); return }
    setSaving(true); setFormError(null)
    try {
      if (!editing) { setFormError('Compliance records are generated from closed inspections.'); return }
      const saved = await updateComplianceRecord(editing.id, form)
      setRecords((current) => current.map((record) => record.id === saved.id ? saved : record))
      setSelected(editing ? saved : null); setEditing(null); setFormOpen(false)
    } catch (caughtError) { setFormError(caughtError instanceof Error ? caughtError.message : 'Unable to save compliance record.') } finally { setSaving(false) }
  }

  async function removeRecord(record: ComplianceRecord) {
    if (!window.confirm(`Delete compliance record "${record.requirement}"?`)) return
    setFormError(null)
    try {
      await deleteComplianceRecord(record.id)
      setRecords((current) => current.filter((item) => item.id !== record.id))
      setSelected(null)
    } catch (caughtError) { setFormError(caughtError instanceof Error ? caughtError.message : 'Unable to delete compliance record.') }
  }

  async function saveRequirement() {
    if (!session?.organizationId || !requirementForm.title.trim()) {
      setFormError('Requirement title and organization context are required.')
      return
    }
    setRequirementSaving(true)
    setFormError(null)
    try {
      const created = await createComplianceRequirement(requirementForm, session.organizationId)
      setRequirements((current) => [...current, created].sort((a, b) => a.title.localeCompare(b.title)))
      setRequirementForm({ title: '', category: 'Safety', description: '', regulation: '', frequency: '', dueDays: undefined })
      setRequirementOpen(false)
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : 'Unable to create compliance requirement.')
    } finally {
      setRequirementSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Compliance monitoring"
        title="Compliance overview"
        description="Track organization compliance records, requirements, status and due dates from live data."
        action={<Button type="button" variant="secondary" onClick={() => { setFormError(null); setRequirementOpen(true) }}><Plus className="size-4" />New requirement</Button>}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Total</p><Clock className="size-4 text-slate-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{metrics.total}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Compliant</p><CheckCircle2 className="size-4 text-emerald-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{metrics.compliant}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Due Soon</p><Clock className="size-4 text-amber-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{metrics.dueSoon}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Pending</p><Clock className="size-4 text-amber-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{metrics.pending}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Overdue</p><AlertTriangle className="size-4 text-red-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{metrics.overdue}</p></Card>
        <Card className="p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Compliance rate</p><p className="mt-4 text-3xl font-bold text-emerald-950">{metrics.percentage === null ? 'Not assessed' : `${metrics.percentage}%`}</p></Card>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(['Safety', 'Environment', 'Labour', 'Operations'] as const).map((label) => {
          const categoryRecords = records.filter((record) => record.category === label)
          const compliant = categoryRecords.filter((record) => record.status === 'Compliant').length
          const value = categoryRecords.length ? Math.round((compliant / categoryRecords.length) * 100) : null
          return (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-emerald-950">{value === null ? 'Not assessed' : `${value}%`}</p>
          </Card>
          )
        })}
      </div>

      <Card className="mb-5 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-slate-500"><Filter className="size-4" />Filter records</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative"><span className="sr-only">Search requirements</span><Search className="absolute left-3 top-3 size-4 text-slate-400" /><Input className="mt-0 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requirements" /></label>
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
              {mines.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </Select>
          </label>
          <label><span className="sr-only">Due date</span><Select className="mt-0" value={due} onChange={(event) => setDue(event.target.value)}><option>All</option><option>Overdue</option><option>Upcoming</option></Select></label>
        </div>
      </Card>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : <DataTable rows={visibleRecords} columns={columns} emptyMessage={records.length === 0 ? 'No compliance records found for this organization.' : 'No compliance records match the current filters.'} />}

      <Dialog open={Boolean(selected)} title={selected?.requirement ?? 'Compliance record'} onClose={() => setSelected(null)}>
        {selected && <div className="space-y-3 text-sm"><p>{selected.description ?? 'No description available.'}</p><p><strong>Regulation:</strong> {selected.regulation ?? 'Not specified'}</p><p><strong>Category:</strong> {selected.category}</p><p><strong>Frequency:</strong> {selected.frequency ?? 'Not specified'}</p><p><strong>Due days:</strong> {selected.dueDays ?? 'Not specified'}</p><p><strong>Mine:</strong> {selected.mineId ? mineName(selected.mineId) : 'No mine assigned'}</p><p><strong>Inspection:</strong> {selected.inspectionId ? inspectionName(selected.inspectionId) : 'Not linked'}</p><p><strong>Status:</strong> {selected.status}</p><p><strong>Due:</strong> {selected.dueDate}</p><p><strong>Completed:</strong> {selected.completedDate ?? 'Not completed'}</p><p><strong>Remarks:</strong> {selected.remarks ?? 'None'}</p><p><strong>Created by:</strong> {selected.createdBy ?? 'Not available'}</p><p><strong>Created:</strong> {selected.createdAt ?? 'Not available'}</p><p><strong>Last updated:</strong> {selected.updatedAt ?? 'Not available'}</p>{formError && <ErrorState message={formError} />}<div className="flex flex-wrap gap-2"><Button type="button" onClick={() => openEdit(selected)}>Edit record</Button><Button type="button" variant="danger" onClick={() => void removeRecord(selected)}>Delete record</Button></div></div>}
      </Dialog>
      <Dialog open={formOpen} title={editing ? 'Edit compliance record' : 'Create compliance record'} onClose={() => { setEditing(null); setFormOpen(false) }}>
        <div className="space-y-4"><Field label="Requirement"><Select value={form.requirementId} onChange={(event) => setForm({ ...form, requirementId: event.target.value })}><option value="">Select requirement</option>{requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.title}</option>)}</Select></Field><Field label="Mine"><Select value={form.mineId} onChange={(event) => setForm({ ...form, mineId: event.target.value })}><option value="">No mine assigned</option>{mines.map((mineRecord) => <option key={mineRecord.id} value={mineRecord.id}>{mineRecord.name}</option>)}</Select></Field><Field label="Due date"><Input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></Field><Field label="Status"><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ComplianceRecordInput['status'] })}><option>Pending</option><option>Compliant</option><option>Due Soon</option><option>Overdue</option><option>Non-Compliant</option></Select></Field><Field label="Completed date"><Input type="date" value={form.completedDate} onChange={(event) => setForm({ ...form, completedDate: event.target.value })} /></Field><Field label="Remarks"><Input value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} /></Field>{formError && <ErrorState message={formError} />}<Button type="button" disabled={saving} onClick={() => void saveRecord()}>{saving ? 'Saving...' : 'Save record'}</Button></div>
      </Dialog>
      <Dialog open={requirementOpen} title="Create compliance requirement" onClose={() => setRequirementOpen(false)}>
        <div className="space-y-4"><Field label="Title"><Input value={requirementForm.title} onChange={(event) => setRequirementForm({ ...requirementForm, title: event.target.value })} placeholder="Requirement title" /></Field><Field label="Category"><Select value={requirementForm.category} onChange={(event) => setRequirementForm({ ...requirementForm, category: event.target.value as ComplianceRequirementInput['category'] })}><option>Safety</option><option>Environment</option><option>Labour</option><option>Operations</option></Select></Field><Field label="Description"><Input value={requirementForm.description} onChange={(event) => setRequirementForm({ ...requirementForm, description: event.target.value })} /></Field><Field label="Regulation"><Input value={requirementForm.regulation} onChange={(event) => setRequirementForm({ ...requirementForm, regulation: event.target.value })} /></Field><Field label="Frequency"><Input value={requirementForm.frequency} onChange={(event) => setRequirementForm({ ...requirementForm, frequency: event.target.value })} /></Field><Field label="Due days"><Input type="number" min="0" value={requirementForm.dueDays ?? ''} onChange={(event) => setRequirementForm({ ...requirementForm, dueDays: event.target.value ? Number(event.target.value) : undefined })} /></Field>{formError && <ErrorState message={formError} />}<Button type="button" disabled={requirementSaving} onClick={() => void saveRequirement()}>{requirementSaving ? 'Saving...' : 'Save requirement'}</Button></div>
      </Dialog>
    </>
  )
}
