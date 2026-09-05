-- Ensure organization owners have mine_manager role to manage their mines.
-- When users create an organization, they should be able to create and manage mines for it.

-- Update the create_organization function to assign mine_manager role to organization creators.
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

  -- Organization creators are granted mine_manager role so they can manage mines for their organization.
  insert into public.profiles (id, full_name, email, role, organization_id)
  values (current_user_id, p_contact_person_name, p_contact_email, 'mine_manager', org.id)
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        email = coalesce(public.profiles.email, excluded.email),
        role = 'mine_manager';

  return org;
end;
$$;

-- Promote existing organization owners to mine_manager role if they don't already have it.
update public.profiles
set role = 'mine_manager'
where role != 'admin' and role != 'mine_manager'
  and organization_id is not null
  and id in (select user_id from public.organization_members where member_role = 'owner');
