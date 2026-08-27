import { supabase } from '@/config/supabase'
import type { Organization } from '@/types/domain'

export interface OrganizationInput {
  name: string
  organizationType: string
  registrationNumber?: string
  country: string
  state: string
  district: string
  address: string
  contactPersonName: string
  contactEmail: string
  contactPhone: string
  plannedMineCount: number
  description?: string
}

interface OrganizationRow {
  id: string
  name: string
  organization_type: string
  registration_number: string | null
  country: string
  state: string
  district: string
  address: string
  contact_person_name: string
  contact_email: string
  contact_phone: string
  planned_mine_count: number
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    organizationType: row.organization_type,
    registrationNumber: row.registration_number,
    country: row.country,
    state: row.state,
    district: row.district,
    address: row.address,
    contactPersonName: row.contact_person_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    plannedMineCount: row.planned_mine_count,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getCurrentOrganization(): Promise<Organization | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return null

  const { data, error } = await supabase
    .from('organization_members')
    .select('organizations:organization_id (*)')
    .eq('user_id', authData.user.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const nested = data?.organizations as OrganizationRow | OrganizationRow[] | null | undefined
  const organization = Array.isArray(nested) ? nested[0] : nested
  return organization ? mapOrganization(organization) : null
}

export async function createOrganization(input: OrganizationInput): Promise<Organization> {
  const { data, error } = await supabase.rpc('create_organization', {
    p_name: input.name.trim(),
    p_organization_type: input.organizationType,
    p_registration_number: input.registrationNumber?.trim() || null,
    p_country: input.country,
    p_state: input.state,
    p_district: input.district.trim(),
    p_address: input.address.trim(),
    p_contact_person_name: input.contactPersonName.trim(),
    p_contact_email: input.contactEmail.trim(),
    p_contact_phone: input.contactPhone.trim(),
    p_planned_mine_count: input.plannedMineCount,
    p_description: input.description?.trim() || null,
  })

  if (error) throw new Error(error.message)
  return mapOrganization(data as OrganizationRow)
}

export async function updateOrganization(id: string, input: OrganizationInput): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .update({
      name: input.name.trim(),
      organization_type: input.organizationType,
      registration_number: input.registrationNumber?.trim() || null,
      country: input.country,
      state: input.state,
      district: input.district.trim(),
      address: input.address.trim(),
      contact_person_name: input.contactPersonName.trim(),
      contact_email: input.contactEmail.trim(),
      contact_phone: input.contactPhone.trim(),
      planned_mine_count: input.plannedMineCount,
      description: input.description?.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapOrganization(data as OrganizationRow)
}
