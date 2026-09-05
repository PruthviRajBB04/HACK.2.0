create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'viewer' check (role in ('admin', 'mine_manager', 'compliance_officer', 'inspector', 'viewer')),
  created_at timestamptz not null default now()
);

create table public.mines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  state text,
  district text,
  operator_name text,
  mine_type text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.compliance_requirements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  regulation text,
  category text,
  frequency text,
  due_days integer check (due_days is null or due_days >= 0),
  created_at timestamptz not null default now()
);

create table public.compliance_records (
  id uuid primary key default gen_random_uuid(),
  mine_id uuid not null references public.mines(id) on delete cascade,
  requirement_id uuid not null references public.compliance_requirements(id) on delete restrict,
  status text not null default 'pending',
  due_date date,
  completed_date date,
  remarks text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  mine_id uuid not null references public.mines(id) on delete cascade,
  title text not null,
  document_type text,
  file_path text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  expiry_date date,
  status text not null default 'active'
);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  mine_id uuid not null references public.mines(id) on delete cascade,
  inspector_id uuid references public.profiles(id) on delete set null,
  inspection_date date not null,
  inspection_type text,
  findings text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  mine_id uuid not null references public.mines(id) on delete cascade,
  title text not null,
  message text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  alert_type text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index compliance_records_mine_id_idx on public.compliance_records (mine_id);
create index compliance_records_requirement_id_idx on public.compliance_records (requirement_id);
create index compliance_records_created_by_idx on public.compliance_records (created_by);
create index compliance_records_status_idx on public.compliance_records (status);
create index compliance_records_due_date_idx on public.compliance_records (due_date);
create index documents_mine_id_idx on public.documents (mine_id);
create index documents_uploaded_by_idx on public.documents (uploaded_by);
create index documents_expiry_date_idx on public.documents (expiry_date);
create index documents_status_idx on public.documents (status);
create index inspections_mine_id_idx on public.inspections (mine_id);
create index inspections_inspector_id_idx on public.inspections (inspector_id);
create index inspections_status_idx on public.inspections (status);
create index alerts_mine_id_idx on public.alerts (mine_id);
create index alerts_is_read_idx on public.alerts (is_read);
create index alerts_severity_idx on public.alerts (severity);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_mines_updated_at
before update on public.mines
for each row execute function public.set_updated_at();

create trigger set_compliance_records_updated_at
before update on public.compliance_records
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.mines enable row level security;
alter table public.compliance_requirements enable row level security;
alter table public.compliance_records enable row level security;
alter table public.documents enable row level security;
alter table public.inspections enable row level security;
alter table public.alerts enable row level security;

create policy "Authenticated users can read profiles"
on public.profiles for select to authenticated using (true);
create policy "Users can create their own profile"
on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile"
on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Authenticated users can read mines"
on public.mines for select to authenticated using (true);
create policy "Authenticated users can create mines"
on public.mines for insert to authenticated with check (true);
create policy "Authenticated users can update mines"
on public.mines for update to authenticated using (true) with check (true);

create policy "Authenticated users can read compliance requirements"
on public.compliance_requirements for select to authenticated using (true);
create policy "Authenticated users can create compliance requirements"
on public.compliance_requirements for insert to authenticated with check (true);
create policy "Authenticated users can update compliance requirements"
on public.compliance_requirements for update to authenticated using (true) with check (true);

create policy "Authenticated users can read compliance records"
on public.compliance_records for select to authenticated using (true);
create policy "Authenticated users can create compliance records"
on public.compliance_records for insert to authenticated with check (created_by is null or created_by = auth.uid());
create policy "Authenticated users can update compliance records"
on public.compliance_records for update to authenticated using (true) with check (true);

create policy "Authenticated users can read documents"
on public.documents for select to authenticated using (true);
create policy "Authenticated users can create documents"
on public.documents for insert to authenticated with check (uploaded_by is null or uploaded_by = auth.uid());
create policy "Authenticated users can update documents"
on public.documents for update to authenticated using (true) with check (true);

create policy "Authenticated users can read inspections"
on public.inspections for select to authenticated using (true);
create policy "Authenticated users can create inspections"
on public.inspections for insert to authenticated with check (inspector_id is null or inspector_id = auth.uid());
create policy "Authenticated users can update inspections"
on public.inspections for update to authenticated using (true) with check (true);

create policy "Authenticated users can read alerts"
on public.alerts for select to authenticated using (true);
create policy "Authenticated users can create alerts"
on public.alerts for insert to authenticated with check (true);
create policy "Authenticated users can update alerts"
on public.alerts for update to authenticated using (true) with check (true);
