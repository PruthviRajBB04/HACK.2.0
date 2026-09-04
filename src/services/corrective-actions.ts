import { supabase } from '@/config/supabase'
import type { CorrectiveAction, CorrectiveActionPriority, CorrectiveActionStatus } from '@/types/domain'

export interface CorrectiveActionInput {
  inspectionId: string
  findingId: string
  mineId: string
  action: string
  responsiblePerson: string
  dueDate: string
  priority: CorrectiveActionPriority
  status: CorrectiveActionStatus
}

interface CorrectiveActionRow {
  id: string
  organization_id: string
  inspection_id: string
  finding_id: string
  mine_id: string
  action: string
  responsible_person: string
  due_date: string
  priority: string
  status: string
  created_at: string
  updated_at: string
}

async function assertInspectionNotClosed(inspectionId: string): Promise<void> {
  const { data, error } = await supabase.from('inspections').select('status').eq('id', inspectionId).single()
  if (error) throw new Error(error.message)
  if (String(data.status).toLowerCase() === 'closed') throw new Error('Closed inspections are read-only.')
}

function mapCorrectiveAction(row: CorrectiveActionRow): CorrectiveAction {
  return {
    id: row.id,
    organizationId: row.organization_id,
    inspectionId: row.inspection_id,
    findingId: row.finding_id,
    mineId: row.mine_id,
    action: row.action,
    responsiblePerson: row.responsible_person,
    dueDate: row.due_date,
    priority: row.priority as CorrectiveActionPriority,
    status: row.status as CorrectiveActionStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getInspectionCorrectiveActions(inspectionId: string): Promise<CorrectiveAction[]> {
  const { data, error } = await supabase
    .from('corrective_actions')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapCorrectiveAction(row as CorrectiveActionRow))
}

export async function createCorrectiveAction(input: CorrectiveActionInput, organizationId?: string | null): Promise<CorrectiveAction> {
  if (!organizationId) throw new Error('This session is not linked to an organization.')
  await assertInspectionNotClosed(input.inspectionId)

  const { data, error } = await supabase
    .from('corrective_actions')
    .insert({
      organization_id: organizationId,
      inspection_id: input.inspectionId,
      finding_id: input.findingId,
      mine_id: input.mineId,
      action: input.action.trim(),
      responsible_person: input.responsiblePerson.trim(),
      due_date: input.dueDate,
      priority: input.priority,
      status: input.status,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapCorrectiveAction(data as CorrectiveActionRow)
}

export async function updateCorrectiveActionStatus(id: string, status: CorrectiveActionStatus): Promise<CorrectiveAction> {
  const { data: action, error: actionError } = await supabase.from('corrective_actions').select('inspection_id').eq('id', id).single()
  if (actionError) throw new Error(actionError.message)
  await assertInspectionNotClosed(action.inspection_id)
  const { data, error } = await supabase
    .from('corrective_actions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapCorrectiveAction(data as CorrectiveActionRow)
}

export async function getAllCorrectiveActions(): Promise<CorrectiveAction[]> {
  const { data, error } = await supabase
    .from('corrective_actions')
    .select('*')
    .order('due_date', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapCorrectiveAction(row as CorrectiveActionRow))
}