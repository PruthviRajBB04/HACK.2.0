alter table public.documents
  add column if not exists ai_analysis jsonb,
  add column if not exists ai_analysis_updated_at timestamptz;

create index if not exists documents_ai_analysis_idx on public.documents (ai_analysis) where ai_analysis is not null;
