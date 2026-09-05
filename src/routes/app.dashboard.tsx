import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, Building2, ClipboardCheck, FileWarning, HardHat, ListChecks } from 'lucide-react'
import { Card, ErrorState, LoadingState } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { getAllCorrectiveActions } from '@/services/corrective-actions'
import { getComplianceRecords } from '@/services/compliance'
import { getEvidenceDocuments } from '@/services/documents'
import { getAllInspectionFindings, getInspectionChecklist, getInspections } from '@/services/inspections'
import { getMines, type MineRecord } from '@/services/mines'
import type { ComplianceEvidenceDocument, CorrectiveAction, Inspection, InspectionChecklistItem, InspectionFinding } from '@/types/domain'
import type { ComplianceRecord } from '@/types/domain'

export const Route = createFileRoute('/app/dashboard')({ component: GovernanceDashboardPage })

type ComplianceState = 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Not Assessed'
type InspectionSnapshot = { inspection: Inspection; checklist: InspectionChecklistItem[]; compliance: ComplianceState }
function complianceFor(checklist: InspectionChecklistItem[], findings: InspectionFinding[]): ComplianceState {
  const answered = checklist.filter((item) => item.responseStatus)
  const nonCompliant = checklist.some((item) => item.responseStatus === 'Non-compliant')
  const partial = checklist.some((item) => item.responseStatus === 'Partially compliant')
  const openFindings = findings.some((finding) => finding.status !== 'Resolved' && finding.status !== 'Closed')
  if (answered.length === 0 && findings.length === 0) return 'Not Assessed'
  if (nonCompliant || openFindings) return 'Non-Compliant'
  if (partial) return 'Partially Compliant'
  return 'Compliant'
}

