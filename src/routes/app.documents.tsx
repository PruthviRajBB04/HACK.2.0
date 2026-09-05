import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ExternalLink, FileText, Filter, FolderOpen, Image, ShieldCheck, Video } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, ErrorState, LoadingState, Select } from '@/components/ui'
import { StatusBadge } from '@/components/StatusBadge'
import { getEvidenceAccessUrl, getEvidenceDocuments } from '@/services/documents'
import { getInspections } from '@/services/inspections'
import { getMines, type MineRecord } from '@/services/mines'
import type { ComplianceEvidenceDocument, Inspection } from '@/types/domain'

export const Route = createFileRoute('/app/documents')({ component: DocumentsPage })

function formatSize(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mimeType }: { mimeType?: string }) {
  if (mimeType?.startsWith('image/')) return <Image className="size-5" />
  if (mimeType?.startsWith('video/')) return <Video className="size-5" />
  return <FileText className="size-5" />
}

function DocumentsPage() {
  const [documents, setDocuments] = useState<ComplianceEvidenceDocument[]>([])
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [mines, setMines] = useState<MineRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('All')
  const [type, setType] = useState('All')
  const [inspectionId, setInspectionId] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [records, inspectionRecords, mineRecords] = await Promise.all([getEvidenceDocuments(), getInspections(), getMines()])
        const recordsWithUrls = await Promise.all(records.map(async (record) => ({ ...record, accessUrl: record.storagePath && record.storageMode === 'supabase' ? await getEvidenceAccessUrl(record.storagePath) : undefined })))
        if (!active) return
        setDocuments(recordsWithUrls)
        setInspections(inspectionRecords)
        setMines(mineRecords)
      } catch (caughtError) {
        if (active) setError(caughtError instanceof Error ? caughtError.message : 'Unable to load organization documents.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const typeOptions = useMemo(() => [...new Set(documents.map((document) => document.documentType))].sort(), [documents])
  const visibleDocuments = useMemo(() => {
    const searchText = search.trim().toLowerCase()
    return documents.filter((document) => {
      const relatedInspection = inspections.find((item) => item.id === document.inspectionId)
      const matchesStatus = status === 'All' || document.status === status
      const matchesType = type === 'All' || document.documentType === type
      const matchesInspection = inspectionId === 'All' || document.inspectionId === inspectionId
      const matchesSearch = [document.name, document.fileName ?? '', document.documentType, relatedInspection?.inspectionType ?? ''].join(' ').toLowerCase().includes(searchText)
      return matchesStatus && matchesType && matchesInspection && matchesSearch
    })
  }, [documents, inspectionId, inspections, search, status, type])

  const mineName = (mineId: string) => mines.find((mine) => mine.id === mineId)?.name ?? mineId
  const inspectionLabel = (id?: string) => inspections.find((inspection) => inspection.id === id)?.inspectionType ?? id ?? 'Not linked'

  return (
    <>
      <PageHeader eyebrow="Organization repository" title="Documents" description="Evidence and inspection-related documents available to this organization." />
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Total documents</p><FolderOpen className="size-4 text-emerald-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{documents.length}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">AI analyzed</p><ShieldCheck className="size-4 text-emerald-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{documents.filter((document) => document.aiAnalysis).length}</p></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Approved</p><ShieldCheck className="size-4 text-emerald-700" /></div><p className="mt-4 text-3xl font-bold text-emerald-950">{documents.filter((document) => document.status === 'Approved').length}</p></Card>
      </div>
      <Card className="mb-5 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-slate-500"><Filter className="size-4" />Filter repository</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search document name or file" className="mt-0 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/15" />
          <Select value={type} onChange={(event) => setType(event.target.value)} className="mt-0"><option value="All">All document types</option>{typeOptions.map((option) => <option key={option}>{option}</option>)}</Select>
          <Select value={inspectionId} onChange={(event) => setInspectionId(event.target.value)} className="mt-0"><option value="All">All inspections</option>{inspections.map((inspection) => <option key={inspection.id} value={inspection.id}>{inspection.id}</option>)}</Select>
          <Select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-0"><option>All</option><option>Draft</option><option>Uploaded</option><option>Approved</option><option>Expired</option><option>Rejected</option></Select>
        </div>
      </Card>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : documents.length === 0 ? <Card className="p-8 text-center"><p className="font-semibold text-slate-900">No documents available.</p><p className="mt-2 text-sm text-slate-500">Organization evidence and inspection-related documents will appear here.</p></Card> : visibleDocuments.length === 0 ? <Card className="p-8 text-center"><p className="font-semibold text-slate-900">No documents match the current filters.</p><p className="mt-2 text-sm text-slate-500">Try changing the search or filters.</p></Card> : <div className="space-y-3">{visibleDocuments.map((document) => <Card key={document.id} className="p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex min-w-0 gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><FileIcon mimeType={document.mimeType} /></div><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{document.name}</p><p className="mt-1 text-xs text-slate-500">{document.fileName ?? document.id} · {document.mimeType ?? document.documentType} · {formatSize(document.fileSizeBytes)}</p><p className="mt-2 text-sm text-slate-600">{document.description ?? 'No description recorded.'}</p></div></div><div className="flex shrink-0 items-center gap-2"><StatusBadge status={document.status} />{document.accessUrl && <a href={document.accessUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-slate-50"><ExternalLink className="size-4" />Open</a>}</div></div><div className="mt-4 grid gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4"><p>Mine: <strong className="text-slate-700">{mineName(document.mineId)}</strong></p><p>Uploaded: <strong className="text-slate-700">{new Date(document.uploadDate).toLocaleDateString('en-GB')}</strong></p><p>Inspection: {document.inspectionId ? <Link to="/app/inspections/$id" params={{ id: document.inspectionId }} className="font-semibold text-emerald-800 hover:underline">{inspectionLabel(document.inspectionId)}</Link> : <strong className="text-slate-700">Not linked</strong>}</p><p>Finding: <strong className="text-slate-700">{document.findingId ?? 'Not linked'}</strong></p></div><p className="mt-2 text-xs text-slate-500">AI analysis: <strong className="text-slate-700">{document.aiAnalysis ? 'Available' : 'Not performed'}</strong></p></Card>)}</div>}
    </>
  )
}
