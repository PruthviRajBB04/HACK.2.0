alter table public.compliance_records
  add column if not exists inspection_id uuid references public.inspections(id) on delete set null;

create index if not exists compliance_records_inspection_id_idx
  on public.compliance_records (inspection_id);
