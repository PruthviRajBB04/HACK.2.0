import { supabase } from '@/config/supabase'
import { getMines } from '@/services/mines'
import type { FindingSource, Inspection, InspectionChecklistItem, InspectionChecklistResponseStatus, InspectionFinding } from '@/types/domain'

export interface InspectionInput {
  mineId: string
  inspectorName: string
  inspectionType: string
  inspectionDate: string
  description?: string
  notes?: string
  status?: Inspection['status']
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical'
}

export interface InspectionFindingInput {
  inspectionId: string
  title: string
  description: string
  category: 'Safety' | 'Environment' | 'Labour' | 'Operations'
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  mineId: string
  source: FindingSource
  status?: 'Open' | 'Resolved' | 'Accepted Risk'
  recommendation?: string
}

interface InspectionRow {
  id: string
  mine_id: string
  inspector_id: string | null
  inspector_name: string | null
  inspection_type: string | null
  inspection_date: string | null
  description: string | null
  notes: string | null
  status: string | null
  risk_level: string | null
  reviewer: string | null
  review_comments: string | null
  reviewed_at: string | null
  created_at: string | null
  updated_at: string | null
}

interface InspectionFindingRow {
  id: string
  inspection_id: string
  mine_id: string
  title: string
  description: string
  category: string
  severity: string
  status: string
  source: string | null
  recommendation: string | null
  created_at: string | null
  updated_at: string | null
}

interface InspectionChecklistRow {
  id: string
  inspection_id: string
  compliance_requirement_id: string | null
  title: string
  category: string
  sort_order: number
  created_at: string
}

interface InspectionChecklistResponseRow {
  checklist_id: string
  status: string | null
  comment: string | null
}

const checklistTemplate = [
  { title: 'Required safety controls are in place and operational.', category: 'Safety' },
  { title: 'Personal protective equipment is available and used correctly.', category: 'Safety' },
  { title: 'Emergency routes, exits and response equipment are accessible.', category: 'Emergency preparedness' },
  { title: 'Environmental monitoring and control measures are maintained.', category: 'Environment' },
  { title: 'Worker records, welfare provisions and statutory notices are current.', category: 'Labour' },
  { title: 'Operational equipment and work areas meet required standards.', category: 'Operations' },
]

function normalizeStatus(value?: string | null): Inspection['status'] {
  switch ((value ?? '').toLowerCase()) {
    case 'in progress':
    case 'in_progress':
      return 'In Progress'
    case 'completed':
    case 'submitted':
      return 'Submitted'
    case 'under review':
    case 'under_review':
      return 'Under Review'
    case 'approved':
      return 'Approved'
    case 'closed':
      return 'Closed'
    case 'cancelled':
      return 'Cancelled'
    case 'scheduled':
    default:
      return 'Scheduled'
  }
}

function normalizeRisk(value?: string | null): Inspection['riskLevel'] {
  if (!value) return null

  switch ((value ?? '').toLowerCase()) {
    case 'low':
      return 'Low'
    case 'high':
      return 'High'
    case 'critical':
      return 'Critical'
    case 'medium':
    default:
      return 'Medium'
  }
}

function normalizeFindingStatus(value?: string | null): InspectionFinding['status'] {
  switch ((value ?? '').toLowerCase()) {
    case 'resolved':
      return 'Resolved'
    case 'accepted risk':
    case 'accepted_risk':
      return 'Accepted Risk'
    case 'open':
    default:
      return 'Open'
  }
}

function normalizeChecklistStatus(value?: string | null): InspectionChecklistResponseStatus | null {
  switch ((value ?? '').toLowerCase()) {
    case 'compliant': return 'Compliant'
    case 'non_compliant':
    case 'non-compliant': return 'Non-compliant'
    case 'partially_compliant':
    case 'partially-compliant': return 'Partially compliant'
    case 'na': return 'N/A'
    default: return null
  }
}

