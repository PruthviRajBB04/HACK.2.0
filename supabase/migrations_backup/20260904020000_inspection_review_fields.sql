alter table public.inspections
  add column if not exists reviewer text,
  add column if not exists review_comments text,
  add column if not exists reviewed_at timestamptz;

create index if not exists inspections_reviewed_at_idx on public.inspections (reviewed_at);