alter table public.compliance_requirements
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

grant select, insert, update on table public.compliance_requirements to authenticated;

create index if not exists compliance_requirements_organization_id_idx
  on public.compliance_requirements (organization_id);

drop policy if exists "Authenticated users can read compliance requirements" on public.compliance_requirements;
drop policy if exists "Authenticated users can create compliance requirements" on public.compliance_requirements;
drop policy if exists "Authenticated users can update compliance requirements" on public.compliance_requirements;
drop policy if exists "Administrators can manage compliance requirements" on public.compliance_requirements;

create policy "Members can read organization compliance requirements"
on public.compliance_requirements for select to authenticated
using (organization_id = public.current_user_organization_id() or organization_id is null);

create policy "Authorized users can create organization compliance requirements"
on public.compliance_requirements for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer')
);

create policy "Authorized users can update organization compliance requirements"
on public.compliance_requirements for update to authenticated
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer')
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer')
);

create policy "Administrators can manage all compliance requirements"
on public.compliance_requirements for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
