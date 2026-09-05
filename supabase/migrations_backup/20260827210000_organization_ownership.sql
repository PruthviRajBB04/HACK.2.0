-- Establish organization ownership for operational records without invalidating existing rows.
alter table public.mines
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.compliance_records
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.documents
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.inspections
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.alerts
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

update public.compliance_records records
set organization_id = mines.organization_id
from public.mines
where records.mine_id = mines.id
  and records.organization_id is null;

update public.documents documents
set organization_id = mines.organization_id
from public.mines
where documents.mine_id = mines.id
  and documents.organization_id is null;

update public.inspections inspections
set organization_id = mines.organization_id
from public.mines
where inspections.mine_id = mines.id
  and inspections.organization_id is null;

update public.alerts alerts
set organization_id = mines.organization_id
from public.mines
where alerts.mine_id = mines.id
  and alerts.organization_id is null;

create index if not exists mines_organization_id_idx on public.mines (organization_id);
create index if not exists compliance_records_organization_id_idx on public.compliance_records (organization_id);
create index if not exists documents_organization_id_idx on public.documents (organization_id);
create index if not exists inspections_organization_id_idx on public.inspections (organization_id);
create index if not exists alerts_organization_id_idx on public.alerts (organization_id);

create or replace function public.current_user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = p_org_id
      and user_id = auth.uid()
      and member_role in ('owner', 'admin')
  ) or public.current_user_role() = 'admin';
$$;

create or replace function public.set_record_organization_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_organization_id uuid;
begin
  if tg_table_name = 'mines' then
    if new.organization_id is null then
      new.organization_id := public.current_user_organization_id();
    end if;
    return new;
  end if;

  select organization_id into linked_organization_id
  from public.mines
  where id = new.mine_id;

  if linked_organization_id is not null then
    new.organization_id := linked_organization_id;
  elsif new.organization_id is null then
    new.organization_id := public.current_user_organization_id();
  end if;

  return new;
end;
$$;

drop trigger if exists set_mines_organization_id on public.mines;
create trigger set_mines_organization_id
before insert or update on public.mines
for each row execute function public.set_record_organization_id();

drop trigger if exists set_compliance_records_organization_id on public.compliance_records;
create trigger set_compliance_records_organization_id
before insert or update on public.compliance_records
for each row execute function public.set_record_organization_id();

drop trigger if exists set_documents_organization_id on public.documents;
create trigger set_documents_organization_id
before insert or update on public.documents
for each row execute function public.set_record_organization_id();

drop trigger if exists set_inspections_organization_id on public.inspections;
create trigger set_inspections_organization_id
before insert or update on public.inspections
for each row execute function public.set_record_organization_id();

drop trigger if exists set_alerts_organization_id on public.alerts;
create trigger set_alerts_organization_id
before insert or update on public.alerts
for each row execute function public.set_record_organization_id();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mapped_role text := case new.raw_user_meta_data->>'public_role'
    when 'Corporate Management' then 'admin'
    when 'Mine Manager' then 'mine_manager'
    when 'Compliance Officer' then 'compliance_officer'
    when 'Field Officer' then 'inspector'
    when 'Regulatory Authority' then 'viewer'
    else 'viewer'
  end;
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    mapped_role
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;
  return new;
end;
$$;

update public.profiles profiles
set role = case users.raw_user_meta_data->>'public_role'
  when 'Corporate Management' then 'admin'
  when 'Mine Manager' then 'mine_manager'
  when 'Compliance Officer' then 'compliance_officer'
  when 'Field Officer' then 'inspector'
  when 'Regulatory Authority' then 'viewer'
  else profiles.role
end
from auth.users users
where users.id = profiles.id;

