-- Keep exactly the same manager-only writes while avoiding duplicate SELECT policies.
drop policy products_manage on public.products;
create policy products_insert on public.products for insert to authenticated with check((select private.is_manager()));
create policy products_update on public.products for update to authenticated using((select private.is_manager())) with check((select private.is_manager()));
create policy products_delete on public.products for delete to authenticated using((select private.is_manager()));
drop policy equipment_manage on public.equipment;
create policy equipment_insert on public.equipment for insert to authenticated with check((select private.is_manager()));
create policy equipment_update on public.equipment for update to authenticated using((select private.is_manager())) with check((select private.is_manager()));
create policy equipment_delete on public.equipment for delete to authenticated using((select private.is_manager()));

-- Cover the remaining FK lookups without removing indexes from a new database.
create index profiles_created_by_idx on public.profiles(created_by);
create index products_created_by_idx on public.products(created_by);
create index accounts_created_by_idx on public.accounts(created_by);
create index contacts_created_by_idx on public.contacts(created_by);
create index opportunities_created_by_idx on public.opportunities(created_by);
create index equipment_created_by_idx on public.equipment(created_by);
create index activities_created_by_idx on public.activities(created_by);
create index activities_approved_by_idx on public.activities(approved_by);
create index tasks_created_by_idx on public.tasks(created_by);
create index tasks_completed_by_idx on public.tasks(completed_by);
create index settings_created_by_idx on public.org_settings(created_by);
create index attachments_created_by_idx on public.activity_attachments(created_by);
