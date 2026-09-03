import { supabase } from '@/config/supabase'
import type { ComplianceEvidenceDocument } from '@/types/domain'

export type EvidenceDocumentInput = {
  name: string
  documentType: string
  description?: string
  mineId: string
  complianceRequirementId?: string
  complianceRequirementName?: string
  inspectionId?: string
  checklistItemId?: string
  inspectionTitle?: string
  findingId?: string
  findingTitle?: string
  expiryDate?: string
  status?: 'Draft' | 'Uploaded' | 'Approved' | 'Expired' | 'Rejected'
  fileName?: string
  mimeType?: string
  fileSizeBytes?: number
  storageMode?: 'demo' | 'supabase'
  storagePath?: string
}

interface EvidenceRow {
  id: string
  title: string | null
  document_type: string | null
  mine_id: string | null
  inspection_id: string | null
  checklist_item_id: string | null
  finding_id: string | null
  uploaded_at: string | null
  upload_date: string | null
  expiry_date: string | null
  status: string | null
  file_path: string | null
  file_name: string | null
  mime_type: string | null
  file_size_bytes: number | null
  storage_mode: string | null
  storage_path: string | null
  created_at: string | null
  updated_at: string | null
}

function normalizeDocumentStatus(value?: string | null): ComplianceEvidenceDocument['status'] {
  switch ((value ?? '').toLowerCase()) {
    case 'approved':
      return 'Approved'
    case 'expired':
      return 'Expired'
    case 'rejected':
      return 'Rejected'
    case 'draft':
      return 'Draft'
    case 'uploaded':
    default:
      return 'Uploaded'
  }
}

function mapDocument(row: EvidenceRow): ComplianceEvidenceDocument {
  return {
    id: row.id,
    name: row.title ?? row.file_name ?? 'Evidence document',
    documentType: row.document_type ?? 'Statutory Compliance',
    mineId: row.mine_id ?? '',
    inspectionId: row.inspection_id ?? undefined,
    checklistItemId: row.checklist_item_id ?? undefined,
    findingId: row.finding_id ?? undefined,
    uploadDate: row.uploaded_at ?? row.upload_date ?? row.created_at ?? new Date().toISOString(),
    expiryDate: row.expiry_date ?? undefined,
    status: normalizeDocumentStatus(row.status),
    fileName: row.file_name ?? undefined,
    mimeType: row.mime_type ?? undefined,
    fileSizeBytes: row.file_size_bytes ?? undefined,
    storageMode: (row.storage_mode as 'demo' | 'supabase') ?? 'demo',
    storagePath: row.storage_path ?? row.file_path ?? undefined,
    createdAt: row.created_at ?? row.uploaded_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.uploaded_at ?? row.created_at ?? new Date().toISOString(),
  }
}

export async function getEvidenceDocuments(): Promise<ComplianceEvidenceDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('uploaded_at', { ascending: false })

  if (error) {
    const demoDocuments = await import('@/data/demo').then((module) => module.demoEvidenceDocuments)
    return demoDocuments
  }

  return (data ?? []).map((row) => mapDocument(row as EvidenceRow))
}

export async function getInspectionEvidence(inspectionId: string): Promise<ComplianceEvidenceDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapDocument(row as EvidenceRow))
}

export async function getEvidenceAccessUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('inspection-evidence').createSignedUrl(storagePath, 3600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

export async function linkEvidenceToFinding(evidenceId: string, findingId: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ finding_id: findingId, updated_at: new Date().toISOString() })
    .eq('id', evidenceId)

  if (error) throw new Error(error.message)
}

export async function getEvidenceDocumentById(id: string): Promise<ComplianceEvidenceDocument | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    const demoDocuments = await import('@/data/demo').then((module) => module.demoEvidenceDocuments)
    return demoDocuments.find((item) => item.id === id) ?? null
  }

  return data ? mapDocument(data as EvidenceRow) : null
}

export async function createEvidenceDocument(input: EvidenceDocumentInput, organizationId?: string | null): Promise<ComplianceEvidenceDocument> {
  if (!organizationId) {
    throw new Error('This session is not linked to an organization. Complete organization setup or sign in before uploading evidence.')
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in before saving evidence metadata.')

  const payload = {
    title: input.name.trim(),
    document_type: input.documentType,
    mine_id: input.mineId,
    inspection_id: input.inspectionId || null,
    checklist_item_id: input.checklistItemId || null,
    finding_id: input.findingId || null,
    uploaded_by: userData.user.id,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    expiry_date: input.expiryDate || null,
    status: (input.status ?? 'Uploaded').toLowerCase(),
    file_path: input.storagePath || `/demo/evidence/${(input.fileName || input.name).trim().toLowerCase().replace(/\s+/g, '-')}`,
    file_name: input.fileName?.trim() || input.name.trim(),
    mime_type: input.mimeType || null,
    file_size_bytes: input.fileSizeBytes ?? null,
    storage_mode: input.storageMode ?? 'demo',
    storage_path: input.storagePath || `/demo/evidence/${(input.fileName || input.name).trim().toLowerCase().replace(/\s+/g, '-')}`,
    organization_id: organizationId,
  }

  const { data, error } = await supabase
    .from('documents')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapDocument(data as EvidenceRow)
}

export async function updateEvidenceDocumentStatus(id: string, status: ComplianceEvidenceDocument['status']): Promise<ComplianceEvidenceDocument> {
  const { data, error } = await supabase
    .from('documents')
    .update({
      status: status.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapDocument(data as EvidenceRow)
}

export async function deleteEvidenceDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function uploadEvidenceDocument(file: File | null, input: EvidenceDocumentInput, organizationId?: string | null): Promise<ComplianceEvidenceDocument> {
  if (!file) {
    return createEvidenceDocument(input, organizationId)
  }

  if (!organizationId) {
    throw new Error('This session is not linked to an organization. Complete organization setup before uploading evidence.')
  }
  if (!input.inspectionId) throw new Error('Evidence must be linked to an inspection.')

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in before uploading evidence.')

  const { data: inspection, error: inspectionError } = await supabase
    .from('inspections')
    .select('id, mine_id')
    .eq('id', input.inspectionId)
    .single()
  if (inspectionError || !inspection) throw new Error('Inspection not found or unavailable.')

  if (input.checklistItemId) {
    const { data: checklistItem, error: checklistError } = await supabase
      .from('inspection_checklists')
      .select('id')
      .eq('id', input.checklistItemId)
      .eq('inspection_id', input.inspectionId)
      .maybeSingle()
    if (checklistError || !checklistItem) throw new Error('Selected checklist item is not linked to this inspection.')
  }

  if (input.findingId) {
    const { data: finding, error: findingError } = await supabase
      .from('inspection_findings')
      .select('id')
      .eq('id', input.findingId)
      .eq('inspection_id', input.inspectionId)
      .maybeSingle()
    if (findingError || !finding) throw new Error('Selected finding is not linked to this inspection.')
  }

  const safeName = (file.name || input.name || 'uploaded-file').replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${organizationId}/${input.inspectionId}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabase.storage.from('inspection-evidence').upload(storagePath, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (uploadError) throw new Error(uploadError.message)

  try {
    return await createEvidenceDocument({
      ...input,
      name: input.name || file.name,
      mineId: inspection.mine_id,
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
      storageMode: 'supabase',
      storagePath,
      status: 'Uploaded',
    }, organizationId)
  } catch (caughtError) {
    await supabase.storage.from('inspection-evidence').remove([storagePath])
    throw caughtError
  }
}