create or replace function public.create_organization(
  p_name text,
  p_organization_type text,
  p_registration_number text,
  p_country text,
  p_state text,
  p_district text,
  p_address text,
  p_contact_person_name text,
  p_contact_email text,
  p_contact_phone text,
  p_planned_mine_count integer,
  p_description text
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  org public.organizations;
  current_user_id uuid := auth.uid();
  mapped_role text := case (select raw_user_meta_data->>'public_role' from auth.users where id = current_user_id)
    when 'Corporate Management' then 'admin'
    when 'Mine Manager' then 'mine_manager'
    when 'Compliance Officer' then 'compliance_officer'
    when 'Field Officer' then 'inspector'
    when 'Regulatory Authority' then 'viewer'
    else coalesce((select role from public.profiles where id = current_user_id), 'viewer')
  end;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to create an organization.';
  end if;

  if exists (select 1 from public.organization_members where user_id = current_user_id) then
    raise exception 'This account is already linked to an organization.';
  end if;

  if p_planned_mine_count is null or p_planned_mine_count < 0 then
    raise exception 'Number of mines must be zero or greater.';
  end if;

  insert into public.organizations (
    name, organization_type, registration_number, country, state, district, address,
    contact_person_name, contact_email, contact_phone, planned_mine_count, description, created_by
  ) values (
    p_name, p_organization_type, nullif(btrim(p_registration_number), ''), p_country, p_state,
    p_district, p_address, p_contact_person_name, p_contact_email, p_contact_phone,
    p_planned_mine_count, nullif(btrim(p_description), ''), current_user_id
  )
  returning * into org;

  insert into public.organization_members (organization_id, user_id, member_role)
  values (org.id, current_user_id, 'owner');

  insert into public.profiles (id, full_name, email, role, organization_id)
  values (current_user_id, p_contact_person_name, p_contact_email, mapped_role, org.id)
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        email = coalesce(public.profiles.email, excluded.email),
        role = excluded.role;

  return org;
end;
$$;

grant execute on function public.current_user_organization_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can read profiles in their organization"
on public.profiles for select to authenticated
using (id = auth.uid() or (organization_id is not null and organization_id = public.current_user_organization_id()));
create policy "Users can create their own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

drop policy if exists "Authenticated users can read mines" on public.mines;
drop policy if exists "Authenticated users can create mines" on public.mines;
drop policy if exists "Authenticated users can update mines" on public.mines;
create policy "Members can read organization mines"
on public.mines for select to authenticated
using (organization_id = public.current_user_organization_id());
create policy "Managers can create organization mines"
on public.mines for insert to authenticated
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager'));
create policy "Managers can update organization mines"
on public.mines for update to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager'))
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager'));

drop policy if exists "Authenticated users can read compliance requirements" on public.compliance_requirements;
drop policy if exists "Authenticated users can create compliance requirements" on public.compliance_requirements;
drop policy if exists "Authenticated users can update compliance requirements" on public.compliance_requirements;
create policy "Authenticated users can read compliance requirements"
on public.compliance_requirements for select to authenticated using (true);
create policy "Administrators can manage compliance requirements"
on public.compliance_requirements for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Authenticated users can read compliance records" on public.compliance_records;
drop policy if exists "Authenticated users can create compliance records" on public.compliance_records;
drop policy if exists "Authenticated users can update compliance records" on public.compliance_records;
create policy "Members can read organization compliance records"
on public.compliance_records for select to authenticated
using (organization_id = public.current_user_organization_id());
create policy "Authorized users can create compliance records"
on public.compliance_records for insert to authenticated
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer', 'inspector'));
create policy "Authorized users can update compliance records"
on public.compliance_records for update to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer', 'inspector'))
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer', 'inspector'));

drop policy if exists "Authenticated users can read documents" on public.documents;
drop policy if exists "Authenticated users can create documents" on public.documents;
drop policy if exists "Authenticated users can update documents" on public.documents;
create policy "Members can read organization documents"
on public.documents for select to authenticated
using (organization_id = public.current_user_organization_id());
create policy "Authorized users can create organization documents"
on public.documents for insert to authenticated
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer', 'inspector'));
create policy "Authorized users can update organization documents"
on public.documents for update to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer', 'inspector'))
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer', 'inspector'));

drop policy if exists "Authenticated users can read inspections" on public.inspections;
drop policy if exists "Authenticated users can create inspections" on public.inspections;
drop policy if exists "Authenticated users can update inspections" on public.inspections;
create policy "Members can read organization inspections"
on public.inspections for select to authenticated
using (organization_id = public.current_user_organization_id());
create policy "Inspectors can create organization inspections"
on public.inspections for insert to authenticated
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'inspector'));
create policy "Authorized users can update organization inspections"
on public.inspections for update to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'inspector'))
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'inspector'));

drop policy if exists "Authenticated users can read alerts" on public.alerts;
drop policy if exists "Authenticated users can create alerts" on public.alerts;
drop policy if exists "Authenticated users can update alerts" on public.alerts;
create policy "Members can read organization alerts"
on public.alerts for select to authenticated
using (organization_id = public.current_user_organization_id());
create policy "Authorized users can create organization alerts"
on public.alerts for insert to authenticated
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer'));
create policy "Authorized users can update organization alerts"
on public.alerts for update to authenticated
using (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer'))
with check (organization_id = public.current_user_organization_id() and public.current_user_role() in ('admin', 'mine_manager', 'compliance_officer'));

drop policy if exists "Members can read their organization" on public.organizations;
drop policy if exists "Authenticated users can create organizations" on public.organizations;
drop policy if exists "Members can update their organization" on public.organizations;
create policy "Members can read their organization"
on public.organizations for select to authenticated
using (created_by = auth.uid() or public.is_org_member(id));
create policy "Authenticated users can create organizations"
on public.organizations for insert to authenticated
with check (created_by = auth.uid());
create policy "Organization administrators can update their organization"
on public.organizations for update to authenticated
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

drop policy if exists "Users can join an organization as themselves" on public.organization_members;
