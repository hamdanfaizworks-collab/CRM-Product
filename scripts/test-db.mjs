import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const db = new PGlite();
await db.exec(`
 create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text default auth.uid()::text);
 alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated;
 grant select,insert,update,delete on storage.objects to authenticated;
`);
const migrations = (await fs.readdir(path.join(root,'supabase/migrations'))).filter(x=>x.endsWith('.sql')).sort();
for (const file of migrations) {
  await db.exec(await fs.readFile(path.join(root,'supabase/migrations',file),'utf8'));
  console.log('MIGRATION OK',file);
}
await db.exec(await fs.readFile(path.join(root,'supabase/seed.sql'),'utf8'));
const seeded=await db.query('select count(*)::int n from public.products');
if(seeded.rows[0].n !== 87) throw new Error('Expected 87 verified catalogue products');
console.log('SEED OK',seeded.rows[0].n,'verified catalogue products');
const ids = {
 director:'00000000-0000-4000-8000-000000000001', ps:'00000000-0000-4000-8000-000000000002',
 as:'00000000-0000-4000-8000-000000000003', viewer:'00000000-0000-4000-8000-000000000004', inactive:'00000000-0000-4000-8000-000000000005', outsider:'00000000-0000-4000-8000-000000000006',
 account:'10000000-0000-4000-8000-000000000001', product:'20000000-0000-4000-8000-000000000001', equipment:'30000000-0000-4000-8000-000000000001', activity:'40000000-0000-4000-8000-000000000001',
};
for(const [name,id] of Object.entries(ids).slice(0,6)) await db.query('insert into auth.users(id,email) values($1,$2)',[id,`${name}@example.invalid`]);
for(const role of ['director','ps','as','viewer','inactive']) await db.query('insert into public.profiles(id,full_name,email,role,active) values($1,$2,$3,$4,$5)',[ids[role],role,`${role}@example.invalid`,({ps:'product_specialist',as:'application_specialist',inactive:'product_specialist'})[role]||role,role!=='inactive']);
const actor=async(name)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[name?ids[name]:'']);await db.exec(`set role ${name?'authenticated':'anon'}`);};
let passes=0;
async function ok(name,fn){await fn(); passes++; console.log('PASS',name);}
async function rejects(name,sql,expected){try{await db.exec(sql);}catch(e){if(!expected || e.message.includes(expected)){passes++; console.log('PASS',name);return;}throw e;}throw new Error('Expected rejection: '+name);}
async function eq(sql,value){const r=await db.query(sql);if(r.rows[0].v!==value)throw new Error(sql+' expected '+value+' got '+JSON.stringify(r.rows));}
await actor(); await rejects('anonymous denied','select * from public.products','permission denied');
await actor('outsider');await ok('unregistered user sees no data',()=>eq('select count(*)::int v from public.products',0));
await actor('inactive');await ok('inactive membership sees no data',()=>eq('select count(*)::int v from public.profiles',0));
await actor('viewer'); await rejects('viewer cannot create account',`insert into public.accounts(name,owner_id) values('Forbidden','${ids.viewer}')`,'row-level security');
await actor('ps'); await rejects('specialist cannot self escalate',`update public.profiles set role='admin' where id='${ids.ps}'`,'Hanya nama');
await rejects('specialist cannot replace own email',`update public.profiles set email='attacker@example.invalid' where id='${ids.ps}'`,'Hanya nama');
await ok('specialist can update own name',()=>db.exec(`update public.profiles set full_name='PS updated' where id='${ids.ps}'`));
await actor('director');await rejects('last manager cannot deactivate',`update public.profiles set active=false where id='${ids.director}'`,'terakhir');
await db.exec(`insert into public.products(id,name,brand,category) values('${ids.product}','Verified product','TTM','USG');
 insert into public.equipment(id,product_id,code,name) values('${ids.equipment}','${ids.product}','TEST-001','Demo unit');
 insert into public.accounts(id,name,owner_id) values('${ids.account}','Test hospital','${ids.ps}');`);