async function assertInspectionNotClosed(inspectionId: string): Promise<void> {
  const { data, error } = await supabase.from('inspections').select('status').eq('id', inspectionId).single()
  if (error) throw new Error(error.message)
  if (String(data.status).toLowerCase() === 'closed') throw new Error('Closed inspections are read-only.')
}

function mapInspection(row: InspectionRow): Inspection {
  return {
    id: row.id,
    mineId: row.mine_id,
    inspectorName: row.inspector_name ?? 'Unassigned Inspector',
    inspectionType: row.inspection_type ?? 'Routine Inspection',
    inspectionDate: row.inspection_date ?? new Date().toISOString().slice(0, 10),
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    status: normalizeStatus(row.status),
    riskLevel: normalizeRisk(row.risk_level),
    reviewer: row.reviewer ?? undefined,
    reviewComments: row.review_comments ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  }
}

function mapInspectionFinding(row: InspectionFindingRow): InspectionFinding {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    mineId: row.mine_id,
    title: row.title,
    description: row.description,
    category: (row.category as InspectionFinding['category']) ?? 'Safety',
    severity: normalizeRisk(row.severity) ?? 'Medium',
    source: row.source === 'AI' ? 'AI' : 'Manual',
    status: normalizeFindingStatus(row.status),
    recommendation: row.recommendation ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  }
}

function mapChecklistItem(row: InspectionChecklistRow, response?: InspectionChecklistResponseRow): InspectionChecklistItem {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    complianceRequirementId: row.compliance_requirement_id ?? undefined,
    title: row.title,
    category: row.category,
    sortOrder: row.sort_order,
    responseStatus: normalizeChecklistStatus(response?.status),
    comment: response?.comment ?? undefined,
    createdAt: row.created_at,
  }
}

