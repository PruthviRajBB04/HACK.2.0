create table public.inspection_checklists (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  title text not null,
  category text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.inspection_checklist_responses (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  checklist_id uuid not null references public.inspection_checklists(id) on delete cascade,
  status text check (status is null or status in ('compliant', 'non_compliant', 'partially_compliant', 'na')),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inspection_id, checklist_id)
);

create index inspection_checklists_inspection_id_idx on public.inspection_checklists (inspection_id, sort_order);
create index inspection_checklist_responses_inspection_id_idx on public.inspection_checklist_responses (inspection_id);

alter table public.inspection_checklists enable row level security;
alter table public.inspection_checklist_responses enable row level security;

create trigger set_inspection_checklist_responses_updated_at
before update on public.inspection_checklist_responses
for each row execute function public.set_updated_at();

create policy "Members can read organization inspection checklists"
on public.inspection_checklists for select to authenticated
using (exists (
  select 1 from public.inspections
  where inspections.id = inspection_checklists.inspection_id
    and inspections.organization_id = public.current_user_organization_id()
));

create policy "Inspectors can create organization inspection checklists"
on public.inspection_checklists for insert to authenticated
with check (exists (
  select 1 from public.inspections
  where inspections.id = inspection_checklists.inspection_id
    and inspections.organization_id = public.current_user_organization_id()
    and public.current_user_role() in ('admin', 'mine_manager', 'inspector')
));

create policy "Inspectors can update organization inspection checklists"
on public.inspection_checklists for update to authenticated
using (exists (
  select 1 from public.inspections
  where inspections.id = inspection_checklists.inspection_id
    and inspections.organization_id = public.current_user_organization_id()
    and public.current_user_role() in ('admin', 'mine_manager', 'inspector')
))
with check (exists (
  select 1 from public.inspections
  where inspections.id = inspection_checklists.inspection_id
    and inspections.organization_id = public.current_user_organization_id()
    and public.current_user_role() in ('admin', 'mine_manager', 'inspector')
));

create policy "Members can read organization checklist responses"
on public.inspection_checklist_responses for select to authenticated
using (exists (
  select 1 from public.inspections
  where inspections.id = inspection_checklist_responses.inspection_id
    and inspections.organization_id = public.current_user_organization_id()
));

create policy "Inspectors can create organization checklist responses"
on public.inspection_checklist_responses for insert to authenticated
with check (exists (
  select 1 from public.inspections
  where inspections.id = inspection_checklist_responses.inspection_id
    and inspections.organization_id = public.current_user_organization_id()
    and public.current_user_role() in ('admin', 'mine_manager', 'inspector')
) and exists (
  select 1 from public.inspection_checklists
  where inspection_checklists.id = inspection_checklist_responses.checklist_id
    and inspection_checklists.inspection_id = inspection_checklist_responses.inspection_id
));

create policy "Inspectors can update organization checklist responses"
on public.inspection_checklist_responses for update to authenticated
using (exists (
  select 1 from public.inspections
  where inspections.id = inspection_checklist_responses.inspection_id
    and inspections.organization_id = public.current_user_organization_id()
    and public.current_user_role() in ('admin', 'mine_manager', 'inspector')
))
with check (exists (
  select 1 from public.inspections
  where inspections.id = inspection_checklist_responses.inspection_id
    and inspections.organization_id = public.current_user_organization_id()
    and public.current_user_role() in ('admin', 'mine_manager', 'inspector')
) and exists (
  select 1 from public.inspection_checklists
  where inspection_checklists.id = inspection_checklist_responses.checklist_id
    and inspection_checklists.inspection_id = inspection_checklist_responses.inspection_id
));