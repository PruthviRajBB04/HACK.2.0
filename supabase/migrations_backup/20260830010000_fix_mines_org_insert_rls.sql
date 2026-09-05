-- Keep mine creation restricted to the current authenticated user's organization and manager/admin roles.
drop policy if exists "Managers can create organization mines" on public.mines;
create policy "Managers can create organization mines"
on public.mines for insert to authenticated
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_role() in ('admin', 'mine_manager')
);

-- Re-assert the org ownership trigger so inserts without a value inherit the current user's organization.
drop trigger if exists set_mines_organization_id on public.mines;
create trigger set_mines_organization_id
before insert or update on public.mines
for each row execute function public.set_record_organization_id();
