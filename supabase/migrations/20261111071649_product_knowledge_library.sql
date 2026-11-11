-- Product and general materials. No existing records or evidence policies are changed.
create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 200),
  document_type text not null default 'other'
    check (document_type in ('datasheet','brochure','presentation','user_manual','training','other')),
  description text not null default '' check (length(description) <= 5000),
  version text not null default '1.0' check (length(btrim(version)) between 1 and 40),
  language text not null default 'en' check (language in ('en','id','multilingual')),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  file_name text not null check (length(btrim(file_name)) between 1 and 240),
  storage_path text not null unique,
  -- Internal binding is resolved by the trigger. It protects attach/delete races.
  storage_object_id uuid not null unique references storage.objects(id) on delete restrict,
  mime_type text not null check (mime_type in (
    'application/pdf', 'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png', 'image/jpeg'
  )),
  size_bytes integer not null check (size_bytes between 1 and 26214400),
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_document_path_binding check (
    split_part(storage_path,'/',1) = created_by::text
    and split_part(storage_path,'/',2) = id::text
    and storage_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|ppt|pptx|doc|docx|xls|xlsx|png|jpg|jpeg)$'
  )
);
alter table public.knowledge_documents enable row level security;
revoke all on public.knowledge_documents from public, anon, authenticated;
grant select, insert, update on public.knowledge_documents to authenticated;

create policy knowledge_team_read on public.knowledge_documents for select to authenticated
  using ((select private.current_role()) is not null);
create policy knowledge_author_create on public.knowledge_documents for insert to authenticated
  with check ((select private.can_write()) and created_by = (select auth.uid()));
create policy knowledge_author_manager_update on public.knowledge_documents for update to authenticated
  using ((select private.can_write()) and (created_by = (select auth.uid()) or (select private.is_manager())))
  with check ((select private.can_write()) and (created_by = (select auth.uid()) or (select private.is_manager())));
-- No DELETE grant or policy: archive/restore retains source files and history.

