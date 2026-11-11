-- Additive initial schema for the single TTM organisation.
-- Inspect the target before applying: this migration intentionally fails on name collisions.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id),
  full_name text not null check (length(trim(full_name)) between 1 and 160),
  email text not null,
  role text not null default 'viewer' check (role in ('director','admin','product_specialist','application_specialist','viewer')),
  active boolean not null default true,
  region text not null default '',
  skills text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create function private.current_role() returns text
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p
  where auth.uid() is not null and p.id = auth.uid() and p.active;
$$;
revoke all on function private.current_role() from public, anon;
grant execute on function private.current_role() to authenticated;
create function private.is_manager() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce(private.current_role() in ('director','admin'),false);
$$;
revoke all on function private.is_manager() from public, anon;
grant execute on function private.is_manager() to authenticated;
create function private.can_write() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce(private.current_role() in ('director','admin','product_specialist','application_specialist'),false);
$$;
revoke all on function private.can_write() from public, anon;
grant execute on function private.can_write() to authenticated;

create table public.products (
  id uuid primary key default gen_random_uuid(), sku text unique,
  name text not null check(length(trim(name)) between 1 and 200), brand text not null default '',
  category text not null default '', description text not null default '',
  source_page integer check(source_page > 0), specs jsonb not null default '{}', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create table public.accounts (
  id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 200),
  type text not null default 'hospital' check(type in ('hospital','clinic','distributor','principal','other')),
  city text not null default '', province text not null default '', address text not null default '', territory text not null default '',
  owner_id uuid not null references public.profiles(id), status text not null default 'prospect' check(status in ('active','prospect','inactive')),
  notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create table public.contacts (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id),
  full_name text not null check(length(trim(full_name)) between 1 and 160), job_title text not null default '', department text not null default '',
  email text not null default '', phone text not null default '', is_primary boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create unique index contacts_primary_one on public.contacts(account_id) where is_primary;
create table public.opportunities (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id), product_id uuid references public.products(id),
  title text not null check(length(trim(title)) between 1 and 240),
  stage text not null default 'lead' check(stage in ('lead','qualified','demo','proposal','negotiation','won','lost')),
  value numeric(18,2) not null default 0 check(value >= 0), probability integer not null default 10 check(probability between 0 and 100),
  expected_close date, owner_id uuid not null references public.profiles(id), next_step text not null default '', next_action_due_date date,
  lost_reason text not null default '', notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id),
  constraint opportunities_lost_reason check(stage <> 'lost' or length(trim(lost_reason)) > 0),
  constraint opportunities_active_next_step check(stage in ('won','lost') or length(trim(next_step)) > 0)
);
create table public.equipment (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id), code text not null unique,
  name text not null check(length(trim(name)) between 1 and 200), status text not null default 'available' check(status in ('available','maintenance','inactive')),
  serial_number text not null default '', location text not null default '', notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create table public.activities (
  id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 1 and 240),
  type text not null check(type in ('demo','presentation','exhibition','training','refreshment','visit','internal','other')),
  account_id uuid references public.accounts(id), product_id uuid references public.products(id), opportunity_id uuid references public.opportunities(id),
  owner_id uuid not null references public.profiles(id), start_at timestamptz not null, end_at timestamptz not null,
  timezone text not null default 'Asia/Jakarta' check(timezone in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura')),
  location text not null default '', objective text not null default '', notes text not null default '',
  priority text not null default 'medium' check(priority in ('low','medium','high')),
  status text not null default 'draft' check(status in ('draft','submitted','approved','in_progress','completed','rejected','cancelled')),
  report text not null default '', outcome text not null default '', follow_up_date date, attendance_count integer check(attendance_count >= 0),
  participant_ids uuid[] not null default '{}', equipment_ids uuid[] not null default '{}',
  submitted_at timestamptz, approved_by uuid references public.profiles(id), approval_note text not null default '',
  budget numeric(18,2) not null default 0 check(budget >= 0), actual_cost numeric(18,2) not null default 0 check(actual_cost >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id),
  constraint activities_valid_interval check(end_at > start_at),
  constraint activities_report_required check(status <> 'completed' or (length(trim(report)) >= 10 and length(trim(outcome)) > 0)),
  constraint activities_reason_required check(status not in ('cancelled','rejected') or length(trim(approval_note)) > 0),
  constraint activities_customer_context check(type = 'internal' or account_id is not null or length(trim(notes)) > 0)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 1 and 240), due_date date not null,
  assigned_to uuid not null references public.profiles(id), activity_id uuid references public.activities(id), account_id uuid references public.accounts(id), opportunity_id uuid references public.opportunities(id),
  status text not null default 'todo' check(status in ('todo','in_progress','done','cancelled')),
  priority text not null default 'medium' check(priority in ('low','medium','high')), notes text not null default '',
  completed_at timestamptz, completed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create table public.org_settings (
  id text primary key default 'ttm' check(id = 'ttm'), name text not null default 'Triputra Techno Med',
  timezone text not null default 'Asia/Jakarta' check(timezone in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
insert into public.org_settings(id) values ('ttm');
create table public.activity_attachments (
  id uuid primary key default gen_random_uuid(), activity_id uuid not null references public.activities(id),
  file_name text not null check(length(file_name) between 1 and 240), storage_path text not null unique,
  mime_type text not null check(mime_type in ('application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes integer not null check(size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id),
  constraint attachment_path_matches_activity check(split_part(storage_path,'/',1) = activity_id::text and cardinality(string_to_array(storage_path,'/')) = 2)
);
create table public.audit_logs (
  id bigint generated always as identity primary key, entity_type text not null, entity_id text not null,
  action text not null, actor_id uuid, occurred_at timestamptz not null default now(), old_data jsonb, new_data jsonb
);

-- Every exposed table has explicit grants and RLS. No anonymous data access.
do $$ declare t text; begin
  foreach t in array array['profiles','products','accounts','contacts','opportunities','equipment','activities','tasks','org_settings','activity_attachments','audit_logs'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
  foreach t in array array['profiles','products','accounts','contacts','opportunities','equipment','activities','tasks','org_settings','activity_attachments'] loop
    execute format('grant insert, update, delete on public.%I to authenticated',t);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.current_role()) is not null)',t||'_team_read',t);
  end loop;
end $$;
create policy profiles_insert on public.profiles for insert to authenticated with check((select private.is_manager()));
create policy profiles_update on public.profiles for update to authenticated
  using(id = (select auth.uid()) or (select private.is_manager()))
  with check(id = (select auth.uid()) or (select private.is_manager()));
-- Profiles have no delete policy. Nonactive users cannot self-reactivate (guard below).
create policy products_manage on public.products for all to authenticated using((select private.is_manager())) with check((select private.is_manager()));
create policy equipment_manage on public.equipment for all to authenticated using((select private.is_manager())) with check((select private.is_manager()));
create policy settings_manage on public.org_settings for update to authenticated using((select private.is_manager())) with check((select private.is_manager()));
create policy accounts_insert on public.accounts for insert to authenticated with check((select private.can_write()) and (owner_id = (select auth.uid()) or (select private.is_manager())));
create policy accounts_update on public.accounts for update to authenticated using((select private.can_write()) and (owner_id = (select auth.uid()) or (select private.is_manager()))) with check((select private.can_write()) and (owner_id = (select auth.uid()) or (select private.is_manager())));
create policy accounts_delete on public.accounts for delete to authenticated using((select private.is_manager()));
create policy contacts_insert on public.contacts for insert to authenticated with check((select private.can_write()) and exists(select 1 from public.accounts a where a.id = account_id and (a.owner_id = (select auth.uid()) or (select private.is_manager()))));
create policy contacts_update on public.contacts for update to authenticated using((select private.can_write()) and exists(select 1 from public.accounts a where a.id = account_id and (a.owner_id = (select auth.uid()) or (select private.is_manager())))) with check((select private.can_write()) and exists(select 1 from public.accounts a where a.id = account_id and (a.owner_id = (select auth.uid()) or (select private.is_manager()))));
create policy contacts_delete on public.contacts for delete to authenticated using((select private.is_manager()));
create policy opportunities_insert on public.opportunities for insert to authenticated with check((select private.can_write()) and (owner_id = (select auth.uid()) or (select private.is_manager())));
create policy opportunities_update on public.opportunities for update to authenticated using((select private.can_write()) and (owner_id = (select auth.uid()) or (select private.is_manager()))) with check((select private.can_write()) and (owner_id = (select auth.uid()) or (select private.is_manager())));
create policy opportunities_delete on public.opportunities for delete to authenticated using((select private.is_manager()));
create policy activities_insert on public.activities for insert to authenticated with check((select private.can_write()) and (owner_id = (select auth.uid()) or (select private.is_manager())));
create policy activities_update on public.activities for update to authenticated using((select private.can_write()) and ((select private.is_manager()) or owner_id = (select auth.uid()) or (select auth.uid()) = any(participant_ids))) with check((select private.can_write()) and ((select private.is_manager()) or owner_id = (select auth.uid()) or (select auth.uid()) = any(participant_ids)));
create policy activities_delete on public.activities for delete to authenticated using((select private.is_manager()) and status = 'draft');
create policy tasks_insert on public.tasks for insert to authenticated with check((select private.can_write()) and (assigned_to = (select auth.uid()) or (select private.is_manager())));
create policy tasks_update on public.tasks for update to authenticated using((select private.can_write()) and (assigned_to = (select auth.uid()) or (select private.is_manager()))) with check((select private.can_write()) and (assigned_to = (select auth.uid()) or (select private.is_manager())));
create policy tasks_delete on public.tasks for delete to authenticated using((select private.is_manager()));
create policy attachments_insert on public.activity_attachments for insert to authenticated with check((select private.can_write()) and created_by = (select auth.uid()) and exists(select 1 from public.activities a where a.id = activity_id and ((select private.is_manager()) or a.owner_id = (select auth.uid()) or (select auth.uid()) = any(a.participant_ids))) and exists(select 1 from storage.objects o where o.bucket_id = 'activity-evidence' and o.name = storage_path and (o.owner_id = (select auth.uid())::text or (select private.is_manager()))));
create policy attachments_delete on public.activity_attachments for delete to authenticated using((select private.can_write()) and (created_by = (select auth.uid()) or (select private.is_manager())));
create policy audit_manager_read on public.audit_logs for select to authenticated using((select private.is_manager()));

-- Immutable actor/timestamps, ownership reassignment and task completion metadata.
create function private.touch_record() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    new.created_at := now(); new.created_by := auth.uid();
  else
    new.created_at := old.created_at; new.created_by := old.created_by;
    if TG_TABLE_NAME in ('accounts','opportunities') and (to_jsonb(new)->>'owner_id') is distinct from (to_jsonb(old)->>'owner_id') and not private.is_manager() then
      raise exception 'Hanya director/admin dapat mengganti pemilik.' using errcode = '42501';
    end if;
    if TG_TABLE_NAME = 'tasks' and (to_jsonb(new)->>'assigned_to') is distinct from (to_jsonb(old)->>'assigned_to') and not private.is_manager() then
      raise exception 'Hanya director/admin dapat mengalihkan tugas.' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function private.touch_record() from public, anon, authenticated;

create function private.guard_profile() returns trigger language plpgsql security definer set search_path = '' as $$
declare privileged boolean := (auth.uid() is null and current_user in ('postgres','supabase_admin')) or coalesce(private.is_manager(),false);
begin
  -- Only privileged database operators can bootstrap; JWT user_metadata is never consulted.
  perform pg_advisory_xact_lock(884201);
  if auth.uid() is null and not privileged and coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception 'Keanggotaan aktif diperlukan.' using errcode = '42501';
  end if;
  if TG_OP = 'UPDATE' then
    if new.id <> old.id then raise exception 'ID profil tidak dapat diubah.' using errcode = '42501'; end if;
    if not privileged and (not old.active or (to_jsonb(new) - array['full_name','updated_at']) is distinct from (to_jsonb(old) - array['full_name','updated_at'])) then
      raise exception 'Hanya nama pribadi dapat diubah oleh anggota.' using errcode = '42501';
    end if;
    if old.active and old.role in ('director','admin') and (not new.active or new.role not in ('director','admin')) and
       not exists(select 1 from public.profiles p where p.id <> old.id and p.active and p.role in ('director','admin')) then
      raise exception 'Administrator aktif terakhir tidak dapat dinonaktifkan atau diturunkan.' using errcode = '23514';
    end if;
  elsif not privileged then
    raise exception 'Hanya director/admin dapat menambah anggota.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.guard_profile() from public, anon, authenticated;

create function private.guard_activity() returns trigger language plpgsql security definer set search_path = '' as $$
declare actor_role text := private.current_role(); schedule_changed boolean := false;
begin
  if auth.uid() is null or actor_role is null or actor_role = 'viewer' then raise exception 'Anggota aktif dengan hak tulis diperlukan.' using errcode = '42501'; end if;
  -- Serialise scheduling changes. Each volatile SELECT after the lock sees the latest committed rows.
  perform pg_advisory_xact_lock(884202);
  if TG_OP = 'INSERT' then
    if new.status not in ('draft','submitted') then raise exception 'Kegiatan baru harus draft atau submitted.' using errcode = '23514'; end if;
    new.approved_by := null;
  else
    if new.owner_id <> old.owner_id and actor_role not in ('director','admin') then raise exception 'Hanya director/admin dapat mengganti koordinator.' using errcode = '42501'; end if;
    schedule_changed := (new.start_at,new.end_at,new.owner_id,new.participant_ids,new.equipment_ids) is distinct from (old.start_at,old.end_at,old.owner_id,old.participant_ids,old.equipment_ids);
    if old.status = 'completed' and (schedule_changed or new.status <> 'completed') then raise exception 'Jadwal kegiatan selesai tidak dapat diubah.' using errcode = '23514'; end if;
    if schedule_changed and old.status in ('approved','in_progress') then
      new.status := 'submitted'; new.approved_by := null; new.approval_note := 'Jadwal/penugasan berubah; perlu persetujuan ulang.';
    elsif new.status <> old.status then
      if not ((old.status = 'draft' and new.status in ('submitted','cancelled')) or
        (old.status = 'submitted' and new.status in ('approved','rejected','cancelled')) or
        (old.status = 'rejected' and new.status in ('draft','submitted','cancelled')) or
        (old.status = 'approved' and new.status in ('in_progress','cancelled')) or
        (old.status = 'in_progress' and new.status in ('completed','cancelled'))) then
        raise exception 'Perubahan status kegiatan tidak diizinkan.' using errcode = '23514';
      end if;
      if new.status in ('approved','rejected') and actor_role not in ('director','admin') then raise exception 'Persetujuan hanya untuk director/admin.' using errcode = '42501'; end if;
    end if;
    if not schedule_changed then new.approved_by := old.approved_by; end if;
  end if;
  if TG_OP = 'UPDATE' then new.submitted_at := old.submitted_at; end if;
  if new.status = 'submitted' and (TG_OP = 'INSERT' or old.status <> 'submitted' or schedule_changed) then new.submitted_at := now(); end if;
  if new.status = 'approved' and (TG_OP = 'INSERT' or old.status <> 'approved') then new.approved_by := auth.uid(); end if;
  if (TG_OP = 'INSERT' or schedule_changed or (new.status in ('submitted','approved','in_progress') and old.status is distinct from new.status)) and
     (not exists(select 1 from public.profiles p where p.id = new.owner_id and p.active) or
     exists(select 1 from unnest(new.participant_ids) u(id) left join public.profiles p on p.id = u.id where p.id is null or not p.active)) then
    raise exception 'Koordinator/peserta harus anggota aktif.' using errcode = '23514';
  end if;
  if cardinality(new.participant_ids) <> (select count(distinct x) from unnest(new.participant_ids) x) or cardinality(new.equipment_ids) <> (select count(distinct x) from unnest(new.equipment_ids) x) then
    raise exception 'Peserta atau unit duplikat.' using errcode = '23514';
  end if;
  if exists(select 1 from unnest(new.equipment_ids) u(id) left join public.equipment e on e.id = u.id where e.id is null) then raise exception 'Unit demo tidak ditemukan.' using errcode = '23503'; end if;
  if new.opportunity_id is not null and not exists(select 1 from public.opportunities o where o.id = new.opportunity_id and o.account_id is not distinct from new.account_id and (new.product_id is null or o.product_id is not distinct from new.product_id)) then
    raise exception 'Peluang tidak sesuai pelanggan/produk kegiatan.' using errcode = '23514';
  end if;
  if new.status in ('submitted','approved','in_progress') then
    if exists(select 1 from public.equipment e where e.id = any(new.equipment_ids) and e.status <> 'available') then raise exception 'Unit demo tidak tersedia/maintenance.' using errcode = '23514'; end if;
    if exists(select 1 from public.activities a where a.id <> new.id and a.status in ('submitted','approved','in_progress')
      and a.start_at < new.end_at and a.end_at > new.start_at
      and ((array_append(a.participant_ids,a.owner_id) && array_append(new.participant_ids,new.owner_id)) or a.equipment_ids && new.equipment_ids)) then
      raise exception 'Jadwal bentrok: personel atau unit demo telah dipesan.' using errcode = '23P01';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_activity() from public, anon, authenticated;

create function private.guard_assignment() returns trigger language plpgsql security definer set search_path = '' as $$
declare member_id uuid;
begin
  if auth.uid() is null or private.current_role() is null then raise exception 'Anggota aktif diperlukan.' using errcode = '42501'; end if;
  if TG_TABLE_NAME in ('accounts','opportunities') then member_id := new.owner_id; else member_id := new.assigned_to; end if;
  if TG_OP = 'INSERT' or (TG_TABLE_NAME in ('accounts','opportunities') and (to_jsonb(new)->>'owner_id') is distinct from (to_jsonb(old)->>'owner_id')) or (TG_TABLE_NAME = 'tasks' and (to_jsonb(new)->>'assigned_to') is distinct from (to_jsonb(old)->>'assigned_to')) then
    if not exists(select 1 from public.profiles p where p.id = member_id and p.active) then raise exception 'Penanggung jawab harus anggota aktif.' using errcode = '23514'; end if;
  end if;
  if TG_TABLE_NAME = 'opportunities' then
    if new.stage = 'won' then new.probability := 100; elsif new.stage = 'lost' then new.probability := 0; end if;
  elsif TG_TABLE_NAME = 'tasks' then
    if new.opportunity_id is not null and new.account_id is not null and not exists(select 1 from public.opportunities o where o.id = new.opportunity_id and o.account_id = new.account_id) then raise exception 'Peluang tugas tidak sesuai pelanggan.' using errcode = '23514'; end if;
    if new.activity_id is not null and not exists(select 1 from public.activities a where a.id = new.activity_id and (new.account_id is null or a.account_id = new.account_id) and (new.opportunity_id is null or a.opportunity_id is null or a.opportunity_id = new.opportunity_id)) then raise exception 'Relasi kegiatan tugas tidak sesuai pelanggan/peluang.' using errcode = '23514'; end if;
    if new.status = 'done' then
      if TG_OP = 'INSERT' or old.status <> 'done' then new.completed_at := now(); new.completed_by := auth.uid(); else new.completed_at := old.completed_at; new.completed_by := old.completed_by; end if;
    else new.completed_at := null; new.completed_by := null; end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_assignment() from public, anon, authenticated;

create function private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Trigger-only function; no direct EXECUTE grants. Actor may be null only for operator maintenance.
  insert into public.audit_logs(entity_type,entity_id,action,actor_id,old_data,new_data)
    values(TG_TABLE_NAME,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id'),TG_OP,auth.uid(),
      case when TG_OP <> 'INSERT' then to_jsonb(old) end,case when TG_OP <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new,old);
end $$;
revoke all on function private.audit_change() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['profiles','products','accounts','contacts','opportunities','equipment','activities','tasks','org_settings','activity_attachments'] loop
    execute format('create trigger zz_touch before insert or update on public.%I for each row execute function private.touch_record()',t);
    execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',t);
  end loop;
end $$;
create trigger guard_profile before insert or update on public.profiles for each row execute function private.guard_profile();
create trigger guard_activity before insert or update on public.activities for each row execute function private.guard_activity();
create trigger guard_assignment before insert or update on public.accounts for each row execute function private.guard_assignment();
create trigger guard_assignment before insert or update on public.opportunities for each row execute function private.guard_assignment();
create trigger guard_assignment before insert or update on public.tasks for each row execute function private.guard_assignment();

create index accounts_owner_idx on public.accounts(owner_id);
create index accounts_search_idx on public.accounts(lower(name));
create index contacts_account_idx on public.contacts(account_id);
create index opportunities_owner_idx on public.opportunities(owner_id);
create index opportunities_account_idx on public.opportunities(account_id);
create index opportunities_product_idx on public.opportunities(product_id);
create index opportunities_stage_close_idx on public.opportunities(stage,expected_close);
create index activities_interval_idx on public.activities(start_at,end_at) where status in ('submitted','approved','in_progress');
create index activities_owner_start_idx on public.activities(owner_id,start_at);
create index activities_participants_idx on public.activities using gin(participant_ids);
create index activities_equipment_idx on public.activities using gin(equipment_ids);
create index activities_account_idx on public.activities(account_id);
create index activities_product_idx on public.activities(product_id);
create index activities_opportunity_idx on public.activities(opportunity_id);
create index equipment_product_idx on public.equipment(product_id);
create index tasks_owner_due_idx on public.tasks(assigned_to,due_date);
create index tasks_activity_idx on public.tasks(activity_id);
create index tasks_account_idx on public.tasks(account_id);
create index tasks_opportunity_idx on public.tasks(opportunity_id);
create index attachments_activity_idx on public.activity_attachments(activity_id);
create index audit_entity_idx on public.audit_logs(entity_type,entity_id,occurred_at desc);
create index audit_actor_idx on public.audit_logs(actor_id,occurred_at desc);

-- Private evidence storage. Path convention: <activity_uuid>/<random_uuid>.<extension>.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('activity-evidence','activity-evidence',false,10485760,array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
create policy evidence_read on storage.objects for select to authenticated using(bucket_id = 'activity-evidence' and (select private.current_role()) is not null);
create policy evidence_insert on storage.objects for insert to authenticated with check(bucket_id = 'activity-evidence' and (select private.can_write()) and exists(select 1 from public.activities a where a.id::text = split_part(name,'/',1) and ((select private.is_manager()) or a.owner_id = (select auth.uid()) or (select auth.uid()) = any(a.participant_ids))));
create policy evidence_delete on storage.objects for delete to authenticated using(bucket_id = 'activity-evidence' and (select private.can_write()) and (owner_id = (select auth.uid())::text or (select private.is_manager())));
-- Uploads are immutable: replacements use a new random path; no UPDATE/upsert grant.