function ComplianceBadge({ value }: { value: ComplianceState }) {
  const classes = value === 'Compliant' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : value === 'Partially Compliant' ? 'bg-amber-50 text-amber-800 ring-amber-200' : value === 'Non-Compliant' ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${classes}`}>{value}</span>
}

function GovernanceDashboardPage() {
  const [mines, setMines] = useState<MineRecord[]>([])
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [findings, setFindings] = useState<InspectionFinding[]>([])
  const [actions, setActions] = useState<CorrectiveAction[]>([])
  const [documents, setDocuments] = useState<ComplianceEvidenceDocument[]>([])
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>([])
  const [snapshots, setSnapshots] = useState<InspectionSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [mineRecords, inspectionRecords, findingRecords, actionRecords, documentRecords, complianceRecordData] = await Promise.all([getMines(), getInspections(), getAllInspectionFindings(), getAllCorrectiveActions(), getEvidenceDocuments(), getComplianceRecords()])
        const inspectionFindings = new Map<string, InspectionFinding[]>()
        for (const finding of findingRecords) inspectionFindings.set(finding.inspectionId, [...(inspectionFindings.get(finding.inspectionId) ?? []), finding])
        const inspectionSnapshots = await Promise.all(inspectionRecords.map(async (inspection) => {
          const checklist = await getInspectionChecklist(inspection.id)
          return { inspection, checklist, compliance: complianceFor(checklist, inspectionFindings.get(inspection.id) ?? []) }
        }))
        if (!active) return
        setMines(mineRecords)
        setInspections(inspectionRecords)
        setFindings(findingRecords)
        setActions(actionRecords)
        setDocuments(documentRecords)
        setComplianceRecords(complianceRecordData)
        setSnapshots(inspectionSnapshots)
      } catch (caughtError) {
        if (active) setError(caughtError instanceof Error ? caughtError.message : 'Unable to load governance dashboard.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const mineName = (id: string) => mines.find((mine) => mine.id === id)?.name ?? id
  const today = new Date().toISOString().slice(0, 10)
  const openFindings = findings.filter((finding) => finding.status === 'Open')
  const openActions = actions.filter((action) => action.status !== 'Resolved' && action.status !== 'Verified' && action.status !== 'Closed')
  const overdueActions = openActions.filter((action) => action.dueDate < today)
  const statusCounts = (['Scheduled', 'In Progress', 'Submitted', 'Under Review', 'Approved', 'Closed'] as const).map((status) => ({ status, count: inspections.filter((inspection) => inspection.status === status).length }))
  const complianceCounts = (['Compliant', 'Partially Compliant', 'Non-Compliant', 'Not Assessed'] as const).map((status) => ({ status, count: snapshots.filter((snapshot) => snapshot.compliance === status).length }))
  const compliancePercent = complianceRecords.length ? Math.round((complianceRecords.filter((record) => record.status === 'Compliant').length / complianceRecords.length) * 100) : null
  const overallCompliance: ComplianceState = complianceRecords.length === 0 ? 'Not Assessed' : complianceRecords.some((record) => record.status === 'Non-Compliant' || record.status === 'Overdue') ? 'Non-Compliant' : complianceRecords.some((record) => record.status === 'Pending' || record.status === 'Due Soon') ? 'Partially Compliant' : 'Compliant'
  const categoryCompliance = (['Safety', 'Labour', 'Environment', 'Operations'] as const).map((category) => {
    const checklist = snapshots.flatMap((snapshot) => snapshot.checklist.filter((item) => item.category === category && item.responseStatus && item.responseStatus !== 'N/A'))
    const categoryFindings = openFindings.filter((finding) => finding.category === category)
    const compliant = checklist.filter((item) => item.responseStatus === 'Compliant').length
    const partial = checklist.filter((item) => item.responseStatus === 'Partially compliant').length
    const nonCompliant = checklist.filter((item) => item.responseStatus === 'Non-compliant').length
    const assessed = checklist.length > 0 || categoryFindings.length > 0
    const percentage = checklist.length ? Math.round(((compliant + partial * 0.5) / checklist.length) * 100) : null
    const status: ComplianceState = !assessed ? 'Not Assessed' : nonCompliant > 0 || categoryFindings.length > 0 ? 'Non-Compliant' : partial > 0 ? 'Partially Compliant' : 'Compliant'
    return { category, percentage, status }
  })
  const recent = snapshots.filter((snapshot) => snapshot.inspection.inspectionDate <= today).sort((a, b) => b.inspection.inspectionDate.localeCompare(a.inspection.inspectionDate)).slice(0, 6)
  const upcoming = snapshots.filter((snapshot) => snapshot.inspection.status === 'Scheduled' && snapshot.inspection.inspectionDate >= today).sort((a, b) => a.inspection.inspectionDate.localeCompare(b.inspection.inspectionDate)).slice(0, 5)
  const attentionFindingGroups = [...openFindings.filter((finding) => finding.severity === 'High' || finding.severity === 'Critical').reduce((groups, finding) => {
    const current = groups.get(finding.inspectionId)
    if (current) current.findings.push(finding)
    else groups.set(finding.inspectionId, { finding, findings: [finding] })
    return groups
  }, new Map<string, { finding: InspectionFinding; findings: InspectionFinding[] }>()).values()].sort((a, b) => (a.finding.severity === 'Critical' ? 0 : 1) - (b.finding.severity === 'Critical' ? 0 : 1)).slice(0, 5)
  const attentionFindingInspectionIds = new Set(attentionFindingGroups.map((group) => group.finding.inspectionId))
  const attentionInspections = inspections.filter((inspection) => inspection.status !== 'Closed' && inspection.status !== 'Cancelled' && (inspection.riskLevel === 'High' || inspection.riskLevel === 'Critical') && !attentionFindingInspectionIds.has(inspection.id)).slice(0, 5)
  const expiryCutoff = new Date(`${today}T00:00:00Z`)
  expiryCutoff.setUTCDate(expiryCutoff.getUTCDate() + 30)
  const expiryCutoffDate = expiryCutoff.toISOString().slice(0, 10)
  const expiredDocuments = documents.filter((document) => document.expiryDate && document.expiryDate < today)
  const expiringDocuments = documents.filter((document) => document.expiryDate && document.expiryDate >= today && document.expiryDate <= expiryCutoffDate).sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? '')).slice(0, 5)
  const minePortfolio = mines.map((mine) => {
    const mineSnapshots = snapshots.filter((snapshot) => snapshot.inspection.mineId === mine.id)
    const mineFindings = openFindings.filter((finding) => finding.mineId === mine.id)
    const checklist = mineSnapshots.flatMap((snapshot) => snapshot.checklist.filter((item) => item.responseStatus && item.responseStatus !== 'N/A'))
    const compliant = checklist.filter((item) => item.responseStatus === 'Compliant').length
    const compliance = checklist.length ? Math.round((compliant / checklist.length) * 100) : null
    const lastInspection = mineSnapshots.filter((snapshot) => snapshot.inspection.inspectionDate <= today).sort((a, b) => b.inspection.inspectionDate.localeCompare(a.inspection.inspectionDate))[0]?.inspection.inspectionDate
    const risk = [...mineSnapshots.map((snapshot) => snapshot.inspection.riskLevel), ...mineFindings.map((finding) => finding.severity)].filter((value): value is NonNullable<typeof value> => value !== null).sort((a, b) => ['Critical', 'High', 'Medium', 'Low'].indexOf(a) - ['Critical', 'High', 'Medium', 'Low'].indexOf(b))[0] ?? null
    return { mine, compliance, risk, openViolations: mineFindings.length, lastInspection, status: mine.status }
  }).sort((a, b) => (['Critical', 'High', 'Medium', 'Low'].indexOf(a.risk ?? 'Low') - ['Critical', 'High', 'Medium', 'Low'].indexOf(b.risk ?? 'Low')) || ((a.compliance ?? -1) - (b.compliance ?? -1)))
  const findingSeverityCounts = (['High', 'Medium', 'Low'] as const).map((severity) => ({ severity, count: findings.filter((finding) => finding.severity === severity || (severity === 'High' && finding.severity === 'Critical')).length }))
  const findingStatusCounts = (['Open', 'Resolved'] as const).map((status) => ({ status, count: findings.filter((finding) => finding.status === status).length }))
  const findingSourceCounts = (['AI', 'Manual'] as const).map((source) => ({ source, count: findings.filter((finding) => finding.source === source).length }))
  const actionStatusCounts = (['Open', 'Assigned', 'In Progress', 'Resolved', 'Verified', 'Closed'] as const).map((status) => ({ status, count: actions.filter((action) => action.status === status).length }))

  const metrics = [
    { label: 'Total Mines', value: mines.length, icon: Building2 },
    { label: 'Total Inspections', value: inspections.length, icon: HardHat },
    { label: 'Open Findings', value: openFindings.length, icon: FileWarning },
    { label: 'High-Risk Findings', value: findings.filter((finding) => finding.severity === 'High' || finding.severity === 'Critical').length, icon: AlertTriangle },
    { label: 'Open Corrective Actions', value: openActions.length, icon: ListChecks },
    { label: 'Overall Compliance', value: compliancePercent === null ? 'Not assessed' : `${compliancePercent}%`, icon: ClipboardCheck },
  ]

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return <>
    <PageHeader eyebrow="Governance command center" title="Organization dashboard" description="Live governance indicators derived from organization-scoped mines, inspections, findings, compliance, and corrective actions." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{metrics.map(({ label, value, icon: Icon }) => <Card key={label} className="p-4"><div className="grid size-9 place-items-center rounded-lg bg-slate-100 text-emerald-900"><Icon className="size-4.5" /></div><p className="mt-5 text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs font-bold text-slate-600">{label}</p></Card>)}</div>
  <div className="mt-5 grid gap-5 xl:grid-cols-2">
  <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Inspection overview</p><h2 className="mt-1 font-display text-xl font-semibold text-emerald-950">Lifecycle status</h2></div><HardHat className="size-5 text-emerald-700" /></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{statusCounts.map(({ status, count }) => <div key={status} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{status}</p><p className="mt-1 text-2xl font-bold text-emerald-950">{count}</p></div>)}</div></Card>
  <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Compliance overview</p><h2 className="mt-1 font-display text-xl font-semibold text-emerald-950">{overallCompliance}</h2></div><ComplianceBadge value={overallCompliance} /></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{categoryCompliance.map(({ category, percentage, status }) => <div key={category} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{category}</p><p className="mt-1 text-2xl font-bold text-emerald-950">{percentage === null ? '—' : `${percentage}%`}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">{status}</p></div>)}</div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{complianceCounts.map(({ status, count }) => <div key={status} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{status}</p><p className="mt-1 text-2xl font-bold text-emerald-950">{count}</p></div>)}</div></Card>
  </div>

  <div className="mt-5 grid gap-5 xl:grid-cols-2">
  <Card className="p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Findings &amp; risk overview</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{findingSeverityCounts.map(({ severity, count }) => <div key={severity} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{severity}</p><p className="mt-1 text-2xl font-bold text-emerald-950">{count}</p></div>)}{findingStatusCounts.map(({ status, count }) => <div key={status} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{status}</p><p className="mt-1 text-2xl font-bold text-emerald-950">{count}</p></div>)}{findingSourceCounts.map(({ source, count }) => <div key={source} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{source === 'AI' ? 'AI-generated' : 'Manual'}</p><p className="mt-1 text-2xl font-bold text-emerald-950">{count}</p></div>)}</div></Card>
  <Card className="p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Corrective actions overview</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{actionStatusCounts.map(({ status, count }) => <div key={status} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{status}</p><p className="mt-1 text-2xl font-bold text-emerald-950">{count}</p></div>)}<div className="rounded-xl bg-red-50 p-3"><p className="text-xs text-red-700">Overdue</p><p className="mt-1 text-2xl font-bold text-red-900">{overdueActions.length}</p></div></div></Card>
  </div>

  <div className="mt-5 grid gap-5 xl:grid-cols-2">
  <Card className="p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Recent inspections</p><Link to="/app/inspections" className="text-sm font-semibold text-emerald-800 hover:underline">View all</Link></div><div className="mt-4 space-y-3">{recent.length === 0 ? <p className="text-sm text-slate-500">No inspections recorded.</p> : recent.map(({ inspection, compliance }) => <Link key={inspection.id} to="/app/inspections/$id" params={{ id: inspection.id }} className="block rounded-xl border border-slate-200 p-3 hover:border-emerald-300"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{mineName(inspection.mineId)}</p><p className="mt-1 text-xs text-slate-500">{inspection.inspectionType} · {inspection.inspectorName} · {inspection.inspectionDate}</p></div><StatusBadge status={inspection.status} /></div><div className="mt-2 flex flex-wrap gap-2"><StatusBadge status={inspection.riskLevel} /><ComplianceBadge value={compliance} /></div></Link>)}</div></Card>
  <Card className="p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Upcoming inspections</p><div className="mt-4 space-y-3">{upcoming.length === 0 ? <p className="text-sm text-slate-500">No upcoming scheduled inspections.</p> : upcoming.map(({ inspection }) => <Link key={inspection.id} to="/app/inspections/$id" params={{ id: inspection.id }} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-emerald-300"><div><p className="font-semibold text-slate-900">{mineName(inspection.mineId)}</p><p className="mt-1 text-xs text-slate-500">{inspection.inspectionType} · {inspection.inspectorName}</p></div><div className="text-right"><p className="text-sm font-semibold text-emerald-900">{inspection.inspectionDate}</p><StatusBadge status={inspection.status} /></div></Link>)}</div></Card>
  <Card className="p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">High-risk / attention required</p><div className="mt-4 space-y-3">{attentionFindingGroups.length === 0 && attentionInspections.length === 0 ? <p className="text-sm text-slate-500">No high-risk items require attention.</p> : <>{attentionFindingGroups.map(({ finding, findings: groupedFindings }) => <Link key={finding.inspectionId} to="/app/inspections/$id" params={{ id: finding.inspectionId }} className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/40 p-3"><div><p className="font-semibold text-slate-900">{groupedFindings.length > 1 ? `${groupedFindings.length} high-risk findings` : finding.title}</p><p className="mt-1 text-xs text-slate-500">Finding · {mineName(finding.mineId)}</p></div><StatusBadge status={finding.severity} /></Link>)}{attentionInspections.map((inspection) => <Link key={inspection.id} to="/app/inspections/$id" params={{ id: inspection.id }} className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3"><div><p className="font-semibold text-slate-900">{mineName(inspection.mineId)}</p><p className="mt-1 text-xs text-slate-500">{inspection.inspectionType}</p></div><StatusBadge status={inspection.riskLevel} /></Link>)}</>}</div></Card>
  </div>

  <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <Card className="p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Overdue corrective actions</p><div className="mt-4 space-y-3">{overdueActions.length === 0 ? <p className="text-sm text-slate-500">No overdue corrective actions.</p> : overdueActions.map((action) => <Link key={action.id} to="/app/inspections/$id" params={{ id: action.inspectionId }} className="block rounded-xl border border-red-100 bg-red-50/40 p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{action.action}</p><p className="mt-1 text-xs text-slate-500">{findings.find((finding) => finding.id === action.findingId)?.title ?? 'Finding unavailable'} · {mineName(action.mineId)} · {action.responsiblePerson}</p></div><StatusBadge status={action.priority} /></div><p className="mt-2 text-xs text-red-700">Due {action.dueDate} · {action.status}</p></Link>)}</div></Card>
      <Card className="p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Document expiry</p><div className="mt-4 space-y-3">{expiredDocuments.length === 0 && expiringDocuments.length === 0 ? <p className="text-sm text-slate-500">No documents expiring in the next 30 days.</p> : <>{expiredDocuments.slice(0, 3).map((document) => <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/40 p-3"><div><p className="font-semibold text-slate-900">{document.name}</p><p className="mt-1 text-xs text-slate-500">{mineName(document.mineId)}</p></div><StatusBadge status="Expired" /></div>)}{expiringDocuments.map((document) => <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3"><div><p className="font-semibold text-slate-900">{document.name}</p><p className="mt-1 text-xs text-slate-500">{mineName(document.mineId)}</p></div><p className="text-xs font-semibold text-amber-800">Due {document.expiryDate}</p></div>)}</>}</div></Card>
    </div>

    <Card className="mt-5 overflow-hidden"><div className="border-b border-slate-200 p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Mine priority portfolio</p><h2 className="mt-1 font-display text-xl font-semibold text-emerald-950">Organization mines</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-[.12em] text-slate-500"><tr><th className="px-5 py-3 font-semibold">Mine</th><th className="px-5 py-3 font-semibold">Compliance</th><th className="px-5 py-3 font-semibold">Risk</th><th className="px-5 py-3 font-semibold">Open Violations</th><th className="px-5 py-3 font-semibold">Last Inspection</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{minePortfolio.length === 0 ? <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No mines recorded yet.</td></tr> : minePortfolio.map(({ mine, compliance, risk, openViolations, lastInspection, status }) => <tr key={mine.id}><td className="px-5 py-3 font-semibold text-slate-900">{mine.name}</td><td className="px-5 py-3">{compliance === null ? <ComplianceBadge value="Not Assessed" /> : `${compliance}%`}</td><td className="px-5 py-3"><StatusBadge status={risk} /></td><td className="px-5 py-3 text-slate-700">{openViolations}</td><td className="px-5 py-3 text-slate-600">{lastInspection ?? 'Not recorded'}</td><td className="px-5 py-3"><StatusBadge status={status as Parameters<typeof StatusBadge>[0]['status']} /></td></tr>)}</tbody></table></div></Card>
  </>
}
