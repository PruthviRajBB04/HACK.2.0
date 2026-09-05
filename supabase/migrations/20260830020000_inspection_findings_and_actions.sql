-- Create inspection_findings table for findings related to inspections
create table if not exists public.inspection_findings (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  mine_id uuid not null references public.mines(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  severity text not null check (severity in ('Low', 'Medium', 'High', 'Critical')),
  recommendation text,
  status text not null default 'Open' check (status in ('Open', 'Resolved', 'Accepted Risk')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inspection_findings_inspection_id_idx on public.inspection_findings (inspection_id);
create index if not exists inspection_findings_mine_id_idx on public.inspection_findings (mine_id);
create index if not exists inspection_findings_organization_id_idx on public.inspection_findings (organization_id);
create index if not exists inspection_findings_severity_idx on public.inspection_findings (severity);
create index if not exists inspection_findings_status_idx on public.inspection_findings (status);
-- Create inspection_actions table for corrective actions
create table if not exists public.inspection_actions (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid references public.inspections(id) on delete cascade,
  finding_id uuid references public.inspection_findings(id) on delete cascade,
  mine_id uuid not null references public.mines(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  responsible_department text,
  due_date date,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Completed', 'Overdue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inspection_actions_inspection_id_idx on public.inspection_actions (inspection_id);
create index if not exists inspection_actions_finding_id_idx on public.inspection_actions (finding_id);
create index if not exists inspection_actions_mine_id_idx on public.inspection_actions (mine_id);
create index if not exists inspection_actions_organization_id_idx on public.inspection_actions (organization_id);
create index if not exists inspection_actions_status_idx on public.inspection_actions (status);
-- Add updated_at trigger for inspection_findings
drop trigger if exists set_inspection_findings_updated_at on public.inspection_findings;
create trigger set_inspection_findings_updated_at
before update on public.inspection_findings
for each row execute function public.set_updated_at();
-- Add updated_at trigger for inspection_actions
drop trigger if exists set_inspection_actions_updated_at on public.inspection_actions;
create trigger set_inspection_actions_updated_at
before update on public.inspection_actions
for each row execute function public.set_updated_at();
-- Enable RLS
alter table public.inspection_findings enable row level security;
alter table public.inspection_actions enable row level security;
-- Create policies for inspection_findings
drop policy if exists "Members can read organization inspection findings" on public.inspection_findings;
create policy "Members can read organization inspection findings"
on public.inspection_findings for select to authenticated
using (organization_id = public.current_user_organization_id());
drop policy if exists "Authorized users can create inspection findings" on public.inspection_findings;
create policy "Authorized users can create inspection findings"
on public.inspection_findings for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer', 'inspector')
);
drop policy if exists "Authorized users can update inspection findings" on public.inspection_findings;
create policy "Authorized users can update inspection findings"
on public.inspection_findings for update to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());
-- Create policies for inspection_actions
drop policy if exists "Members can read organization inspection actions" on public.inspection_actions;
create policy "Members can read organization inspection actions"
on public.inspection_actions for select to authenticated
using (organization_id = public.current_user_organization_id());
drop policy if exists "Authorized users can create inspection actions" on public.inspection_actions;
create policy "Authorized users can create inspection actions"
on public.inspection_actions for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer', 'inspector')
);
drop policy if exists "Authorized users can update inspection actions" on public.inspection_actions;
create policy "Authorized users can update inspection actions"
on public.inspection_actions for update to authenticated
using (organization_id = public.current_user_organization_id())
with check (organization_id = public.current_user_organization_id());
