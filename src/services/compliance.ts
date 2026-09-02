import { supabase } from '@/config/supabase'
import type { ComplianceRecord } from '@/types/domain'

export type ComplianceRecordInput = {
  requirement: string
  category: 'Safety' | 'Environment' | 'Labour' | 'Operations'
  mineId: string
  dueDate: string
  status?: 'Compliant' | 'Due Soon' | 'Pending' | 'Overdue' | 'Non-Compliant'
  risk?: 'Low' | 'Medium' | 'High' | 'Critical'
  responsibleDepartment?: string
}

interface ComplianceRow {
  id: string
  requirement: string | null
  category: string | null
  mine_id: string | null
  due_date: string | null
  status: string | null
  risk_level: string | null
  responsible_department: string | null
  created_at: string | null
  updated_at: string | null
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

function normalizeRisk(value?: string | null): ComplianceRecord['risk'] {
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

function mapCompliance(row: ComplianceRow): ComplianceRecord {
  return {
    id: row.id,
    requirement: row.requirement ?? 'Compliance requirement',
    category: (row.category as ComplianceRecord['category']) ?? 'Safety',
    mineId: row.mine_id ?? '',
    dueDate: row.due_date ?? new Date().toISOString().slice(0, 10),
    status: normalizeStatus(row.status),
    risk: normalizeRisk(row.risk_level),
    responsibleDepartment: row.responsible_department ?? 'Not assigned',
  }
}

export async function getComplianceRecords(): Promise<ComplianceRecord[]> {
  const { data, error } = await supabase
    .from('compliance')
    .select('*')
    .order('due_date', { ascending: true })

  if (error) {
    const demoRecords = await import('@/data/demo').then((module) => module.demoCompliance)
    return demoRecords
  }

  return (data ?? []).map((row) => mapCompliance(row as ComplianceRow))
}

export async function getComplianceRecordById(id: string): Promise<ComplianceRecord | null> {
  const { data, error } = await supabase
    .from('compliance')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    const demoRecords = await import('@/data/demo').then((module) => module.demoCompliance)
    return demoRecords.find((item) => item.id === id) ?? null
  }

  return data ? mapCompliance(data as ComplianceRow) : null
}

export async function createComplianceRecord(input: ComplianceRecordInput, organizationId?: string | null): Promise<ComplianceRecord> {
  if (!organizationId) {
    throw new Error('This session is not linked to an organization. Complete organization setup or sign in before creating a compliance record.')
  }

  const { data, error } = await supabase
    .from('compliance')
    .insert({
      requirement: input.requirement.trim(),
      category: input.category,
      mine_id: input.mineId,
      due_date: input.dueDate,
      status: (input.status ?? 'Pending').toLowerCase().replace(/\s+/g, '_'),
      risk_level: (input.risk ?? 'Medium').toLowerCase(),
      responsible_department: input.responsibleDepartment?.trim() || 'Not assigned',
      organization_id: organizationId,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapCompliance(data as ComplianceRow)
}

export async function updateComplianceRecordStatus(id: string, status: ComplianceRecord['status']): Promise<ComplianceRecord> {
  const { data, error } = await supabase
    .from('compliance')
    .update({
      status: status.toLowerCase().replace(/\s+/g, '_'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapCompliance(data as ComplianceRow)
}

export async function updateComplianceRecordRisk(id: string, risk: ComplianceRecord['risk']): Promise<ComplianceRecord> {
  const { data, error } = await supabase
    .from('compliance')
    .update({
      risk_level: risk.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapCompliance(data as ComplianceRow)
}

export async function deleteComplianceRecord(id: string): Promise<void> {
  const { error } = await supabase.from('compliance').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