await actor('ps');await ok('specialist can write owned CRM',()=>db.exec(`insert into public.contacts(account_id,full_name) values('${ids.account}','Business PIC')`));
await actor('as');await ok('specialist cannot overwrite another account',async()=>{await db.exec(`update public.accounts set name='Forbidden change' where id='${ids.account}'`);await eq(`select name v from public.accounts where id='${ids.account}'`,'Test hospital');});
await actor('ps');
await rejects('negative opportunity rejected',`insert into public.opportunities(account_id,title,owner_id,value) values('${ids.account}','Invalid','${ids.ps}',-1)`,'check constraint');
await rejects('lost reason required',`insert into public.opportunities(account_id,title,owner_id,stage) values('${ids.account}','Invalid lost','${ids.ps}','lost')`,'check constraint');
const make=(id,start,end,person=ids.ps,equipment=ids.equipment,status='submitted')=>`insert into public.activities(id,title,type,account_id,owner_id,start_at,end_at,status,equipment_ids) values('${id}','Demo','demo','${ids.account}','${person}','${start}','${end}','${status}',array['${equipment}']::uuid[])`;
await rejects('invalid interval rejected',make(ids.activity,'2026-11-15 10:00+07','2026-11-15 09:00+07'),'activities_valid_interval');
await ok('submitted reserves resources',()=>db.exec(make(ids.activity,'2026-11-15 09:00+07','2026-11-15 10:00+07')));
await rejects('double booking rejected',make('40000000-0000-4000-8000-000000000002','2026-11-15 09:30+07','2026-11-15 11:00+07'),'Jadwal bentrok');
await ok('adjacent booking accepted',()=>db.exec(make('40000000-0000-4000-8000-000000000003','2026-11-15 10:00+07','2026-11-15 11:00+07')));
await rejects('specialist cannot approve',`update public.activities set status='approved' where id='${ids.activity}'`,'Persetujuan');
await rejects('cannot skip workflow',`update public.activities set status='completed',report='Valid report text',outcome='Success' where id='${ids.activity}'`,'status');
await actor('director');await ok('director approval records actor',async()=>{await db.exec(`update public.activities set status='approved' where id='${ids.activity}'`);await eq(`select approved_by::text v from public.activities where id='${ids.activity}'`,ids.director);});
await actor('ps');await ok('rescheduling requires approval again',async()=>{await db.exec(`update public.activities set start_at='2026-11-15 08:00+07',end_at='2026-11-15 09:00+07' where id='${ids.activity}'`);await eq(`select status v from public.activities where id='${ids.activity}'`,'submitted');});
await actor('director');await db.exec(`update public.activities set status='approved' where id='${ids.activity}'`);
await actor('ps');await db.exec(`update public.activities set status='in_progress' where id='${ids.activity}'`);
await ok('approver remains server controlled',async()=>{await db.exec(`update public.activities set approved_by='${ids.ps}' where id='${ids.activity}'`);await eq(`select approved_by::text v from public.activities where id='${ids.activity}'`,ids.director);});
await rejects('completion needs report',`update public.activities set status='completed' where id='${ids.activity}'`,'activities_report_required');
await ok('valid report completes activity',()=>db.exec(`update public.activities set status='completed',report='Kegiatan berjalan sesuai rencana; feedback dan tindak lanjut dicatat.',outcome='Tujuan tercapai' where id='${ids.activity}'`));
await rejects('cancel reason required',`update public.activities set status='cancelled' where id='40000000-0000-4000-8000-000000000003'`,'activities_reason_required');
await ok('cancellation releases reservation',async()=>{await db.exec(`update public.activities set status='cancelled',approval_note='Reschedule requested' where id='40000000-0000-4000-8000-000000000003'`);await db.exec(make('40000000-0000-4000-8000-000000000004','2026-11-15 10:00+07','2026-11-15 11:00+07'));});
await actor('viewer');await rejects('viewer cannot modify activities',`insert into public.activities(title,type,owner_id,start_at,end_at) values('Forbidden','internal','${ids.viewer}',now(),now()+interval '1 hour')`);
await actor('ps');await rejects('audit rows immutable','insert into public.audit_logs(entity_type,entity_id,action) values(\'fake\',\'fake\',\'fake\')','permission denied');
await rejects('specialist cannot edit catalogue',`insert into public.products(name) values('Unauthorised model')`,'row-level security');
await actor('viewer');await ok('viewer can read shared catalogue',async()=>{const r=await db.query('select count(*)::int v from public.products');if(r.rows[0].v !== 88)throw new Error('Shared catalogue inaccessible');});
await rejects('viewer cannot upload evidence',`insert into storage.objects(bucket_id,name) values('activity-evidence','${ids.activity}/fake.pdf')`,'row-level security');
await actor('ps');await ok('activity owner can upload private evidence',()=>db.exec(`insert into storage.objects(bucket_id,name) values('activity-evidence','${ids.activity}/test.pdf')`));
await ok('owner can attach existing object',()=>db.exec(`insert into public.activity_attachments(activity_id,file_name,storage_path,mime_type,size_bytes) values('${ids.activity}','test.pdf','${ids.activity}/test.pdf','application/pdf',100)`));
await rejects('metadata cannot claim missing object',`insert into public.activity_attachments(activity_id,file_name,storage_path,mime_type,size_bytes) values('${ids.activity}','missing.pdf','${ids.activity}/missing.pdf','application/pdf',100)`,'row-level security');
await rejects('metadata path cannot point to another activity',`insert into public.activity_attachments(activity_id,file_name,storage_path,mime_type,size_bytes) values('40000000-0000-4000-8000-000000000004','test.pdf','${ids.activity}/test.pdf','application/pdf',100)`,'attachment_path_matches_activity');
await actor('director');await db.exec(`insert into storage.objects(bucket_id,name) values('activity-evidence','${ids.activity}/director-proof.pdf')`);
await actor('ps');await ok('participant cannot delete another uploader evidence',async()=>{await db.exec(`delete from storage.objects where name='${ids.activity}/director-proof.pdf'`);await eq(`select count(*)::int v from storage.objects where name='${ids.activity}/director-proof.pdf'`,1);});
await rejects('metadata cannot claim another uploader object',`insert into public.activity_attachments(activity_id,file_name,storage_path,mime_type,size_bytes) values('${ids.activity}','director-proof.pdf','${ids.activity}/director-proof.pdf','application/pdf',100)`,'row-level security');
await ok('uploader can remove own orphan object',async()=>{await db.exec(`insert into storage.objects(bucket_id,name) values('activity-evidence','${ids.activity}/orphan.pdf');delete from storage.objects where name='${ids.activity}/orphan.pdf'`);await eq(`select count(*)::int v from storage.objects where name='${ids.activity}/orphan.pdf'`,0);});
await rejects('active opportunity needs next action',`insert into public.opportunities(account_id,title,owner_id) values('${ids.account}','No followup','${ids.ps}')`,'opportunities_active_next_step');
await db.exec(`insert into public.activities(id,title,type,owner_id,start_at,end_at,status,participant_ids) values
 ('40000000-0000-4000-8000-000000000005','Historical','internal','${ids.ps}','2026-11-17 09:00+07','2026-11-17 10:00+07','submitted',array['${ids.as}']::uuid[]),
 ('40000000-0000-4000-8000-000000000006','Cancel later','internal','${ids.ps}','2026-11-18 09:00+07','2026-11-18 10:00+07','submitted',array['${ids.as}']::uuid[]);`);
