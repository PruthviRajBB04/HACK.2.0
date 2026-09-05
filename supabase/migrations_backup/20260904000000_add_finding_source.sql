alter table public.inspection_findings
  add column if not exists source text not null default 'Manual';

alter table public.inspection_findings
  drop constraint if exists inspection_findings_source_check;

alter table public.inspection_findings
  add constraint inspection_findings_source_check check (source in ('Manual', 'AI'));