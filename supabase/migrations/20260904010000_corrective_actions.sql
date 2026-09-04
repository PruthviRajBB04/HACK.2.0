create table public.corrective_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  finding_id uuid not null references public.inspection_findings(id) on delete cascade,
  mine_id uuid not null references public.mines(id) on delete cascade,
  action text not null,
  responsible_person text not null,
  due_date date not null,
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  status text not null default 'Open' check (status in ('Open', 'Assigned', 'In Progress', 'Resolved', 'Verified', 'Closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index corrective_actions_organization_id_idx on public.corrective_actions (organization_id);
create index corrective_actions_inspection_id_idx on public.corrective_actions (inspection_id);
create index corrective_actions_finding_id_idx on public.corrective_actions (finding_id);

alter table public.corrective_actions enable row level security;

create trigger set_corrective_actions_updated_at
before update on public.corrective_actions
for each row execute function public.set_updated_at();

create policy "Members can read organization corrective actions"
on public.corrective_actions for select to authenticated
using (organization_id = public.current_user_organization_id());

create policy "Inspectors can create organization corrective actions"
on public.corrective_actions for insert to authenticated
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'inspector'));

create policy "Inspectors can update organization corrective actions"
on public.corrective_actions for update to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'inspector'))
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'inspector'));

grant select, insert, update on table public.corrective_actions to authenticated;