await actor('director');await db.exec(`update public.activities set status='approved' where id='40000000-0000-4000-8000-000000000005'`);
await actor('ps');await db.exec(`update public.activities set status='in_progress' where id='40000000-0000-4000-8000-000000000005';update public.activities set status='completed',report='Valid historical report with feedback and next steps',outcome='Done' where id='40000000-0000-4000-8000-000000000005'`);
await actor('director');await db.exec(`update public.profiles set active=false where id='${ids.as}'`);
await actor('ps');await ok('completed report editable after participant deactivation',()=>db.exec(`update public.activities set report='Updated historical report after inactive participant' where id='40000000-0000-4000-8000-000000000005'`));
await ok('cancel releases booking with historical inactive participant',()=>db.exec(`update public.activities set status='cancelled',approval_note='Team assignment changed' where id='40000000-0000-4000-8000-000000000006'`));
await rejects('new assignment cannot include inactive participant',`insert into public.activities(title,type,owner_id,start_at,end_at,participant_ids) values('No inactive','internal','${ids.ps}','2026-11-20 09:00+07','2026-11-20 10:00+07',array['${ids.as}']::uuid[])`,'anggota aktif');
await actor('director');await db.exec(`insert into public.accounts(id,name,owner_id) values('10000000-0000-4000-8000-000000000002','Other hospital','${ids.ps}');insert into public.opportunities(id,account_id,title,owner_id,next_step) values('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Different customer','${ids.ps}','Follow up')`);
await actor('ps');await rejects('task cannot mismatch account and opportunity',`insert into public.tasks(title,due_date,assigned_to,account_id,opportunity_id) values('Mismatch','2026-11-20','${ids.ps}','${ids.account}','50000000-0000-4000-8000-000000000001')`,'tidak sesuai');
await ok('task completion records actual operator',async()=>{await db.exec(`insert into public.tasks(id,title,due_date,assigned_to,account_id) values('60000000-0000-4000-8000-000000000001','Follow up','2026-11-20','${ids.ps}','${ids.account}');update public.tasks set status='done',completed_by='${ids.director}' where id='60000000-0000-4000-8000-000000000001'`);await eq("select completed_by::text v from public.tasks where id='60000000-0000-4000-8000-000000000001'",ids.ps);});
await actor('director');await ok('audits record changes',async()=>{const r=await db.query('select count(*)::int v from public.audit_logs');if(r.rows[0].v<8)throw new Error('Audit missing');});
await db.exec('reset role');
await ok('all public tables enable RLS',()=>eq("select count(*)::int v from pg_tables where schemaname='public' and not rowsecurity",0));
console.log(JSON.stringify({result:'PASS',checks:passes,limitation:'PGlite verifies SQL and sequential RLS/business rules; hosted Supabase integration and parallel network race require target access.'}));
await db.close();