create function private.guard_knowledge_document() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare object_id uuid; object_metadata jsonb; expected_extension text;
begin
  if auth.uid() is null or not private.can_write() then
    raise exception 'Anggota aktif dengan hak tulis diperlukan.' using errcode = '42501';
  end if;
  new.title := btrim(new.title); new.version := btrim(new.version);
  if new.title is null or length(new.title) not between 1 and 200 then
    raise exception 'Judul materi wajib diisi, maksimal 200 karakter.' using errcode = '23514';
  end if;
  if new.version is null or length(new.version) not between 1 and 40 then
    raise exception 'Versi materi wajib diisi, maksimal 40 karakter.' using errcode = '23514';
  end if;
  if new.description is null or length(new.description) > 5000 then
    raise exception 'Deskripsi materi maksimal 5000 karakter.' using errcode = '23514';
  end if;
  if new.document_type is null or new.document_type not in ('datasheet','brochure','presentation','user_manual','training','other') then
    raise exception 'Jenis materi tidak valid.' using errcode = '23514';
  end if;
  if new.language is null or new.language not in ('en','id','multilingual') then
    raise exception 'Bahasa materi tidak valid.' using errcode = '23514';
  end if;
  if new.status is null or new.status not in ('active','archived') then
    raise exception 'Status materi tidak valid.' using errcode = '23514';
  end if;
  if new.tags is null or coalesce(array_ndims(new.tags),1) <> 1 or cardinality(new.tags) > 20 or
      exists (select 1 from unnest(new.tags) tag where tag is null or length(btrim(tag)) not between 1 and 60) then
    raise exception 'Maksimal 20 tag, masing-masing 1 sampai 60 karakter.' using errcode = '23514';
  end if;
  new.tags := array(select btrim(tag) from unnest(new.tags) tag);

  if TG_OP = 'UPDATE' then
    if (new.id,new.created_by,new.created_at,new.file_name,new.storage_path,new.storage_object_id,new.mime_type,new.size_bytes)
       is distinct from
       (old.id,old.created_by,old.created_at,old.file_name,old.storage_path,old.storage_object_id,old.mime_type,old.size_bytes) then
      raise exception 'File materi dan identitas pembuat tidak dapat diubah. Unggah sebagai materi baru.' using errcode = '23514';
    end if;
    return new;
  end if;

  new.created_by := auth.uid(); new.created_at := now();
  if new.file_name is null or length(btrim(new.file_name)) not between 1 and 240 or new.file_name ~ '[[:cntrl:]/\\]' then
    raise exception 'Nama file materi tidak valid, maksimal 240 karakter.' using errcode = '23514';
  end if;
  if new.size_bytes is null or new.size_bytes not between 1 and 26214400 then
    raise exception 'Ukuran file harus lebih dari nol dan maksimal 25 MiB.' using errcode = '23514';
  end if;
  expected_extension := case new.mime_type
    when 'application/pdf' then 'pdf'
    when 'application/vnd.ms-powerpoint' then 'ppt'
    when 'application/vnd.openxmlformats-officedocument.presentationml.presentation' then 'pptx'
    when 'application/msword' then 'doc'
    when 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' then 'docx'
    when 'application/vnd.ms-excel' then 'xls'
    when 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' then 'xlsx'
    when 'image/png' then 'png'
    when 'image/jpeg' then 'jpe?g'
    else null end;
  if expected_extension is null then
    raise exception 'Tipe file materi tidak didukung.' using errcode = '23514';
  end if;
  if new.storage_path is null or split_part(new.storage_path,'/',1) <> auth.uid()::text or
      split_part(new.storage_path,'/',2) <> new.id::text or
      new.storage_path !~* ('\.' || expected_extension || '$') then
    raise exception 'Lokasi file harus sesuai pembuat, ID materi, dan tipe file.' using errcode = '23514';
  end if;
  select o.id, o.metadata into object_id, object_metadata from storage.objects o
    where o.bucket_id='product-knowledge' and o.name=new.storage_path and o.owner_id=auth.uid()::text;
  if object_id is null then
    raise exception 'Unggah file milik Anda terlebih dahulu sebelum menyimpan materi.' using errcode = '23514';
  end if;
  -- Provider file metadata is authoritative whenever those attributes are available.
  if object_metadata ? 'size' then
    if coalesce(object_metadata->>'size','') !~ '^[0-9]+$' then
      raise exception 'Ukuran file tersimpan tidak valid.' using errcode = '23514';
    end if;
    if (object_metadata->>'size')::numeric <> new.size_bytes then
      raise exception 'Ukuran materi tidak sesuai file yang telah diunggah.' using errcode = '23514';
    end if;
  end if;
  if object_metadata ? 'mimetype' and lower(coalesce(object_metadata->>'mimetype','')) <> new.mime_type then
    raise exception 'Tipe materi tidak sesuai file yang telah diunggah.' using errcode = '23514';
  end if;
  -- Ignore any caller-supplied internal object ID. The FK prevents concurrent cleanup.
  new.storage_object_id := object_id;
  return new;
end $$;
revoke all on function private.guard_knowledge_document() from public, anon, authenticated;
create trigger guard_knowledge_document before insert or update on public.knowledge_documents
  for each row execute function private.guard_knowledge_document();
create trigger zz_touch before insert or update on public.knowledge_documents
  for each row execute function private.touch_record();
create trigger audit_change after insert or update on public.knowledge_documents
  for each row execute function private.audit_change();

create index knowledge_documents_product_idx on public.knowledge_documents(product_id);
create index knowledge_documents_author_idx on public.knowledge_documents(created_by);
create index knowledge_documents_status_updated_idx on public.knowledge_documents(status,updated_at desc);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values (
  'product-knowledge','product-knowledge',false,26214400,array[
    'application/pdf','application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png','image/jpeg'
  ]
);

create policy knowledge_files_read on storage.objects for select to authenticated using (
  bucket_id='product-knowledge' and (select private.current_role()) is not null and
  (owner_id=(select auth.uid())::text or exists(
    select 1 from public.knowledge_documents d where d.storage_object_id=storage.objects.id
  ))
);
create policy knowledge_files_upload on storage.objects for insert to authenticated with check (
  bucket_id='product-knowledge' and (select private.can_write()) and
  owner_id=(select auth.uid())::text and split_part(name,'/',1)=(select auth.uid())::text and
  name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|ppt|pptx|doc|docx|xls|xlsx|png|jpg|jpeg)$'
);
create policy knowledge_orphan_cleanup on storage.objects for delete to authenticated using (
  bucket_id='product-knowledge' and (select private.can_write()) and owner_id=(select auth.uid())::text and
  not exists(select 1 from public.knowledge_documents d where d.storage_object_id=storage.objects.id)
);
-- No UPDATE policy: uploaded objects cannot be replaced/upserted. Linked blobs cannot be deleted.
