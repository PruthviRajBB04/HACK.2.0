import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, CircleAlert, FileText, Upload } from 'lucide-react'
import { Button, Card, ErrorState, Field, Input, LoadingState, Select, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { demoInspectionFindings, demoInspections, demoMines } from '@/data/demo'
import { ensureInspectionChecklist, getInspectionById, getInspectionFindings, getInspectionChecklist, saveInspectionChecklist, updateFindingStatus, updateInspectionStatus } from '@/services/inspections'
import type { Inspection, InspectionChecklistItem, InspectionChecklistResponseStatus, InspectionFinding } from '@/types/domain'
import { useSession } from '@/context/SessionContext'
import { getEvidenceAccessUrl, getInspectionEvidence, uploadEvidenceDocument } from '@/services/documents'
import type { ComplianceEvidenceDocument } from '@/types/domain'

export const Route = createFileRoute('/app/inspections/$id')({ component: InspectionDetailPage })

const mineName = (id: string) => demoMines.find((mine) => mine.id === id)?.name ?? 'Unknown mine'

function InspectionDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { session } = useSession()
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [findings, setFindings] = useState<InspectionFinding[]>([])
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
    return [
      { label: 'Mine', value: mineName(inspection.mineId) },
      { label: 'Inspector', value: inspection.inspectorName },
      { label: 'Type', value: inspection.inspectionType },
      { label: 'Date', value: new Date(inspection.inspectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
    ]
  }, [inspection])

  async function updateStatus(nextStatus: Inspection['status']) {
    if (!inspection) return
    try {
      const updated = await updateInspectionStatus(inspection.id, nextStatus)
      setInspection(updated)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update status.')
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
    setChecklist((current) => current.map((item) => item.id === itemId ? { ...item, ...changes } : item))
  }

  async function saveChecklistProgress() {
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
    event.target.value = ''
  }

  function removeEvidenceFile(index: number) {
    setSelectedEvidenceFiles((current) => current.filter((_file, fileIndex) => fileIndex !== index))
  }

  async function addEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedEvidenceFiles.length === 0 || !inspection) {
      setEvidenceError('Choose at least one file before uploading evidence.')
      return
    }

    setEvidenceSaving(true)
    setEvidenceError(null)
    setEvidenceResults([])
    const successfulFiles: string[] = []
    const failedFiles: string[] = []
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
        }
      }

      const records = await getInspectionEvidence(inspection.id)
      const recordsWithUrls = await Promise.all(records.map(async (record) => ({ ...record, accessUrl: record.storagePath ? await getEvidenceAccessUrl(record.storagePath) : undefined })))
      setEvidence(recordsWithUrls)
      setEvidenceResults(successfulFiles.map((fileName) => `Uploaded: ${fileName}`))
      if (failedFiles.length > 0) {
        setEvidenceError(`Some files could not be uploaded: ${failedFiles.join('; ')}`)
      }
      if (successfulFiles.length > 0) {
        setSelectedEvidenceFiles([])
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
    try {
      const updated = await updateFindingStatus(findingId, nextStatus)
      setFindings((current) => current.map((entry) => entry.id === findingId ? updated : entry))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update finding status.')
    }
  }

  if (loading) return <LoadingState />
  if (!inspection) return <ErrorState message="Inspection not found." />

  const completedItems = checklist.filter((item) => item.responseStatus).length
  const applicableItems = checklist.filter((item) => item.responseStatus && item.responseStatus !== 'N/A')
  const compliantItems = checklist.filter((item) => item.responseStatus === 'Compliant').length
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
          <Link to="/app/inspections">
            <Button variant="secondary" className="gap-2"><ArrowLeft className="size-4" />Back to list</Button>
          </Link>
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
            <Select value={inspection.status} onChange={(event) => void updateStatus(event.target.value as Inspection['status'])} className="mt-0 min-w-[180px]">
              <option>Scheduled</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </Select>
            <Button onClick={() => navigate({ to: '/app/inspections/create' })}>New inspection</Button>
          </div>
        </div>
      </Card>

      <Card className="mb-5 p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-slate-500"><Upload className="size-4" />Evidence</div>
        {inspection.status === 'In Progress' && <form onSubmit={addEvidence} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
          <Field label="Files"><Input name="evidenceFiles" type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={selectEvidenceFiles} className="px-2 py-2" /></Field>
          <Field label="Description / note"><Input value={evidenceDescription} onChange={(event) => setEvidenceDescription(event.target.value)} placeholder="Describe this evidence" /></Field>
          <Field label="Checklist item"><Select value={evidenceChecklistId} onChange={(event) => setEvidenceChecklistId(event.target.value)}><option value="">None</option>{checklist.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></Field>
          <Field label="Finding"><Select value={evidenceFindingId} onChange={(event) => setEvidenceFindingId(event.target.value)}><option value="">None</option>{findings.map((finding) => <option key={finding.id} value={finding.id}>{finding.title}</option>)}</Select></Field>
          <Button type="submit" disabled={evidenceSaving}>{evidenceSaving ? 'Uploading…' : 'Upload evidence'}</Button>
        </form>}
        {selectedEvidenceFiles.length > 0 && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-900">{selectedEvidenceFiles.length} {selectedEvidenceFiles.length === 1 ? 'file' : 'files'} selected</p><div className="mt-2 space-y-2">{selectedEvidenceFiles.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 text-sm text-slate-600"><span className="truncate">{file.name}</span><button type="button" onClick={() => removeEvidenceFile(index)} className="shrink-0 font-semibold text-red-700 hover:text-red-900">Remove</button></div>)}</div></div>}
        {evidenceResults.length > 0 && <div className="mt-4 space-y-1 text-sm text-emerald-800">{evidenceResults.map((result) => <p key={result}>{result}</p>)}</div>}
        {evidenceError && <div className="mt-4"><ErrorState message={evidenceError} /></div>}
        {evidenceLoading ? <div className="mt-4"><LoadingState /></div> : evidence.length === 0 ? <p className="mt-4 text-sm text-slate-500">No evidence uploaded for this inspection yet.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {evidence.map((record) => <a key={record.id} href={record.accessUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 p-4 hover:border-emerald-500"><p className="font-semibold text-slate-900">{record.fileName ?? record.name}</p><p className="mt-1 text-xs text-slate-500">{record.documentType}{record.description ? ` · ${record.description}` : ''}</p><p className="mt-2 text-xs text-slate-500">Checklist: {checklist.find((item) => item.id === record.checklistItemId)?.title ?? 'None'} · Finding: {findings.find((finding) => finding.id === record.findingId)?.title ?? 'None'}</p><p className="mt-1 text-xs text-slate-400">{new Date(record.uploadDate).toLocaleString()}</p><span className="mt-3 inline-block text-sm font-semibold text-emerald-800">Open evidence</span></a>)}
        </div>}
      </Card>

      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Inspection checklist</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-emerald-950">Field verification</h2>
            <p className="mt-1 text-sm text-slate-500">Record each control as the inspection is performed.</p>
          </div>
          {inspection.status !== 'Scheduled' && <Button onClick={() => void saveChecklistProgress()} disabled={checklistSaving || checklistLoading}>{checklistSaving ? 'Saving…' : 'Save progress'}</Button>}
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
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Completed items</p><p className="mt-1 text-xl font-bold text-emerald-950">{completedItems} / {checklist.length}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Compliance</p><p className="mt-1 text-xl font-bold text-emerald-950">{compliancePercentage}%</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Open items</p><p className="mt-1 text-xl font-bold text-emerald-950">{checklist.length - completedItems}</p></div>
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
                            <Select value={item.responseStatus ?? ''} onChange={(event) => updateChecklistItem(item.id, { responseStatus: (event.target.value || null) as InspectionChecklistResponseStatus | null })} className="mt-1">
                              <option value="">Not assessed</option>
                              <option>Compliant</option>
                              <option>Non-compliant</option>
                              <option>Partially compliant</option>
                              <option>N/A</option>
                            </Select>
                          </Field>
                          <Field label="Comment">
                            <Textarea value={item.comment ?? ''} onChange={(event) => updateChecklistItem(item.id, { comment: event.target.value })} className="mt-1 min-h-20" placeholder="Add an observation or comment." />
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
          <div className="mt-4 space-y-4">
            {findings.length === 0 ? (
              <p className="text-sm text-slate-500">No findings have been logged for this inspection yet.</p>
            ) : findings.map((finding) => (
              <div key={finding.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{finding.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{finding.description}</p>
                  </div>
                  <StatusBadge status={finding.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white px-2 py-1">{finding.category}</span>
                  <span className="rounded-full bg-white px-2 py-1">{finding.severity}</span>
                  {finding.location && <span className="rounded-full bg-white px-2 py-1">{finding.location}</span>}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Select value={finding.status} onChange={(event) => void updateFindingStatusFor(finding.id, event.target.value as InspectionFinding['status'])} className="mt-0 max-w-[200px]">
                    <option>Open</option>
                    <option>Under Review</option>
                    <option>Resolved</option>
                    <option>Closed</option>
                  </Select>
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

      {error && <div className="mt-5"><ErrorState message={error} /></div>}
    </>
  )
}
