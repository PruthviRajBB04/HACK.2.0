alter table public.inspections
  add column if not exists inspector_name text,
  add column if not exists description text,
  add column if not exists notes text,
  add column if not exists risk_level text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.inspections
  alter column risk_level drop not null,
  alter column risk_level drop default;

create trigger set_inspections_updated_at
before update on public.inspections
for each row execute function public.set_updated_at();