-- Reject whitespace-only reasons, including tabs and line breaks, in RPC and direct UPDATE.
create or replace function private.guard_activity() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  actor_role text:=private.current_role(); schedule_changed boolean:=false;
  can_edit boolean; review_transition boolean:=false; review_authorised boolean:=false;
begin
  if auth.uid() is null or actor_role is null or actor_role='viewer' then
    raise exception 'Anggota aktif dengan hak tulis diperlukan.' using errcode='42501';
  end if;
  -- Preserve the existing cross-resource booking lock and interval checks.
  perform pg_advisory_xact_lock(884202);
  if TG_OP='INSERT' then
    if new.status not in ('draft','submitted') then
      raise exception 'Kegiatan baru harus draft atau submitted.' using errcode='23514';
    end if;
    if new.approved_by is not null or new.approved_at is not null or new.reviewed_by is not null or new.reviewed_at is not null then
      raise exception 'Pelaku dan waktu keputusan ditetapkan oleh server.' using errcode='42501';
    end if;
    new.approved_by:=null; new.approved_at:=null; new.reviewed_by:=null; new.reviewed_at:=null;
  else
    if (new.approved_by,new.approved_at,new.reviewed_by,new.reviewed_at) is distinct from
       (old.approved_by,old.approved_at,old.reviewed_by,old.reviewed_at) then
      raise exception 'Pelaku dan waktu keputusan ditetapkan oleh server.' using errcode='42501';
    end if;
    can_edit:=actor_role in ('director','admin') or old.owner_id=auth.uid() or auth.uid()=any(old.participant_ids);
    review_transition:=new.status is distinct from old.status and new.status in ('approved','rejected');
    if not can_edit and not review_transition then
      raise exception 'Atasan hanya dapat memberikan keputusan untuk kegiatan ini.' using errcode='42501';
    end if;
    if review_transition then
      if old.status<>'submitted' then
        raise exception 'Kegiatan sudah berubah atau tidak lagi menunggu persetujuan.' using errcode='23514';
      end if;
      -- Serialize against hierarchy changes and keep the active actor stable until commit.
      perform pg_advisory_xact_lock(884203);
      -- This fresh SPI query runs after the hierarchy lock; do not rely on a stale RLS snapshot.
      select p.role, p.id<>old.owner_id and (p.role='director' or exists(
        select 1 from public.reporting_lines r where r.member_id=old.owner_id and r.supervisor_id=p.id
      )) into actor_role,review_authorised
      from public.profiles p where p.id=auth.uid() and p.active
        and p.role in ('director','admin','product_specialist','application_specialist') for share of p;
      if not found or not review_authorised then
        raise exception 'Persetujuan hanya untuk atasan langsung atau Product Director, bukan pemilik kegiatan.' using errcode='42501';
      end if;
      if (to_jsonb(new)-array['status','approval_note','updated_at']) is distinct from
         (to_jsonb(old)-array['status','approval_note','updated_at']) then
        raise exception 'Keputusan persetujuan tidak boleh disertai perubahan data kegiatan.' using errcode='23514';
      end if;
      new.approval_note:=regexp_replace(coalesce(new.approval_note,''),'^[[:space:]]+|[[:space:]]+$','','g');
      if length(new.approval_note)>4000 then
        raise exception 'Catatan keputusan maksimal 4000 karakter.' using errcode='23514';
      end if;
      if new.status='rejected' and new.approval_note='' then
        raise exception 'Alasan penolakan wajib diisi.' using errcode='23514';
      end if;
    end if;
    if new.owner_id<>old.owner_id and actor_role not in ('director','admin') then
      raise exception 'Hanya director/admin dapat mengganti koordinator.' using errcode='42501';
    end if;
    schedule_changed:=(new.start_at,new.end_at,new.owner_id,new.participant_ids,new.equipment_ids) is distinct from
                       (old.start_at,old.end_at,old.owner_id,old.participant_ids,old.equipment_ids);
    if old.status='completed' and (schedule_changed or new.status<>'completed') then
      raise exception 'Jadwal kegiatan selesai tidak dapat diubah.' using errcode='23514';
    end if;
    if schedule_changed and old.status in ('approved','in_progress') then
      new.status:='submitted'; new.approval_note:='Jadwal/penugasan berubah; perlu persetujuan ulang.';
    elsif new.status<>old.status then
      if not ((old.status='draft' and new.status in ('submitted','cancelled')) or
        (old.status='submitted' and new.status in ('approved','rejected','cancelled')) or
        (old.status='rejected' and new.status in ('draft','submitted','cancelled')) or
        (old.status='approved' and new.status in ('in_progress','cancelled')) or
        (old.status='in_progress' and new.status in ('completed','cancelled'))) then
        raise exception 'Perubahan status kegiatan tidak diizinkan.' using errcode='23514';
      end if;
    end if;
  end if;

  if TG_OP='UPDATE' then new.submitted_at:=old.submitted_at; end if;
  if new.status='submitted' and (TG_OP='INSERT' or old.status<>'submitted' or schedule_changed) then
    new.submitted_at:=now();
    if not schedule_changed then new.approval_note:=''; end if;
    new.approved_by:=null; new.approved_at:=null; new.reviewed_by:=null; new.reviewed_at:=null;
  elsif schedule_changed then
    new.approved_by:=null; new.approved_at:=null; new.reviewed_by:=null; new.reviewed_at:=null;
  end if;
  if review_transition then
    new.reviewed_by:=auth.uid(); new.reviewed_at:=now();
    if new.status='approved' then new.approved_by:=auth.uid(); new.approved_at:=new.reviewed_at;
    else new.approved_by:=null; new.approved_at:=null; end if;
  end if;
  if (TG_OP='INSERT' or schedule_changed or (new.status in ('submitted','approved','in_progress') and old.status is distinct from new.status)) and
     (not exists(select 1 from public.profiles p where p.id=new.owner_id and p.active) or
      exists(select 1 from unnest(new.participant_ids) u(id) left join public.profiles p on p.id=u.id where p.id is null or not p.active)) then
    raise exception 'Koordinator/peserta harus anggota aktif.' using errcode='23514';
  end if;
  if cardinality(new.participant_ids)<>(select count(distinct x) from unnest(new.participant_ids) x) or
     cardinality(new.equipment_ids)<>(select count(distinct x) from unnest(new.equipment_ids) x) then
    raise exception 'Peserta atau unit duplikat.' using errcode='23514';
  end if;
  if exists(select 1 from unnest(new.equipment_ids) u(id) left join public.equipment e on e.id=u.id where e.id is null) then
    raise exception 'Unit demo tidak ditemukan.' using errcode='23503';
  end if;
  if new.opportunity_id is not null and not exists(select 1 from public.opportunities o where o.id=new.opportunity_id
      and o.account_id is not distinct from new.account_id and (new.product_id is null or o.product_id is not distinct from new.product_id)) then
    raise exception 'Peluang tidak sesuai pelanggan/produk kegiatan.' using errcode='23514';
  end if;
  if new.status in ('submitted','approved','in_progress') then
    if exists(select 1 from public.equipment e where e.id=any(new.equipment_ids) and e.status<>'available') then
      raise exception 'Unit demo tidak tersedia/maintenance.' using errcode='23514';
    end if;
    if exists(select 1 from public.activities a where a.id<>new.id and a.status in ('submitted','approved','in_progress')
      and a.start_at<new.end_at and a.end_at>new.start_at
      and ((array_append(a.participant_ids,a.owner_id)&&array_append(new.participant_ids,new.owner_id)) or a.equipment_ids&&new.equipment_ids)) then
      raise exception 'Jadwal bentrok: personel atau unit demo telah dipesan.' using errcode='23P01';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_activity() from public,anon,authenticated;

