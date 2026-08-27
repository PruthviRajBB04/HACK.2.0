import { supabase } from '@/config/supabase'

export interface MineInput {
  name: string
  location: string
  state: string
  district: string
  operatorName: string
  mineType: string
  status: string
}

export interface MineRecord extends MineInput {
  id: string
  createdAt: string
  updatedAt: string
}

interface MineRow {
  id: string
  name: string
  location: string | null
  state: string | null
  district: string | null
  operator_name: string | null
  mine_type: string | null
  status: string
  created_at: string
  updated_at: string
}

function mapMine(row: MineRow): MineRecord {
  return {
    id: row.id,
    name: row.name,
    location: row.location ?? '',
    state: row.state ?? '',
    district: row.district ?? '',
    operatorName: row.operator_name ?? '',
    mineType: row.mine_type ?? '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createMine(input: MineInput): Promise<MineRecord> {
  const { data, error } = await supabase
    .from('mines')
    .insert({
      name: input.name.trim(),
      location: input.location.trim() || null,
      state: input.state.trim() || null,
      district: input.district.trim() || null,
      operator_name: input.operatorName.trim() || null,
      mine_type: input.mineType.trim() || null,
      status: input.status,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapMine(data as MineRow)
}
