alter table public.documents
  add column if not exists inspection_id uuid references public.inspections(id) on delete cascade,
  add column if not exists checklist_item_id uuid references public.inspection_checklists(id) on delete set null,
  add column if not exists finding_id uuid references public.inspection_findings(id) on delete set null,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists storage_path text,
  add column if not exists storage_mode text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists documents_inspection_id_idx on public.documents (inspection_id);
create index if not exists documents_checklist_item_id_idx on public.documents (checklist_item_id);
create index if not exists documents_finding_id_idx on public.documents (finding_id);

create trigger set_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

grant select, insert, update on table public.documents to authenticated;

insert into storage.buckets (id, name, public)
values ('inspection-evidence', 'inspection-evidence', false)
on conflict (id) do nothing;

create policy "Members can read organization inspection evidence"
on storage.objects for select to authenticated
using (bucket_id = 'inspection-evidence' and (storage.foldername(name))[1] = public.current_user_organization_id()::text);

create policy "Inspectors can upload organization inspection evidence"
on storage.objects for insert to authenticated
with check (bucket_id = 'inspection-evidence' and (storage.foldername(name))[1] = public.current_user_organization_id()::text and public.current_user_role() in ('admin', 'mine_manager', 'inspector'));

create policy "Inspectors can update organization inspection evidence"
on storage.objects for update to authenticated
using (bucket_id = 'inspection-evidence' and (storage.foldername(name))[1] = public.current_user_organization_id()::text and public.current_user_role() in ('admin', 'mine_manager', 'inspector'))
with check (bucket_id = 'inspection-evidence' and (storage.foldername(name))[1] = public.current_user_organization_id()::text and public.current_user_role() in ('admin', 'mine_manager', 'inspector'));