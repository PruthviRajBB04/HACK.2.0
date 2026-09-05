import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button, ErrorState, LoadingState } from '@/components/ui'
import { StatusBadge } from '@/components/StatusBadge'
import { getInspectionById, getInspectionChecklist, getInspectionFindings } from '@/services/inspections'
import { getEvidenceAccessUrl, getInspectionEvidence } from '@/services/documents'
import { getInspectionCorrectiveActions } from '@/services/corrective-actions'
import { getMines } from '@/services/mines'
import type { ComplianceEvidenceDocument, CorrectiveAction, Inspection, InspectionChecklistItem, InspectionFinding } from '@/types/domain'

export const Route = createFileRoute('/app/inspections/$id/report')({ component: InspectionReportPage })

const fallbackMineName = (id: string) => id || 'Not available'

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-emerald-950">{value}</p></div>
}

function EmptyReport({ children }: { children: string }) {
  return <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{children}</p>
}

function InspectionReportPage() {
  const { id } = Route.useParams()
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [checklist, setChecklist] = useState<InspectionChecklistItem[]>([])
  const [findings, setFindings] = useState<InspectionFinding[]>([])
  const [evidence, setEvidence] = useState<ComplianceEvidenceDocument[]>([])
  const [actions, setActions] = useState<CorrectiveAction[]>([])
  const [mineName, setMineName] = useState(fallbackMineName(id))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const currentInspection = await getInspectionById(id)
        if (!currentInspection) throw new Error('Inspection not found.')
        const [nextChecklist, nextFindings, nextEvidence, nextActions, mines] = await Promise.all([
          getInspectionChecklist(id),
          getInspectionFindings(id),
          getInspectionEvidence(id),
          getInspectionCorrectiveActions(id),
          getMines(),
        ])
        const evidenceWithUrls = await Promise.all(nextEvidence.map(async (record) => ({ ...record, accessUrl: record.storagePath ? await getEvidenceAccessUrl(record.storagePath) : undefined })))
        if (!active) return
        setInspection(currentInspection)
        setChecklist(nextChecklist)
        setFindings(nextFindings)
        setEvidence(evidenceWithUrls)
        setActions(nextActions)
        setMineName(mines.find((mine) => mine.id === currentInspection.mineId)?.name ?? currentInspection.mineName ?? fallbackMineName(currentInspection.mineId))
      } catch (caughtError) {
        if (active) setError(caughtError instanceof Error ? caughtError.message : 'Unable to load inspection report.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [id])

  const derived = useMemo(() => {
    const nonCompliant = checklist.filter((item) => item.responseStatus === 'Non-compliant').length
    const partial = checklist.filter((item) => item.responseStatus === 'Partially compliant').length
    const openFindings = findings.filter((finding) => finding.status !== 'Resolved' && finding.status !== 'Closed')
    const answered = checklist.filter((item) => item.responseStatus).length
    const compliance = !answered && findings.length === 0 ? 'Not Assessed' : nonCompliant || openFindings.length ? 'Non-Compliant' : partial ? 'Partially Compliant' : 'Compliant'
    return {
      checklist: { total: checklist.length, compliant: checklist.filter((item) => item.responseStatus === 'Compliant').length, partial, nonCompliant, notApplicable: checklist.filter((item) => item.responseStatus === 'N/A').length },
      findings: { total: findings.length, high: findings.filter((finding) => finding.severity === 'High' || finding.severity === 'Critical').length, medium: findings.filter((finding) => finding.severity === 'Medium').length, low: findings.filter((finding) => finding.severity === 'Low').length, ai: findings.filter((finding) => finding.source === 'AI').length, manual: findings.filter((finding) => finding.source === 'Manual').length },
      evidence: { total: evidence.length, images: evidence.filter((item) => item.mimeType?.startsWith('image/')).length, videos: evidence.filter((item) => item.mimeType?.startsWith('video/')).length, documents: evidence.filter((item) => !item.mimeType?.startsWith('image/') && !item.mimeType?.startsWith('video/')).length, analyzed: evidence.filter((item) => item.aiAnalysis).length },
      actions: { total: actions.length, open: actions.filter((action) => action.status === 'Open').length, assigned: actions.filter((action) => action.status === 'Assigned').length, inProgress: actions.filter((action) => action.status === 'In Progress').length, resolved: actions.filter((action) => action.status === 'Resolved').length, verified: actions.filter((action) => action.status === 'Verified').length, closed: actions.filter((action) => action.status === 'Closed').length },
      compliance,
      risk: inspection?.riskLevel ?? 'Not assessed',
    }
  }, [actions, checklist, evidence, findings, inspection])

  if (loading) return <LoadingState />
  if (error || !inspection) return <ErrorState message={error ?? 'Inspection not found.'} />

  const statusTone = derived.compliance === 'Compliant' ? 'Compliant' : derived.compliance === 'Not Assessed' ? null : derived.compliance === 'Partially Compliant' ? 'Due Soon' : 'Non-Compliant'

  return <main className="report-page mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="print-hidden mb-5 flex flex-wrap items-center justify-between gap-3">
      <Link to="/app/inspections/$id" params={{ id }}><Button variant="secondary" className="gap-2"><ArrowLeft className="size-4" />Back to inspection</Button></Link>
      <Button type="button" onClick={() => window.print()} className="gap-2"><Printer className="size-4" />Print / Download Report</Button>
    </div>

    <header className="border-b-2 border-emerald-900 pb-6">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-800">MineSaksham · Inspection Record</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-emerald-950">Final Inspection Report</h1>
      <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="report-label">Mine</p><p className="report-value">{mineName}</p></div>
        <div><p className="report-label">Inspection ID</p><p className="report-value break-all">{inspection.id}</p></div>
        <div><p className="report-label">Inspection type</p><p className="report-value">{inspection.inspectionType}</p></div>
        <div><p className="report-label">Inspector</p><p className="report-value">{inspection.inspectorName}</p></div>
        <div><p className="report-label">Inspection date</p><p className="report-value">{new Date(inspection.inspectionDate).toLocaleDateString('en-GB')}</p></div>
        <div><p className="report-label">Status</p><p className="report-value"><StatusBadge status={inspection.status} /></p></div>
        <div><p className="report-label">Compliance</p><p className="report-value"><StatusBadge status={statusTone} /></p></div>
        <div><p className="report-label">Overall risk</p><p className="report-value"><StatusBadge status={inspection.riskLevel} /></p></div>
      </div>
      <div className="mt-5"><p className="report-label">Scope / objective</p><p className="mt-1 text-sm text-slate-700">{inspection.description ?? 'No scope or objective recorded.'}</p></div>
    </header>

    <section className="report-section">
      <h2 className="report-heading">Inspection Overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><p className="report-label">Mine</p><p className="report-value">{mineName}</p></div>
        <div><p className="report-label">Inspector</p><p className="report-value">{inspection.inspectorName}</p></div>
        <div><p className="report-label">Inspection type</p><p className="report-value">{inspection.inspectionType}</p></div>
        <div><p className="report-label">Inspection date</p><p className="report-value">{new Date(inspection.inspectionDate).toLocaleDateString('en-GB')}</p></div>
        <div><p className="report-label">Status</p><p className="report-value"><StatusBadge status={inspection.status} /></p></div>
        <div><p className="report-label">Scope / objective</p><p className="report-value font-normal">{inspection.description ?? 'No scope or objective recorded.'}</p></div>
      </div>
    </section>

    <section className="report-section">
      <h2 className="report-heading">Compliance Summary</h2>
      <div className="flex flex-wrap items-center gap-3"><StatusBadge status={statusTone} /><span className="text-sm text-slate-600">Overall compliance status</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total checklist requirements" value={derived.checklist.total} /><Metric label="Compliant" value={derived.checklist.compliant} /><Metric label="Partially compliant" value={derived.checklist.partial} /><Metric label="Non-compliant" value={derived.checklist.nonCompliant} /><Metric label="Not applicable" value={derived.checklist.notApplicable} /><Metric label="Open violations / findings" value={findings.filter((finding) => finding.status !== 'Resolved' && finding.status !== 'Closed').length} /><Metric label="High severity issues" value={derived.findings.high} /><Metric label="Medium / Low issues" value={`${derived.findings.medium} / ${derived.findings.low}`} />
      </div>
      <p className="mt-4 text-sm text-slate-600">Traceability: Inspection {inspection.id} → checklist results → findings → linked evidence.</p>
    </section>

    <section className="report-section">
      <h2 className="report-heading">Checklist Results</h2>
      {checklist.length === 0 ? <EmptyReport>No checklist items recorded.</EmptyReport> : <div className="space-y-3">{checklist.map((item) => <article key={item.id} className="report-break rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{item.title}</h3><StatusBadge status={item.responseStatus === 'Non-compliant' ? 'Non-Compliant' : item.responseStatus === 'Partially compliant' ? 'Due Soon' : item.responseStatus === 'Compliant' ? 'Compliant' : null} /></div><p className="mt-3 text-sm text-slate-600">Inspector comment: {item.comment ?? 'No comment recorded.'}</p><p className="mt-2 text-xs text-slate-500">Checklist item: {item.id} · Evidence: {evidence.filter((record) => record.checklistItemId === item.id).map((record) => record.fileName ?? record.name).join(', ') || 'Not linked'}</p></article>)}</div>}
    </section>

    <section className="report-section">
      <h2 className="report-heading">Findings</h2>
      {findings.length === 0 ? <EmptyReport>No findings recorded.</EmptyReport> : <div className="space-y-3">{findings.map((finding) => <article key={finding.id} className="report-break rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{finding.title}</h3><p className="mt-1 text-xs text-slate-500">Finding ID: {finding.id} · Mine: {mineName}</p></div><StatusBadge status={finding.severity} /></div><div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><p>Category: <strong>{finding.category}</strong></p><p>Source: <strong>{finding.source}</strong></p><p>Status: <strong>{finding.status}</strong></p><p>Location: <strong>{finding.location ?? 'Not recorded'}</strong></p></div><p className="mt-3 text-sm text-slate-700">{finding.description}</p><p className="mt-3 text-sm text-slate-700"><strong>Recommendation:</strong> {finding.recommendation ?? 'Not recorded.'}</p><p className="mt-3 text-xs text-slate-500">Evidence: {evidence.filter((record) => record.findingId === finding.id).map((record) => record.fileName ?? record.name).join(', ') || 'Not linked'}</p></article>)}</div>}
    </section>

    <section className="report-section">
      <h2 className="report-heading">Evidence</h2>
      {evidence.length === 0 ? <EmptyReport>No evidence attached.</EmptyReport> : <div className="grid gap-3 sm:grid-cols-2">{evidence.map((record) => <article key={record.id} className="report-break rounded-xl border border-slate-200 p-4"><div className="flex gap-4">{record.mimeType?.startsWith('image/') && record.accessUrl ? <img src={record.accessUrl} alt={record.fileName ?? record.name} className="h-20 w-20 rounded-lg object-cover" /> : null}<div className="min-w-0"><h3 className="font-semibold text-slate-900">{record.fileName ?? record.name}</h3><p className="mt-1 text-sm text-slate-600">{record.description ?? 'No description recorded.'}</p><p className="mt-2 text-xs text-slate-500">Type: {record.documentType} · Checklist: {record.checklistItemId ?? 'Not linked'} · Finding: {record.findingId ?? 'Not linked'}</p><p className="mt-1 text-xs text-slate-500">AI analysis: {record.aiAnalysis ? 'Available' : 'Not performed'}</p></div></div></article>)}</div>}
    </section>

    <section className="report-section">
      <h2 className="report-heading">Corrective Actions</h2>
      {actions.length === 0 ? <EmptyReport>No corrective actions recorded.</EmptyReport> : <div className="space-y-3">{actions.map((action) => <article key={action.id} className="report-break rounded-xl border border-slate-200 p-4"><div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><p><span className="report-label">Action</span><strong className="mt-1 block">{action.action}</strong></p><p><span className="report-label">Finding</span><strong className="mt-1 block">{findings.find((finding) => finding.id === action.findingId)?.title ?? action.findingId}</strong></p><p><span className="report-label">Responsible person</span><strong className="mt-1 block">{action.responsiblePerson}</strong></p><p><span className="report-label">Due date</span><strong className="mt-1 block">{action.dueDate}</strong></p><p><span className="report-label">Priority</span><strong className="mt-1 block">{action.priority}</strong></p><p><span className="report-label">Status</span><strong className="mt-1 block">{action.status}</strong></p></div></article>)}</div>}
    </section>

    <section className="report-section">
      <h2 className="report-heading">AI Analysis Summary</h2>
      {derived.evidence.analyzed === 0 ? <EmptyReport>AI analysis has not been performed.</EmptyReport> : <div className="space-y-3">{evidence.filter((record) => record.aiAnalysis).map((record) => <article key={record.id} className="report-break rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">{record.fileName ?? record.name}</h3><p className="mt-2 text-sm text-slate-700"><strong>AI-generated hazard / observation:</strong> {record.aiAnalysis.hazardTitle}</p><p className="mt-1 text-sm text-slate-700"><strong>Severity:</strong> {record.aiAnalysis.severity} · <strong>Confidence:</strong> {record.aiAnalysis.confidence}%</p><p className="mt-3 text-sm text-slate-700"><strong>Explanation:</strong> {record.aiAnalysis.description}</p><p className="mt-3 text-sm text-slate-700"><strong>Recommendation:</strong> {record.aiAnalysis.recommendation}</p></article>)}</div>}
    </section>

    <section className="report-section report-break">
      <h2 className="report-heading">Review &amp; Approval</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><p className="report-label">Inspection status</p><p className="report-value">{inspection.status}</p></div><div><p className="report-label">Reviewer</p><p className="report-value">{inspection.reviewer ?? 'No review information.'}</p></div><div><p className="report-label">Reviewed</p><p className="report-value">{inspection.reviewedAt ? new Date(inspection.reviewedAt).toLocaleString() : 'Not available'}</p></div><div><p className="report-label">Approval state</p><p className="report-value">{inspection.status === 'Approved' || inspection.status === 'Closed' ? 'Approved' : inspection.status === 'Under Review' ? 'Under review' : 'Not approved'}</p></div></div><p className="mt-4 text-sm text-slate-700"><strong>Review comments:</strong> {inspection.reviewComments ?? 'No review comments recorded.'}</p><p className="mt-4 text-sm text-slate-500">Lifecycle: Scheduled → In Progress → Submitted → Under Review → Approved → Closed</p>
    </section>

    <section className="report-section report-break">
      <h2 className="report-heading">Final Summary</h2>
      {inspection.notes ? <p className="text-sm leading-6 text-slate-700">{inspection.notes}</p> : <EmptyReport>No summary recorded.</EmptyReport>}
    </section>

    <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">Report generated {new Date().toLocaleString()} · Source inspection: {inspection.id}</footer>
  </main>
}