export async function getInspections(): Promise<Inspection[]> {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .order('inspection_date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapInspection(row as InspectionRow))
}

export async function getInspectionById(id: string): Promise<Inspection | null> {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapInspection(data as InspectionRow) : null
}

export async function createInspection(input: InspectionInput, organizationId?: string | null): Promise<Inspection> {
  if (!organizationId) {
    throw new Error('This session is not linked to an organization. Complete organization setup or sign in before creating an inspection.')
  }

  const { data, error } = await supabase
    .from('inspections')
    .insert({
      mine_id: input.mineId,
      inspector_name: input.inspectorName.trim(),
      inspection_type: input.inspectionType,
      inspection_date: input.inspectionDate,
      description: input.description?.trim() || null,
      status: (input.status ?? 'Scheduled').toLowerCase().replace(/\s+/g, '_'),
      organization_id: organizationId,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapInspection(data as InspectionRow)
}

export async function updateInspectionStatus(id: string, status: Inspection['status'], reviewComments?: string, reviewer?: string): Promise<Inspection> {
  await assertInspectionNotClosed(id)
  const { data, error } = await supabase
    .from('inspections')
    .update({
      status: status.toLowerCase().replace(/\s+/g, '_'),
      review_comments: reviewComments?.trim() || null,
      reviewer: reviewer?.trim() || null,
      reviewed_at: status === 'Under Review' || status === 'Approved' || status === 'Closed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapInspection(data as InspectionRow)
}

export async function getInspectionChecklist(inspectionId: string): Promise<InspectionChecklistItem[]> {
  const { data: checklistRows, error: checklistError } = await supabase
    .from('inspection_checklists')
    .select('id, inspection_id, compliance_requirement_id, title, category, sort_order, created_at')
    .eq('inspection_id', inspectionId)
    .order('sort_order', { ascending: true })

  if (checklistError) throw new Error(checklistError.message)

  const { data: responseRows, error: responseError } = await supabase
    .from('inspection_checklist_responses')
    .select('checklist_id, status, comment')
    .eq('inspection_id', inspectionId)

  if (responseError) throw new Error(responseError.message)

  const responses = new Map((responseRows ?? []).map((row) => [row.checklist_id, row as InspectionChecklistResponseRow]))
  return (checklistRows ?? []).map((row) => mapChecklistItem(row as InspectionChecklistRow, responses.get((row as InspectionChecklistRow).id)))
}

export async function ensureInspectionChecklist(inspectionId: string, organizationId?: string | null): Promise<InspectionChecklistItem[]> {
  if (!organizationId) {
    throw new Error('This session is not linked to an organization. Sign in with an organization before starting an inspection.')
  }
  await assertInspectionNotClosed(inspectionId)

  const existing = await getInspectionChecklist(inspectionId)
  if (existing.length > 0) return existing

  const { error } = await supabase
    .from('inspection_checklists')
    .insert(checklistTemplate.map((item, index) => ({
      inspection_id: inspectionId,
      title: item.title,
      category: item.category,
      sort_order: index,
    })))

  if (error) throw new Error(error.message)
  return getInspectionChecklist(inspectionId)
}

export async function saveInspectionChecklist(
  inspectionId: string,
  items: InspectionChecklistItem[],
  organizationId?: string | null,
): Promise<InspectionChecklistItem[]> {
  if (!organizationId) {
    throw new Error('This session is not linked to an organization. Sign in with an organization before saving checklist progress.')
  }
  await assertInspectionNotClosed(inspectionId)

  const responses = items.map((item) => ({
      inspection_id: inspectionId,
      checklist_id: item.id,
      status: item.responseStatus ? item.responseStatus.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_').replace('/', '') : null,
      comment: item.comment?.trim() || null,
    }))

    await Promise.all(items.map(async (item) => {
      const { error } = await supabase
        .from('inspection_checklists')
        .update({ compliance_requirement_id: item.complianceRequirementId ?? null })
        .eq('id', item.id)
        .eq('inspection_id', inspectionId)
      if (error) throw new Error(error.message)
    }))

  if (responses.length > 0) {
    const { error } = await supabase
      .from('inspection_checklist_responses')
      .upsert(responses, { onConflict: 'inspection_id,checklist_id' })

    if (error) throw new Error(error.message)
  }

  return getInspectionChecklist(inspectionId)
}

export async function getInspectionFindings(inspectionId: string): Promise<InspectionFinding[]> {
  const { data, error } = await supabase
    .from('inspection_findings')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapInspectionFinding(row as InspectionFindingRow))
}

export async function getAllInspectionFindings(): Promise<InspectionFinding[]> {
  const { data, error } = await supabase
    .from('inspection_findings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapInspectionFinding(row as InspectionFindingRow))
}

export async function createInspectionFinding(input: InspectionFindingInput, organizationId?: string | null): Promise<InspectionFinding> {
  if (!organizationId) {
    throw new Error('This session is not linked to an organization. Complete organization setup or sign in before creating a finding.')
  }

  const inspection = await getInspectionById(input.inspectionId)
  if (!inspection) {
    throw new Error('Inspection not found.')
  }
  if (inspection.status === 'Closed') throw new Error('Closed inspections are read-only.')

  const organizationMines = await getMines()
  if (!organizationMines.some((mine) => mine.id === input.mineId)) {
    throw new Error('Selected mine is not available in the current organization.')
  }

  const { data, error } = await supabase
    .from('inspection_findings')
    .insert({
      inspection_id: input.inspectionId,
      mine_id: input.mineId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      severity: input.severity ?? 'Medium',
      source: input.source,
      status: input.status === 'Resolved' ? 'Resolved' : input.status === 'Accepted Risk' ? 'Accepted Risk' : 'Open',
      recommendation: input.recommendation?.trim() || null,
      organization_id: organizationId,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapInspectionFinding(data as InspectionFindingRow)
}

export async function updateFindingStatus(id: string, status: InspectionFinding['status']): Promise<InspectionFinding> {
  const { data: finding, error: findingError } = await supabase.from('inspection_findings').select('inspection_id').eq('id', id).single()
  if (findingError) throw new Error(findingError.message)
  await assertInspectionNotClosed(finding.inspection_id)
  const { data, error } = await supabase
    .from('inspection_findings')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapInspectionFinding(data as InspectionFindingRow)
}
