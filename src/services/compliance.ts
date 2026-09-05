import { supabase } from '@/config/supabase'
import type { ComplianceRecord, Inspection, InspectionChecklistItem } from '@/types/domain'

export type ComplianceRecordInput = {
  requirementId: string
  mineId: string
  inspectionId?: string
  dueDate: string
  status?: 'Compliant' | 'Due Soon' | 'Pending' | 'Overdue' | 'Non-Compliant'
  completedDate?: string
  remarks?: string
}

export interface ComplianceRequirement {
  id: string
  organizationId?: string | null
  title: string
  description: string | null
  regulation: string | null
  category: string | null
  frequency: string | null
  dueDays: number | null
}

interface ComplianceRow {
  id: string
  mine_id: string | null
  requirement_id: string
  inspection_id: string | null
  due_date: string | null
  status: string | null
  completed_date: string | null
  remarks: string | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

interface ComplianceRequirementRow {
  id: string
  title: string
  description: string | null
  regulation: string | null
  category: string | null
  frequency: string | null
  due_days: number | null
}

function normalizeStatus(value?: string | null): ComplianceRecord['status'] {
  switch ((value ?? '').toLowerCase()) {
    case 'compliant':
      return 'Compliant'
    case 'due soon':
    case 'due_soon':
      return 'Due Soon'
    case 'pending':
      return 'Pending'
    case 'overdue':
      return 'Overdue'
    case 'non-compliant':
    case 'non_compliant':
    default:
      return 'Non-Compliant'
  }
}

function mapCompliance(row: ComplianceRow, requirement?: ComplianceRequirementRow): ComplianceRecord {
  return {
    id: row.id,
    requirement: requirement?.title ?? 'Compliance requirement',
    description: requirement?.description ?? undefined,
    regulation: requirement?.regulation ?? undefined,
    frequency: requirement?.frequency ?? undefined,
    dueDays: requirement?.due_days ?? undefined,
    category: (requirement?.category as ComplianceRecord['category']) ?? 'Safety',
    mineId: row.mine_id ?? '',
    inspectionId: row.inspection_id ?? undefined,
    dueDate: row.due_date ?? new Date().toISOString().slice(0, 10),
    completedDate: row.completed_date ?? undefined,
    remarks: row.remarks ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    status: normalizeStatus(row.status),
    risk: null,
    responsibleDepartment: 'Not assigned',
    requirementId: row.requirement_id,
  }
}

function mapRequirement(row: ComplianceRequirementRow): ComplianceRequirement {
  return { id: row.id, title: row.title, description: row.description, regulation: row.regulation, category: row.category, frequency: row.frequency, dueDays: row.due_days }
}

export interface ComplianceRequirementInput {
  title: string
  description?: string
  regulation?: string
  category: 'Safety' | 'Environment' | 'Labour' | 'Operations'
  frequency?: string
  dueDays?: number
}

async function mapComplianceRows(rows: ComplianceRow[]): Promise<ComplianceRecord[]> {
  const requirementIds = [...new Set(rows.map((row) => row.requirement_id))]
  if (requirementIds.length === 0) return []

  const { data, error } = await supabase
    .from('compliance_requirements')
    .select('id, title, description, regulation, category, frequency, due_days')
    .in('id', requirementIds)

  if (error) throw new Error(error.message)
  const requirements = new Map((data ?? []).map((row) => [row.id, row as ComplianceRequirementRow]))
  return rows.map((row) => mapCompliance(row, requirements.get(row.requirement_id)))
}

export async function getComplianceRecords(): Promise<ComplianceRecord[]> {
  const { data, error } = await supabase
    .from('compliance_records')
    .select('*')
    .order('due_date', { ascending: true })

  if (error) throw new Error(error.message)

  return mapComplianceRows((data ?? []) as ComplianceRow[])
}

export async function getComplianceRequirements(): Promise<ComplianceRequirement[]> {
  const { data, error } = await supabase
    .from('compliance_requirements')
    .select('id, title, description, regulation, category, frequency, due_days')
    .order('title', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapRequirement(row as ComplianceRequirementRow))
}

export async function createComplianceRequirement(input: ComplianceRequirementInput, organizationId?: string | null): Promise<ComplianceRequirement> {
  if (!organizationId) throw new Error('This session is not linked to an organization.')
  const { data, error } = await supabase
    .from('compliance_requirements')
    .insert({
      organization_id: organizationId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      regulation: input.regulation?.trim() || null,
      category: input.category,
      frequency: input.frequency?.trim() || null,
      due_days: input.dueDays ?? null,
    })
    .select('id, title, description, regulation, category, frequency, due_days')
    .single()
  if (error) throw new Error(error.message)
  return mapRequirement(data as ComplianceRequirementRow)
}

export async function getComplianceRecordById(id: string): Promise<ComplianceRecord | null> {
  const { data, error } = await supabase
    .from('compliance_records')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (!data) return null
  const records = await mapComplianceRows([data as ComplianceRow])
  return records[0] ?? null
}

export async function createComplianceRecord(input: ComplianceRecordInput, organizationId?: string | null): Promise<ComplianceRecord> {
  if (!organizationId) {
    throw new Error('This session is not linked to an organization. Complete organization setup or sign in before creating a compliance record.')
  }

  const { data, error } = await supabase
    .from('compliance_records')
    .insert({
      mine_id: input.mineId,
      requirement_id: input.requirementId,
      inspection_id: input.inspectionId || null,
      due_date: input.dueDate,
      status: (input.status ?? 'Pending').toLowerCase().replace(/\s+/g, '_'),
      completed_date: input.completedDate || null,
      remarks: input.remarks?.trim() || null,
      organization_id: organizationId,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  const records = await mapComplianceRows([data as ComplianceRow])
  return records[0]
}

export async function syncInspectionComplianceRecords(
  inspection: Inspection,
  checklist: InspectionChecklistItem[],
  organizationId?: string | null,
): Promise<ComplianceRecord[]> {
  if (!organizationId) throw new Error('This session is not linked to an organization.')
  const linkedItems = checklist.filter((item) => item.complianceRequirementId && item.responseStatus && item.responseStatus !== 'N/A')
  if (linkedItems.length === 0) return []

  const requirementIds = [...new Set(linkedItems.map((item) => item.complianceRequirementId as string))]
  const { data: requirementRows, error: requirementError } = await supabase
    .from('compliance_requirements')
    .select('id, due_days')
    .in('id', requirementIds)
  if (requirementError) throw new Error(requirementError.message)
  const dueDays = new Map((requirementRows ?? []).map((row) => [row.id, row.due_days as number | null]))
  const today = new Date().toISOString().slice(0, 10)
  const rows = linkedItems.map((item) => {
    const requirementId = item.complianceRequirementId as string
    const dueDate = new Date(`${inspection.inspectionDate}T00:00:00Z`)
    dueDate.setUTCDate(dueDate.getUTCDate() + (dueDays.get(requirementId) ?? 0))
    const status = item.responseStatus === 'Compliant' ? 'compliant' : item.responseStatus === 'Non-compliant' ? 'non_compliant' : 'pending'
    return {
      organization_id: organizationId,
      mine_id: inspection.mineId,
      inspection_id: inspection.id,
      requirement_id: requirementId,
      due_date: dueDate.toISOString().slice(0, 10),
      status,
      completed_date: status === 'compliant' ? today : null,
      remarks: item.comment?.trim() || `Inspection checklist result: ${item.responseStatus}.`,
    }
  })
  const { data, error } = await supabase
    .from('compliance_records')
    .upsert(rows, { onConflict: 'inspection_id,requirement_id' })
    .select('*')
  if (error) throw new Error(error.message)
  return mapComplianceRows((data ?? []) as ComplianceRow[])
}

export async function updateComplianceRecord(id: string, input: ComplianceRecordInput): Promise<ComplianceRecord> {
  const { data, error } = await supabase
    .from('compliance_records')
    .update({
      requirement_id: input.requirementId,
      inspection_id: input.inspectionId || null,
      mine_id: input.mineId,
      due_date: input.dueDate,
      status: (input.status ?? 'Pending').toLowerCase().replace(/\s+/g, '_'),
      completed_date: input.completedDate || null,
      remarks: input.remarks?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  const records = await mapComplianceRows([data as ComplianceRow])
  return records[0]
}

export async function updateComplianceRecordStatus(id: string, status: ComplianceRecord['status']): Promise<ComplianceRecord> {
  const { data, error } = await supabase
    .from('compliance_records')
    .update({
      status: status.toLowerCase().replace(/\s+/g, '_'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  const records = await mapComplianceRows([data as ComplianceRow])
  return records[0]
}

export async function deleteComplianceRecord(id: string): Promise<void> {
  const { error } = await supabase.from('compliance_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
