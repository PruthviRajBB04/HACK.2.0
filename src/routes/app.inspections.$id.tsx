import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, CircleAlert, FileText, Upload } from 'lucide-react'
import { Button, Card, ErrorState, Field, Input, LoadingState, Select, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { demoInspectionFindings, demoInspections, demoMines } from '@/data/demo'
import { createInspectionFinding, ensureInspectionChecklist, getInspectionById, getInspectionFindings, getInspectionChecklist, saveInspectionChecklist, updateFindingStatus, updateInspectionStatus } from '@/services/inspections'
import { getMines, type MineRecord } from '@/services/mines'
import type { FindingSource, Inspection, InspectionChecklistItem, InspectionChecklistResponseStatus, InspectionFinding } from '@/types/domain'
import { useSession } from '@/context/SessionContext'
import { getEvidenceAccessUrl, getInspectionEvidence, linkEvidenceToFinding, uploadEvidenceDocument, saveAiAnalysis } from '@/services/documents'
import type { ComplianceEvidenceDocument } from '@/types/domain'
import { analyzeInspectionEvidence, type InspectionVisionAnalysis } from '@/services/inspection-vision'
import { createCorrectiveAction, getInspectionCorrectiveActions, updateCorrectiveActionStatus } from '@/services/corrective-actions'
import type { CorrectiveAction, CorrectiveActionPriority, CorrectiveActionStatus } from '@/types/domain'

export const Route = createFileRoute('/app/inspections/$id')({ component: InspectionDetailRoute })

const mineName = (id: string) => demoMines.find((mine) => mine.id === id)?.name ?? 'Unknown mine'

function InspectionDetailRoute() {
  const location = useLocation()
  return location.pathname.endsWith('/report') ? <Outlet /> : <InspectionDetailPage />
}

function InspectionDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { session } = useSession()
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [findings, setFindings] = useState<InspectionFinding[]>([])
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([])
  const [mines, setMines] = useState<MineRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<InspectionChecklistItem[]>([])
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [checklistSaving, setChecklistSaving] = useState(false)
  const [startingInspection, setStartingInspection] = useState(false)
  const [checklistError, setChecklistError] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<ComplianceEvidenceDocument[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceSaving, setEvidenceSaving] = useState(false)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<File[]>([])
  const [evidenceResults, setEvidenceResults] = useState<string[]>([])
  const [evidenceDescription, setEvidenceDescription] = useState('')
  const [evidenceChecklistId, setEvidenceChecklistId] = useState('')
  const [evidenceFindingId, setEvidenceFindingId] = useState('')
  const [aiAnalyzingId, setAiAnalyzingId] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [findingSaving, setFindingSaving] = useState(false)
  const [findingError, setFindingError] = useState<string | null>(null)
  const [findingEvidenceId, setFindingEvidenceId] = useState<string | null>(null)
  const [findingForm, setFindingForm] = useState<{ title: string; description: string; category: 'Safety' | 'Environment' | 'Labour' | 'Operations'; severity: 'Low' | 'Medium' | 'High' | 'Critical'; recommendation: string; mineId: string; source: FindingSource; status: 'Open' | 'Resolved' | 'Accepted Risk' }>({ title: '', description: '', category: 'Safety', severity: 'Medium', recommendation: '', mineId: '', source: 'Manual', status: 'Open' })
  const [actionSaving, setActionSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionForm, setActionForm] = useState<{ findingId: string; action: string; responsiblePerson: string; dueDate: string; priority: CorrectiveActionPriority; status: CorrectiveActionStatus }>({ findingId: '', action: '', responsiblePerson: '', dueDate: '', priority: 'Medium', status: 'Open' })
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)

      let nextInspection: Inspection | null
      try {
        nextInspection = await getInspectionById(id)
      } catch (caughtError) {
        if (!active) return
        setInspection(null)
        setFindings([])
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load inspection.')
        setLoading(false)
        return
      }

      if (!active) return

      const demoInspection = id.startsWith('insp-demo-') ? demoInspections.find((item) => item.id === id) : null
      setInspection(nextInspection ?? demoInspection ?? null)

      if (nextInspection) {
        setChecklistLoading(true)
        setChecklistError(null)
        try {
          setChecklist(await getInspectionChecklist(id))
        } catch (caughtError) {
          setChecklistError(caughtError instanceof Error ? caughtError.message : 'Unable to load inspection checklist.')
        } finally {
          setChecklistLoading(false)
        }
        try {
          const organizationMines = await getMines()
          if (!active) return
          setMines(organizationMines)
          setFindingForm((current) => ({ ...current, mineId: current.mineId || nextInspection.mineId }))
        } catch (caughtError) {
          if (active) setFindingError(caughtError instanceof Error ? caughtError.message : 'Unable to load mines.')
        }
        setEvidenceLoading(true)
        try {
          const records = await getInspectionEvidence(id)
          const recordsWithUrls = await Promise.all(records.map(async (record) => ({ ...record, accessUrl: record.storagePath ? await getEvidenceAccessUrl(record.storagePath) : undefined })))
          setEvidence(recordsWithUrls)
        } catch (caughtError) {
          setEvidenceError(caughtError instanceof Error ? caughtError.message : 'Unable to load inspection evidence.')
        } finally {
          setEvidenceLoading(false)
        }
        try {
          setCorrectiveActions(await getInspectionCorrectiveActions(id))
        } catch (caughtError) {
          if (active) setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to load corrective actions.')
        }
      }

      try {
        const nextFindings = await getInspectionFindings(id)
        if (!active) return
        setFindings(nextFindings.length ? nextFindings : demoInspectionFindings.filter((item) => item.inspectionId === id))
      } catch (caughtError) {
        if (!active) return
        setFindings(demoInspectionFindings.filter((item) => item.inspectionId === id))
        setError(caughtError instanceof Error ? `Unable to load inspection findings: ${caughtError.message}` : 'Unable to load inspection findings.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [id])

  const summary = useMemo(() => {
    if (!inspection) return null
    const inspectionMineName = mines.find((mine) => mine.id === inspection.mineId)?.name ?? inspection.mineName ?? mineName(inspection.mineId)
    return [
      { label: 'Mine', value: inspectionMineName },
      { label: 'Inspector', value: inspection.inspectorName },
      { label: 'Type', value: inspection.inspectionType },
      { label: 'Date', value: new Date(inspection.inspectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
      { label: 'Status', value: inspection.status },
    ]
  }, [inspection, mines])

  const inspectionSummary = useMemo(() => {
    const highFindings = findings.filter((finding) => finding.severity === 'High').length
    const mediumFindings = findings.filter((finding) => finding.severity === 'Medium').length
    const lowFindings = findings.filter((finding) => finding.severity === 'Low').length
    const criticalFindings = findings.filter((finding) => finding.severity === 'Critical').length
    const nonCompliantItems = checklist.filter((item) => item.responseStatus === 'Non-compliant').length
    const partiallyCompliantItems = checklist.filter((item) => item.responseStatus === 'Partially compliant').length
    const inferredRisk = inspection?.riskLevel ?? (criticalFindings > 0 ? 'Critical' : highFindings > 0 || nonCompliantItems > 0 ? 'High' : mediumFindings > 0 || partiallyCompliantItems > 0 ? 'Medium' : null)

    return {
      checklist: {
        total: checklist.length,
        compliant: checklist.filter((item) => item.responseStatus === 'Compliant').length,
        partiallyCompliant: partiallyCompliantItems,
        nonCompliant: nonCompliantItems,
        notApplicable: checklist.filter((item) => item.responseStatus === 'N/A').length,
        notAnswered: checklist.filter((item) => !item.responseStatus).length,
      },
      findings: {
        total: findings.length,
        high: highFindings,
        medium: mediumFindings,
        low: lowFindings,
        manual: findings.filter((finding) => finding.source === 'Manual').length,
        ai: findings.filter((finding) => finding.source === 'AI').length,
      },
      evidence: {
        total: evidence.length,
        images: evidence.filter((item) => item.mimeType?.startsWith('image/')).length,
        videos: evidence.filter((item) => item.mimeType?.startsWith('video/')).length,
        documents: evidence.filter((item) => !item.mimeType?.startsWith('image/') && !item.mimeType?.startsWith('video/')).length,
        analyzed: evidence.filter((item) => item.aiAnalysis).length,
      },
      risk: inferredRisk ?? 'Not assessed',
    }
  }, [checklist, evidence, findings, inspection])

  const complianceSummary = useMemo(() => {
    const answeredItems = checklist.filter((item) => item.responseStatus)
    const applicableItems = checklist.filter((item) => item.responseStatus && item.responseStatus !== 'N/A')
    const nonCompliantItems = checklist.filter((item) => item.responseStatus === 'Non-compliant')
    const partialItems = checklist.filter((item) => item.responseStatus === 'Partially compliant')
    const openFindings = findings.filter((finding) => finding.status !== 'Resolved' && finding.status !== 'Closed')
    const hasSignal = answeredItems.length > 0 || findings.length > 0
    const status = !hasSignal
      ? 'Not Assessed'
      : nonCompliantItems.length > 0 || openFindings.length > 0
        ? 'Non-Compliant'
        : partialItems.length > 0 || (applicableItems.length > 0 && applicableItems.some((item) => item.responseStatus !== 'Compliant'))
          ? 'Partially Compliant'
          : 'Compliant'

    return {
      status,
      total: checklist.length,
      compliant: checklist.filter((item) => item.responseStatus === 'Compliant').length,
      partial: partialItems.length,
      nonCompliant: nonCompliantItems.length,
      notApplicable: checklist.filter((item) => item.responseStatus === 'N/A').length,
      openFindings,
      high: openFindings.filter((finding) => finding.severity === 'High' || finding.severity === 'Critical').length,
      medium: openFindings.filter((finding) => finding.severity === 'Medium').length,
      low: openFindings.filter((finding) => finding.severity === 'Low').length,
      issues: [
        ...nonCompliantItems.map((item) => ({
          id: item.id,
          title: item.title,
          kind: 'Checklist item',
          detail: item.comment ?? 'Non-compliant checklist result',
          checklistId: item.id,
          findingId: undefined,
          evidenceId: evidence.find((record) => record.checklistItemId === item.id)?.id,
        })),
        ...openFindings.map((finding) => ({
          id: finding.id,
          title: finding.title,
          kind: 'Finding',
          detail: finding.description,
          checklistId: undefined,
          findingId: finding.id,
          evidenceId: evidence.find((record) => record.findingId === finding.id)?.id,
        })),
      ],
    }
  }, [checklist, evidence, findings])

  async function updateStatus(nextStatus: Inspection['status']) {
    if (!inspection) return
    try {
      const updated = await updateInspectionStatus(inspection.id, nextStatus)
      setInspection(updated)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update status.')
    }
  }

  async function transitionReview(nextStatus: Inspection['status']) {
    if (!inspection) return
    if (nextStatus === 'Submitted' && inspection.status !== 'In Progress') return
    if (nextStatus === 'Under Review' && inspection.status !== 'Submitted') return
    if (nextStatus === 'Approved' && inspection.status !== 'Under Review') return
    if (nextStatus === 'Closed' && inspection.status !== 'Approved') return
    if (nextStatus === 'In Progress' && inspection.status !== 'Under Review') return
    if (nextStatus === 'In Progress' && !reviewComment.trim()) {
      setError('Add review comments before returning this inspection for changes.')
      return
    }
    setReviewSaving(true)
    setError(null)
    try {
      const updated = await updateInspectionStatus(inspection.id, nextStatus, reviewComment, session?.name)
      setInspection(updated)
      setReviewComment('')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update review status.')
    } finally {
      setReviewSaving(false)
    }
  }

  async function startInspection() {
    if (!inspection) return
    setStartingInspection(true)
    setChecklistError(null)
    try {
      const items = await ensureInspectionChecklist(inspection.id, session?.organizationId ?? null)
      const updated = await updateInspectionStatus(inspection.id, 'In Progress')
      setChecklist(items)
      setInspection(updated)
    } catch (caughtError) {
      setChecklistError(caughtError instanceof Error ? caughtError.message : 'Unable to start inspection.')
    } finally {
      setStartingInspection(false)
    }
  }

  function updateChecklistItem(itemId: string, changes: Partial<InspectionChecklistItem>) {
    if (inspection?.status === 'Closed') return
    setChecklist((current) => current.map((item) => item.id === itemId ? { ...item, ...changes } : item))
  }

  async function saveChecklistProgress() {
    if (inspection?.status === 'Closed') return
    setChecklistSaving(true)
    setChecklistError(null)
    try {
      setChecklist(await saveInspectionChecklist(id, checklist, session?.organizationId ?? null))
    } catch (caughtError) {
      setChecklistError(caughtError instanceof Error ? caughtError.message : 'Unable to save checklist progress.')
    } finally {
      setChecklistSaving(false)
    }
  }

  function selectEvidenceFiles(event: ChangeEvent<HTMLInputElement>) {
    setSelectedEvidenceFiles((current) => [...current, ...Array.from(event.target.files ?? [])])
  }

  function removeEvidenceFile(index: number) {
    setSelectedEvidenceFiles((current) => current.filter((_file, fileIndex) => fileIndex !== index))
  }

  async function addEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inspection?.status === 'Closed') return
    const evidenceForm = event.currentTarget
    if (selectedEvidenceFiles.length === 0 || !inspection) {
      setEvidenceError('Choose at least one file before uploading evidence.')
      return
    }

    setEvidenceSaving(true)
    setEvidenceError(null)
    setEvidenceResults([])
    const successfulFiles: string[] = []
    const failedFiles: string[] = []
    const failedFileObjects: File[] = []
    try {
      for (const file of selectedEvidenceFiles) {
        try {
          await uploadEvidenceDocument(file, {
            name: file.name,
            documentType: file.type.startsWith('image/') ? 'Inspection photo' : file.type.startsWith('video/') ? 'Inspection video' : 'Inspection document',
            description: evidenceDescription,
            mineId: inspection.mineId,
            inspectionId: inspection.id,
            checklistItemId: evidenceChecklistId || undefined,
            findingId: evidenceFindingId || undefined,
          }, session?.organizationId ?? null)
          successfulFiles.push(file.name)
        } catch (caughtError) {
          failedFiles.push(`${file.name}: ${caughtError instanceof Error ? caughtError.message : 'Upload failed'}`)
          failedFileObjects.push(file)
        }
      }

      const records = await getInspectionEvidence(inspection.id)
      const recordsWithUrls = await Promise.all(records.map(async (record) => ({ ...record, accessUrl: record.storagePath ? await getEvidenceAccessUrl(record.storagePath) : undefined })))
      setEvidence(recordsWithUrls)
      setEvidenceResults(successfulFiles.map((fileName) => `Uploaded: ${fileName}`))
      if (failedFiles.length > 0) {
        setEvidenceError(`Some files could not be uploaded: ${failedFiles.join('; ')}`)
        setSelectedEvidenceFiles(failedFileObjects)
      }
      if (successfulFiles.length > 0) {
        if (failedFiles.length === 0) {
          setSelectedEvidenceFiles([])
          evidenceForm.reset()
        }
      }
      setEvidenceDescription('')
      setEvidenceChecklistId('')
      setEvidenceFindingId('')
    } catch (caughtError) {
      setEvidenceError(caughtError instanceof Error ? caughtError.message : 'Unable to upload evidence.')
    } finally {
      setEvidenceSaving(false)
    }
  }

  async function updateFindingStatusFor(findingId: string, nextStatus: InspectionFinding['status']) {
    if (inspection?.status === 'Closed') return
    try {
      const updated = await updateFindingStatus(findingId, nextStatus)
      setFindings((current) => current.map((entry) => entry.id === findingId ? updated : entry))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update finding status.')
    }
  }

  async function createFinding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inspection?.status === 'Closed') return
    if (!inspection) return
    setFindingSaving(true)
    setFindingError(null)
    try {
      const finding = await createInspectionFinding({ ...findingForm, inspectionId: inspection.id }, session?.organizationId ?? null)
      if (findingEvidenceId) await linkEvidenceToFinding(findingEvidenceId, finding.id)
      setFindings((current) => [finding, ...current])
      if (findingEvidenceId) setEvidence((current) => current.map((record) => record.id === findingEvidenceId ? { ...record, findingId: finding.id } : record))
      setFindingEvidenceId(null)
      setFindingForm({ title: '', description: '', category: 'Safety', severity: 'Medium', recommendation: '', mineId: inspection.mineId, source: 'Manual', status: 'Open' })
    } catch (caughtError) {
      setFindingError(caughtError instanceof Error ? caughtError.message : 'Unable to create finding.')
    } finally {
      setFindingSaving(false)
    }
  }

  async function createAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inspection?.status === 'Closed') return
    if (!inspection || !actionForm.findingId) return
    const finding = findings.find((item) => item.id === actionForm.findingId)
    if (!finding) return
    setActionSaving(true)
    setActionError(null)
    try {
      const action = await createCorrectiveAction({ ...actionForm, inspectionId: inspection.id, mineId: finding.mineId }, session?.organizationId ?? null)
      setCorrectiveActions((current) => [action, ...current])
      setActionForm({ findingId: '', action: '', responsiblePerson: '', dueDate: '', priority: 'Medium', status: 'Open' })
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to create corrective action.')
    } finally {
      setActionSaving(false)
    }
  }

  async function updateActionStatus(actionId: string, status: CorrectiveActionStatus) {
    if (inspection?.status === 'Closed') return
    try {
      const updated = await updateCorrectiveActionStatus(actionId, status)
      setCorrectiveActions((current) => current.map((item) => item.id === actionId ? updated : item))
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to update corrective action.')
    }
  }

  async function analyzeEvidence(record: ComplianceEvidenceDocument) {
    if (inspection?.status === 'Closed' || !inspection || !record.inspectionId) return
    setAiAnalyzingId(record.id)
    setAiError(null)
    try {
      const analysis = await analyzeInspectionEvidence(inspection.id, record.id)
      // Persist AI analysis to database
      await saveAiAnalysis(record.id, analysis)
      // Update local evidence with new analysis
      setEvidence((current) => current.map((item) => item.id === record.id ? { ...item, aiAnalysis: analysis } : item))
    } catch (caughtError) {
      setAiError(caughtError instanceof Error ? caughtError.message : 'Unable to analyze evidence.')
    } finally {
      setAiAnalyzingId(null)
    }
  }

  function mapAiCategoryToFinding(aiCategory: string): 'Safety' | 'Environment' | 'Labour' | 'Operations' {
    const categoryMap: Record<string, 'Safety' | 'Environment' | 'Labour' | 'Operations'> = {
      'Safety': 'Safety',
      'PPE': 'Safety',
      'Environmental': 'Environment',
      'Equipment': 'Operations',
      'Electrical': 'Safety',
      'Fire': 'Safety',
      'Structural': 'Operations',
      'Operational': 'Operations',
    }
    return categoryMap[aiCategory] ?? 'Safety'
  }

  function useAnalysisForFinding(analysis: InspectionVisionAnalysis, evidenceId: string) {
    setFindingForm((current) => ({
      ...current,
      title: analysis.hazardTitle,
      description: analysis.description,
      category: mapAiCategoryToFinding(analysis.category),
      severity: analysis.severity,
      recommendation: analysis.recommendation,
      mineId: inspection?.mineId ?? current.mineId,
      source: 'AI',
    }))
    setFindingEvidenceId(evidenceId)
    setFindingError(null)
  }

  if (loading) return <LoadingState />
  if (!inspection) return <ErrorState message="Inspection not found." />
  const isReadOnly = inspection.status === 'Closed'

  const completedItems = checklist.filter((item) => item.responseStatus).length
  const applicableItems = checklist.filter((item) => item.responseStatus && item.responseStatus !== 'N/A')
  const compliantItems = checklist.filter((item) => item.responseStatus === 'Compliant').length
  const partiallyCompliantItems = checklist.filter((item) => item.responseStatus === 'Partially compliant').length
  const nonCompliantItems = checklist.filter((item) => item.responseStatus === 'Non-compliant').length
  const notApplicableItems = checklist.filter((item) => item.responseStatus === 'N/A').length
  const openItems = checklist.filter((item) => !item.responseStatus).length
  const compliancePercentage = applicableItems.length ? Math.round((compliantItems / applicableItems.length) * 100) : 0
  const checklistByCategory = checklist.reduce<Record<string, InspectionChecklistItem[]>>((groups, item) => {
    ;(groups[item.category] ??= []).push(item)
    return groups
  }, {})

  return (
    <>
      <PageHeader
        eyebrow="Inspection detail"
        title={inspection.inspectionType}
        description={inspection.description ?? 'No summary recorded for this inspection.'}
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/app/inspections/$id/report" params={{ id }}><Button variant="secondary">Final Inspection Report</Button></Link>
            <Link to="/app/inspections"><Button variant="secondary" className="gap-2"><ArrowLeft className="size-4" />Back to list</Button></Link>
          </div>
        }
      />

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary?.map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{item.label}</p>
            <p className="mt-3 text-sm font-semibold text-slate-900">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Inspection status</p>
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge status={inspection.status} />
              <StatusBadge status={inspection.riskLevel} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {inspection.status === 'Scheduled' && <Button type="button" onClick={() => void startInspection()} disabled={startingInspection}>{startingInspection ? 'Starting…' : 'Start inspection'}</Button>}
            <StatusBadge status={inspection.status} />
            <Button onClick={() => navigate({ to: '/app/inspections/create' })}>New inspection</Button>
          </div>
        </div>
      </Card>

      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Compliance</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-emerald-950">Inspection compliance</h2>
            <p className="mt-1 text-sm text-slate-500">Derived from this inspection's checklist results and findings.</p>
          </div>
          <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${complianceSummary.status === 'Compliant' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : complianceSummary.status === 'Not Assessed' ? 'bg-slate-100 text-slate-600 ring-slate-200' : complianceSummary.status === 'Partially Compliant' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-red-50 text-red-800 ring-red-200'}`}>{complianceSummary.status}</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Total requirements</p><p className="mt-1 text-xl font-bold text-emerald-950">{complianceSummary.total}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Compliant</p><p className="mt-1 text-xl font-bold text-emerald-950">{complianceSummary.compliant}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Partially compliant</p><p className="mt-1 text-xl font-bold text-emerald-950">{complianceSummary.partial}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Non-compliant</p><p className="mt-1 text-xl font-bold text-emerald-950">{complianceSummary.nonCompliant}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Not applicable</p><p className="mt-1 text-xl font-bold text-emerald-950">{complianceSummary.notApplicable}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Open violations / findings</p><p className="mt-1 text-xl font-bold text-emerald-950">{complianceSummary.openFindings.length + complianceSummary.nonCompliant}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">High severity</p><p className="mt-1 text-xl font-bold text-emerald-950">{complianceSummary.high}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Medium / Low severity</p><p className="mt-1 text-xl font-bold text-emerald-950">{complianceSummary.medium} / {complianceSummary.low}</p></div>
        </div>
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Compliance issues</p>
          {complianceSummary.issues.length === 0 ? <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No compliance issues identified from the available checklist responses or findings.</p> : <div className="mt-3 space-y-3">
            {complianceSummary.issues.map((issue) => <div key={`${issue.kind}-${issue.id}`} className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><p className="font-semibold text-slate-900">{issue.title}</p><span className="text-xs font-bold uppercase tracking-[.1em] text-red-700">{issue.kind}</span></div>
              <p className="mt-1 text-slate-600">{issue.detail}</p>
              <p className="mt-3 text-xs text-slate-500">Inspection: {inspection.id} · Mine: {mines.find((mine) => mine.id === inspection.mineId)?.name ?? inspection.mineName ?? 'Current inspection mine'}</p>
              <p className="mt-1 text-xs text-slate-500">Checklist item: {issue.checklistId ?? 'Not applicable'} · Finding: {issue.findingId ?? 'Not applicable'} · Evidence: {issue.evidenceId ?? 'Not linked'}</p>
            </div>)}
          </div>}
        </div>
      </Card>

      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Review &amp; Approval</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-emerald-950">Inspection review</h2>
            <p className="mt-1 text-sm text-slate-500">Review the completed inspection record before approval or closure.</p>
          </div>
          <StatusBadge status={inspection.status} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs text-slate-500">Mine</p><p className="mt-1 text-sm font-semibold text-slate-900">{summary?.find((item) => item.label === 'Mine')?.value}</p></div>
          <div><p className="text-xs text-slate-500">Inspector</p><p className="mt-1 text-sm font-semibold text-slate-900">{inspection.inspectorName}</p></div>
          <div><p className="text-xs text-slate-500">Inspection date</p><p className="mt-1 text-sm font-semibold text-slate-900">{new Date(inspection.inspectionDate).toLocaleDateString('en-GB')}</p></div>
          <div><p className="text-xs text-slate-500">Reviewer</p><p className="mt-1 text-sm font-semibold text-slate-900">{inspection.reviewer ?? 'Not assigned'}</p></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 text-sm">Checklist: <strong>{inspectionSummary.checklist.compliant} compliant</strong> / {inspectionSummary.checklist.total} total</div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">Findings: <strong>{inspectionSummary.findings.total}</strong> ({inspectionSummary.findings.high} high)</div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">Corrective actions: <strong>{correctiveActions.length}</strong> ({correctiveActions.filter((action) => action.status !== 'Closed').length} open)</div>
        </div>
        <div className="mt-5 rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
          <p><strong className="text-slate-900">Review comments:</strong> {inspection.reviewComments ?? 'No review comments recorded.'}</p>
          <p className="mt-2"><strong className="text-slate-900">Review timestamp:</strong> {inspection.reviewedAt ? new Date(inspection.reviewedAt).toLocaleString() : 'Not available'}</p>
        </div>
        {inspection.status === 'Under Review' && <Field label="Review comments"><Textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Explain any changes required, or add approval notes." /></Field>}
        <div className="mt-5 flex flex-wrap gap-3">
          {inspection.status === 'In Progress' && <Button type="button" onClick={() => void transitionReview('Submitted')} disabled={reviewSaving}>Submit for Review</Button>}
          {inspection.status === 'Submitted' && <Button type="button" onClick={() => void transitionReview('Under Review')} disabled={reviewSaving}>Start Review</Button>}
          {inspection.status === 'Under Review' && <><Button type="button" onClick={() => void transitionReview('Approved')} disabled={reviewSaving}>Approve</Button><Button type="button" variant="secondary" onClick={() => void transitionReview('In Progress')} disabled={reviewSaving || !reviewComment.trim()}>Return for Changes</Button></>}
          {inspection.status === 'Approved' && <Button type="button" onClick={() => void transitionReview('Closed')} disabled={reviewSaving}>Close Inspection</Button>}
          {['Scheduled', 'Closed', 'Cancelled'].includes(inspection.status) && <p className="text-sm text-slate-500">No review action is available in this status.</p>}
        </div>
      </Card>

      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Inspection summary</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-emerald-950">Readiness and risk overview</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600"><span>Overall risk</span><StatusBadge status={inspectionSummary.risk === 'Not assessed' ? null : inspectionSummary.risk as 'Low' | 'Medium' | 'High' | 'Critical'} /></div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Checklist</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <p>Total <strong className="float-right">{inspectionSummary.checklist.total}</strong></p>
              <p>Compliant <strong className="float-right">{inspectionSummary.checklist.compliant}</strong></p>
              <p>Partially compliant <strong className="float-right">{inspectionSummary.checklist.partiallyCompliant}</strong></p>
              <p>Non-compliant <strong className="float-right">{inspectionSummary.checklist.nonCompliant}</strong></p>
              <p>N/A <strong className="float-right">{inspectionSummary.checklist.notApplicable}</strong></p>
              <p>Not answered <strong className="float-right">{inspectionSummary.checklist.notAnswered}</strong></p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Findings</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <p>Total <strong className="float-right">{inspectionSummary.findings.total}</strong></p>
              <p>High <strong className="float-right">{inspectionSummary.findings.high}</strong></p>
              <p>Medium <strong className="float-right">{inspectionSummary.findings.medium}</strong></p>
              <p>Low <strong className="float-right">{inspectionSummary.findings.low}</strong></p>
              <p>Manual <strong className="float-right">{inspectionSummary.findings.manual}</strong></p>
              <p>AI-generated <strong className="float-right">{inspectionSummary.findings.ai}</strong></p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Evidence</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <p>Total <strong className="float-right">{inspectionSummary.evidence.total}</strong></p>
              <p>Images / photos <strong className="float-right">{inspectionSummary.evidence.images}</strong></p>
              <p>Videos <strong className="float-right">{inspectionSummary.evidence.videos}</strong></p>
              <p>Documents <strong className="float-right">{inspectionSummary.evidence.documents}</strong></p>
              <p>AI-analyzed <strong className="float-right">{inspectionSummary.evidence.analyzed}</strong></p>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">Inspection status:</span> {inspection.status}. Risk is based on the recorded inspection risk, findings, and non-compliant or partially compliant checklist results.
        </div>
      </Card>

      <Card className="mb-5 p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-slate-500"><Upload className="size-4" />Evidence</div>
        {inspection.status === 'In Progress' && !isReadOnly && <form onSubmit={addEvidence} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
          <Field label="Files"><Input name="evidenceFiles" type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={selectEvidenceFiles} className="px-2 py-2" /></Field>
          <Field label="Description / note"><Input value={evidenceDescription} onChange={(event) => setEvidenceDescription(event.target.value)} placeholder="Describe this evidence" /></Field>
          <Field label="Checklist item"><Select value={evidenceChecklistId} onChange={(event) => setEvidenceChecklistId(event.target.value)}><option value="">None</option>{checklist.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></Field>
          <Field label="Finding"><Select value={evidenceFindingId} onChange={(event) => setEvidenceFindingId(event.target.value)}><option value="">None</option>{findings.map((finding) => <option key={finding.id} value={finding.id}>{finding.title}</option>)}</Select></Field>
          <Button type="submit" disabled={evidenceSaving}>{evidenceSaving ? 'Uploading…' : 'Upload evidence'}</Button>
        </form>}
        {selectedEvidenceFiles.length > 0 && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-900">{selectedEvidenceFiles.length} {selectedEvidenceFiles.length === 1 ? 'file' : 'files'} selected</p><div className="mt-2 space-y-2">{selectedEvidenceFiles.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 text-sm text-slate-600"><span className="truncate">{file.name}</span><button type="button" onClick={() => removeEvidenceFile(index)} className="shrink-0 font-semibold text-red-700 hover:text-red-900">Remove</button></div>)}</div></div>}
        {evidenceResults.length > 0 && <div className="mt-4 space-y-1 text-sm text-emerald-800">{evidenceResults.map((result) => <p key={result}>{result}</p>)}</div>}
        {evidenceError && <div className="mt-4"><ErrorState message={evidenceError} /></div>}
        {aiError && <div className="mt-4"><ErrorState message={aiError} /></div>}
        {evidenceLoading ? <div className="mt-4"><LoadingState /></div> : evidence.length === 0 ? <p className="mt-4 text-sm text-slate-500">No evidence uploaded for this inspection yet.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {evidence.map((record) => {
            const analysis = record.aiAnalysis
            const isImage = record.mimeType?.startsWith('image/')
            return <div key={record.id} className="rounded-xl border border-slate-200 p-4"><a href={record.accessUrl} target="_blank" rel="noreferrer" className="block hover:text-emerald-800"><p className="font-semibold text-slate-900">{record.fileName ?? record.name}</p><p className="mt-1 text-xs text-slate-500">{record.documentType}{record.description ? ` · ${record.description}` : ''}</p><p className="mt-2 text-xs text-slate-500">Checklist: {checklist.find((item) => item.id === record.checklistItemId)?.title ?? 'None'} · Finding: {findings.find((finding) => finding.id === record.findingId)?.title ?? 'None'}</p><p className="mt-1 text-xs text-slate-400">{new Date(record.uploadDate).toLocaleString()}</p><span className="mt-3 inline-block text-sm font-semibold text-emerald-800">Open evidence</span></a>{isImage && <div className="mt-4 border-t border-slate-100 pt-3">{!isReadOnly && <Button type="button" variant="secondary" onClick={() => void analyzeEvidence(record)} disabled={aiAnalyzingId === record.id}>{aiAnalyzingId === record.id ? 'Analyzing…' : analysis ? 'Re-analyze' : 'Analyze with AI'}</Button>}{analysis && <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm"><p className="font-bold uppercase tracking-[.12em] text-slate-500">AI Vision analysis</p><p className="mt-3"><strong>Hazard detected:</strong> {analysis.detectedHazard ? 'Yes' : 'No'}</p><p className="mt-1"><strong>Hazard:</strong> {analysis.hazardTitle}</p><p className="mt-1"><strong>Category:</strong> {analysis.category}</p><p className="mt-1"><strong>Severity:</strong> {analysis.severity}</p><p className="mt-1"><strong>Confidence:</strong> {analysis.confidence}%</p><p className="mt-3"><strong>Description:</strong> {analysis.description}</p><p className="mt-3"><strong>Recommendation:</strong> {analysis.recommendation}</p>{!isReadOnly && <Button type="button" className="mt-4" onClick={() => useAnalysisForFinding(analysis, record.id)}>Create Finding</Button>}</div>}</div>}</div>
          })}
        </div>}
      </Card>

      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Inspection checklist</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-emerald-950">Field verification</h2>
            <p className="mt-1 text-sm text-slate-500">Record each control as the inspection is performed.</p>
          </div>
          {inspection.status !== 'Scheduled' && !isReadOnly && <Button onClick={() => void saveChecklistProgress()} disabled={checklistSaving || checklistLoading}>{checklistSaving ? 'Saving…' : 'Save progress'}</Button>}
        </div>

        {inspection.status === 'Scheduled' ? (
          <>
            {checklistError && <div className="mt-5"><ErrorState message={checklistError} /></div>}
            <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Start the inspection to open the field checklist.</p>
          </>
        ) : checklistLoading ? <LoadingState /> : checklistError ? <div className="mt-5"><ErrorState message={checklistError} /></div> : checklist.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">No checklist items are available for this inspection.</p>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Completed items</p><p className="mt-1 text-xl font-bold text-emerald-950">{completedItems} / {checklist.length}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Compliance</p><p className="mt-1 text-xl font-bold text-emerald-950">{compliancePercentage}%</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Compliant</p><p className="mt-1 text-xl font-bold text-emerald-950">{compliantItems}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Partially compliant</p><p className="mt-1 text-xl font-bold text-emerald-950">{partiallyCompliantItems}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Non-compliant</p><p className="mt-1 text-xl font-bold text-emerald-950">{nonCompliantItems}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">N/A</p><p className="mt-1 text-xl font-bold text-emerald-950">{notApplicableItems}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Open / unanswered</p><p className="mt-1 text-xl font-bold text-emerald-950">{openItems}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Open / non-compliant</p><p className="mt-1 text-xl font-bold text-emerald-950">{openItems + nonCompliantItems}</p></div>
            </div>
            <div className="mt-6 space-y-6">
              {Object.entries(checklistByCategory).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-bold uppercase tracking-[.12em] text-slate-600">{category}</h3>
                  <div className="mt-3 space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-[220px_1fr]">
                          <Field label="Result">
                            <Select disabled={isReadOnly} value={item.responseStatus ?? ''} onChange={(event) => updateChecklistItem(item.id, { responseStatus: (event.target.value || null) as InspectionChecklistResponseStatus | null })} className="mt-1">
                              <option value="">Not assessed</option>
                              <option>Compliant</option>
                              <option>Non-compliant</option>
                              <option>Partially compliant</option>
                              <option>N/A</option>
                            </Select>
                          </Field>
                          <Field label="Comment">
                            <Textarea disabled={isReadOnly} value={item.comment ?? ''} onChange={(event) => updateChecklistItem(item.id, { comment: event.target.value })} className="mt-1 min-h-20" placeholder="Add an observation or comment." />
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-slate-500"><FileText className="size-4" />Findings</div>
          {inspection.status === 'In Progress' && <form onSubmit={createFinding} className="mt-4 space-y-3 border-b border-slate-200 pb-5">
            <Field label="Finding title"><Input required value={findingForm.title} onChange={(event) => setFindingForm((current) => ({ ...current, title: event.target.value }))} /></Field>
            <Field label="Description"><Textarea required value={findingForm.description} onChange={(event) => setFindingForm((current) => ({ ...current, description: event.target.value }))} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category"><Select value={findingForm.category} onChange={(event) => setFindingForm((current) => ({ ...current, category: event.target.value as typeof findingForm.category }))}><option>Safety</option><option>Environment</option><option>Labour</option><option>Operations</option></Select></Field>
              <Field label="Severity"><Select value={findingForm.severity} onChange={(event) => setFindingForm((current) => ({ ...current, severity: event.target.value as typeof findingForm.severity }))}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></Select></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Location / Mine"><Select required value={findingForm.mineId} onChange={(event) => setFindingForm((current) => ({ ...current, mineId: event.target.value }))}><option value="">Select mine</option>{mines.map((mine) => <option key={mine.id} value={mine.id}>{mine.name}</option>)}</Select></Field>
              <Field label="Evidence"><Select value={findingEvidenceId ?? ''} onChange={(event) => setFindingEvidenceId(event.target.value || null)}><option value="">None</option>{evidence.map((record) => <option key={record.id} value={record.id}>{record.fileName ?? record.name}</option>)}</Select></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Source"><Select value={findingForm.source} onChange={(event) => setFindingForm((current) => ({ ...current, source: event.target.value as FindingSource }))}><option>Manual</option><option>AI</option></Select></Field>
              <Field label="Status"><Select value={findingForm.status ?? 'Open'} onChange={(event) => setFindingForm((current) => ({ ...current, status: event.target.value as 'Open' | 'Resolved' | 'Accepted Risk' }))}><option>Open</option><option>Resolved</option><option>Accepted Risk</option></Select></Field>
            </div>
            <Field label="Recommendation"><Textarea value={findingForm.recommendation} onChange={(event) => setFindingForm((current) => ({ ...current, recommendation: event.target.value }))} /></Field>
            {findingError && <ErrorState message={findingError} />}
            <Button type="submit" disabled={findingSaving}>{findingSaving ? 'Saving…' : 'Add finding'}</Button>
          </form>}
          <div className="mt-4 space-y-4">
            {findings.length === 0 ? (
              <p className="text-sm text-slate-500">No findings have been logged for this inspection yet.</p>
            ) : findings.map((finding) => (
              <div key={finding.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{finding.title}</p>
                    <p className="mt-1 text-xs text-slate-500">Finding ID: {finding.id} · Mine: {mines.find((mine) => mine.id === finding.mineId)?.name ?? mineName(finding.mineId)} · Source: {finding.source}</p>
                    <p className="mt-1 text-sm text-slate-600">{finding.description}</p>
                  </div>
                  <StatusBadge status={finding.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white px-2 py-1">{finding.category}</span>
                  <span className="rounded-full bg-white px-2 py-1">{finding.severity}</span>
                  {finding.recommendation && <span className="rounded-full bg-white px-2 py-1">Recommendation recorded</span>}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  {!isReadOnly && <Select value={finding.status} onChange={(event) => void updateFindingStatusFor(finding.id, event.target.value as InspectionFinding['status'])} className="mt-0 max-w-[200px]">
                    <option>Open</option>
                    <option>Resolved</option>
                    <option>Accepted Risk</option>
                  </Select>}
                  {!isReadOnly && <Button type="button" variant="secondary" onClick={() => setActionForm((current) => ({ ...current, findingId: finding.id }))}>Create corrective action</Button>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-slate-500"><CircleAlert className="size-4" />Notes</div>
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            <p>{inspection.notes ?? 'No field notes captured for this inspection.'}</p>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-semibold text-emerald-900">Follow-up actions</p>
              <p className="mt-2 text-sm text-emerald-800">Escalate high-severity items and track corrective actions as findings move from review to closure.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Inspection ID</p>
              <p className="mt-2 text-xs text-slate-500">{inspection.id}</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="size-4" />Status ready for management review</div>
          </div>
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-slate-500"><CircleAlert className="size-4" />Corrective Actions</div>
        {inspection.status !== 'Cancelled' && !isReadOnly && <form onSubmit={createAction} className="mt-4 grid gap-4 border-b border-slate-200 pb-5 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
          <Field label="Finding"><Select required value={actionForm.findingId} onChange={(event) => setActionForm((current) => ({ ...current, findingId: event.target.value }))}><option value="">Select finding</option>{findings.map((finding) => <option key={finding.id} value={finding.id}>{finding.title}</option>)}</Select></Field>
          <Field label="Action / corrective measure"><Input required value={actionForm.action} onChange={(event) => setActionForm((current) => ({ ...current, action: event.target.value }))} placeholder="Describe the corrective measure" /></Field>
          <Field label="Responsible person"><Input required value={actionForm.responsiblePerson} onChange={(event) => setActionForm((current) => ({ ...current, responsiblePerson: event.target.value }))} /></Field>
          <Field label="Due date"><Input required type="date" value={actionForm.dueDate} onChange={(event) => setActionForm((current) => ({ ...current, dueDate: event.target.value }))} /></Field>
          <Field label="Priority"><Select value={actionForm.priority} onChange={(event) => setActionForm((current) => ({ ...current, priority: event.target.value as CorrectiveActionPriority }))}><option>High</option><option>Medium</option><option>Low</option></Select></Field>
          <Field label="Status"><Select value={actionForm.status} onChange={(event) => setActionForm((current) => ({ ...current, status: event.target.value as CorrectiveActionStatus }))}><option>Open</option><option>Assigned</option><option>In Progress</option><option>Resolved</option><option>Verified</option><option>Closed</option></Select></Field>
          <div className="xl:col-span-2">{actionError && <ErrorState message={actionError} />}<Button type="submit" disabled={actionSaving || findings.length === 0}>{actionSaving ? 'Saving…' : 'Add corrective action'}</Button></div>
        </form>}
        {correctiveActions.length === 0 ? <p className="mt-4 text-sm text-slate-500">No corrective actions have been recorded for this inspection yet.</p> : <div className="mt-4 space-y-3">
          {correctiveActions.map((action) => <div key={action.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-6">
              <div><p className="text-xs text-slate-500">Finding</p><p className="mt-1 font-semibold text-slate-900">{findings.find((finding) => finding.id === action.findingId)?.title ?? action.findingId}</p></div>
              <div><p className="text-xs text-slate-500">Corrective action</p><p className="mt-1 text-slate-700">{action.action}</p></div>
              <div><p className="text-xs text-slate-500">Responsible person</p><p className="mt-1 text-slate-700">{action.responsiblePerson}</p></div>
              <div><p className="text-xs text-slate-500">Due date</p><p className="mt-1 text-slate-700">{action.dueDate}</p></div>
              <div><p className="text-xs text-slate-500">Priority</p><p className="mt-1 font-semibold text-slate-700">{action.priority}</p></div>
              <Field label="Status"><Select disabled={isReadOnly} value={action.status} onChange={(event) => void updateActionStatus(action.id, event.target.value as CorrectiveActionStatus)} className="mt-0"><option>Open</option><option>Assigned</option><option>In Progress</option><option>Resolved</option><option>Verified</option><option>Closed</option></Select></Field>
            </div>
            <p className="mt-3 text-xs text-slate-500">Inspection: {action.inspectionId} · Mine: {mines.find((mine) => mine.id === action.mineId)?.name ?? action.mineId}</p>
          </div>)}
        </div>}
      </Card>

      {error && <div className="mt-5"><ErrorState message={error} /></div>}
    </>
  )
}