create or replace function public.review_activity(p_activity_id uuid,p_decision text,p_note text default '')
returns public.activities language plpgsql security invoker set search_path='' as $$
declare activity public.activities; note text:=regexp_replace(coalesce(p_note,''),'^[[:space:]]+|[[:space:]]+$','','g');
begin
  if auth.uid() is null or not private.can_write() then
    raise exception 'Anggota aktif dengan hak tulis diperlukan.' using errcode='42501';
  end if;
  if p_decision is null or p_decision not in ('approved','rejected') then
    raise exception 'Keputusan harus approved atau rejected.' using errcode='22023';
  end if;
  if length(note)>4000 then raise exception 'Catatan keputusan maksimal 4000 karakter.' using errcode='23514'; end if;
  if p_decision='rejected' and note='' then raise exception 'Alasan penolakan wajib diisi.' using errcode='23514'; end if;
  select * into activity from public.activities where id=p_activity_id for update;
  if not found then raise exception 'Kegiatan tidak ditemukan atau tidak dapat ditinjau.' using errcode='P0002'; end if;
  if activity.status<>'submitted' then
    raise exception 'Kegiatan sudah berubah atau tidak lagi menunggu persetujuan.' using errcode='23514';
  end if;
  if not private.can_review_activity(activity.owner_id) then
    raise exception 'Persetujuan hanya untuk atasan langsung atau Product Director, bukan pemilik kegiatan.' using errcode='42501';
  end if;
  update public.activities set status=p_decision,approval_note=note where id=p_activity_id returning * into activity;
  if not found then raise exception 'Kegiatan tidak ditemukan atau tidak dapat ditinjau.' using errcode='P0002'; end if;
  return activity;
end $$;
revoke all on function public.review_activity(uuid,text,text) from public,anon;
grant execute on function public.review_activity(uuid,text,text) to authenticated;
