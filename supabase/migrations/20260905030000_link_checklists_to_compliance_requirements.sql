alter table public.inspection_checklists
  add column if not exists compliance_requirement_id uuid references public.compliance_requirements(id) on delete set null;

create index if not exists inspection_checklists_compliance_requirement_id_idx
  on public.inspection_checklists (compliance_requirement_id);

create unique index if not exists compliance_records_inspection_requirement_uidx
  on public.compliance_records (inspection_id, requirement_id);
