create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type text not null,
  registration_number text,
  country text not null default 'India',
  state text not null,
  district text not null,
  address text not null,
  contact_person_name text not null,
  contact_email text not null,
  contact_phone text not null,
  planned_mine_count integer not null check (planned_mine_count >= 0),
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'owner' check (member_role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  unique (user_id)
);

alter table public.profiles
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index organizations_created_by_idx on public.organizations (created_by);
create index organization_members_user_id_idx on public.organization_members (user_id);
create index profiles_organization_id_idx on public.profiles (organization_id);

create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
  );
$$;

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
    name,
    organization_type,
    registration_number,
    country,
    state,
    district,
    address,
    contact_person_name,
    contact_email,
    contact_phone,
    planned_mine_count,
    description,
    created_by
  ) values (
    p_name,
    p_organization_type,
    nullif(btrim(p_registration_number), ''),
    p_country,
    p_state,
    p_district,
    p_address,
    p_contact_person_name,
    p_contact_email,
    p_contact_phone,
    p_planned_mine_count,
    nullif(btrim(p_description), ''),
    current_user_id
  )
  returning * into org;

  insert into public.organization_members (organization_id, user_id, member_role)
  values (org.id, current_user_id, 'owner');

  insert into public.profiles (id, full_name, email, role, organization_id)
  values (
    current_user_id,
    p_contact_person_name,
    p_contact_email,
    'admin',
    org.id
  )
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        email = coalesce(public.profiles.email, excluded.email);

  return org;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "Members can read their organization"
on public.organizations for select to authenticated
using (created_by = auth.uid() or public.is_org_member(id));

create policy "Authenticated users can create organizations"
on public.organizations for insert to authenticated
with check (created_by = auth.uid());

create policy "Members can update their organization"
on public.organizations for update to authenticated
using (public.is_org_member(id))
with check (public.is_org_member(id));

create policy "Users can read their organization membership"
on public.organization_members for select to authenticated
using (user_id = auth.uid() or public.is_org_member(organization_id));

create policy "Users can join an organization as themselves"
on public.organization_members for insert to authenticated
with check (user_id = auth.uid());

grant select, insert, update on table public.organizations to authenticated;
grant select, insert on table public.organization_members to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.create_organization(text, text, text, text, text, text, text, text, text, text, integer, text) to authenticated;
