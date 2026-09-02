import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Filter, FolderOpen, ShieldCheck } from 'lucide-react'
import { DataTable, type TableColumn } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { Card, LoadingState, Select } from '@/components/ui'
import { StatusBadge } from '@/components/StatusBadge'
import { demoEvidenceDocuments, demoMines } from '@/data/demo'
import { getEvidenceDocuments } from '@/services/documents'
import type { ComplianceEvidenceDocument } from '@/types/domain'

export const Route = createFileRoute('/app/documents')({ component: DocumentsPage })

const mineName = (id: string) => demoMines.find((mine) => mine.id === id)?.name ?? 'Unknown mine'

const columns: TableColumn<ComplianceEvidenceDocument>[] = [
  { key: 'name', label: 'Document', render: (document) => (
    <div>
      <p className="font-semibold text-slate-900">{document.name}</p>
      <p className="mt-1 text-xs text-slate-400">{document.fileName ?? document.id}</p>
    </div>
  ) },
  { key: 'type', label: 'Type', render: (document) => document.documentType },
  { key: 'mine', label: 'Mine', render: (document) => <div><p className="font-semibold text-slate-900">{mineName(document.mineId)}</p><p className="mt-1 text-xs text-slate-500">{document.complianceRequirementName ?? 'No requirement linked'}</p></div> },
  { key: 'uploaded', label: 'Uploaded', render: (document) => new Date(document.uploadDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
  { key: 'expiry', label: 'Expiry', render: (document) => document.expiryDate ? new Date(document.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
  { key: 'status', label: 'Status', render: (document) => <StatusBadge status={document.status}/> },
]

function DocumentsPage() {
  const [documents, setDocuments] = useState<ComplianceEvidenceDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('All')
  const [type, setType] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      try {
        const next = await getEvidenceDocuments()
        if (active) setDocuments(next.length ? next : [...demoEvidenceDocuments])
      } catch {
        if (active) setDocuments([...demoEvidenceDocuments])
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  const visibleDocuments = useMemo(() => {
    const searchText = search.toLowerCase()
    return documents.filter((document) => {
      const matchesStatus = status === 'All' || document.status === status
      const matchesType = type === 'All' || document.documentType === type
      const matchesSearch = [document.name, document.documentType, document.complianceRequirementName ?? '', document.fileName ?? '', mineName(document.mineId)]
        .join(' ')
        .toLowerCase()
        .includes(searchText)

      return matchesStatus && matchesType && matchesSearch
    })
  }, [documents, search, status, type])

  return (
    <>
      <PageHeader
        eyebrow="Compliance evidence"
        title="Documents and evidence archive"
        description="Manage uploaded evidence that supports compliance requirements, inspections and corrective actions."
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Total</p><FolderOpen className="size-4 text-emerald-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{documents.length}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Approved</p><ShieldCheck className="size-4 text-emerald-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{documents.filter((document) => document.status === 'Approved').length}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Expiring soon</p><Filter className="size-4 text-amber-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{documents.filter((document) => document.expiryDate && new Date(document.expiryDate).getTime() > Date.now()).length}</p></Card>
      </div>

      <Card className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label>
            <span className="sr-only">Search evidence</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search documents or mine"
              className="mt-0 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/15"
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-0">
              <option>All</option>
              <option>Draft</option>
              <option>Uploaded</option>
              <option>Approved</option>
              <option>Expired</option>
              <option>Rejected</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">Filter by type</span>
            <Select value={type} onChange={(event) => setType(event.target.value)} className="mt-0">
              <option>All</option>
              <option>Safety Report</option>
              <option>Environmental Monitoring</option>
              <option>Equipment Maintenance Certificate</option>
              <option>Statutory Compliance</option>
              <option>Training Record</option>
              <option>Incident Report</option>
              <option>Labour Compliance</option>
            </Select>
          </label>
        </div>
      </Card>

      {loading ? <LoadingState /> : <DataTable rows={visibleDocuments} columns={columns} emptyMessage="No evidence documents match the current filters." />}
    </>
  )
}
