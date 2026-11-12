// @vitest-environment happy-dom
import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const boundary=vi.hoisted(()=>({context:null as any}));
vi.mock('./store',()=>({useCRM:()=>boundary.context,friendlyError:(error:unknown)=>error instanceof Error?error.message:String(error)}));
import {ApprovalPage} from './ApprovalPage';
import {reportingLineError,hierarchyForest,type ReportingRelation} from './TeamHierarchy';
import {demoData,demoId} from './demo';
import {setLanguage} from './i18n';
import type {Activity,Profile} from './types';

const ids={director:demoId(301),admin:demoId(302),supervisor:demoId(303),owner:demoId(304),other:demoId(305),viewer:demoId(306),inactive:demoId(307)};
const person=(key:keyof typeof ids,role:Profile['role'],active=true):Profile=>({id:ids[key],full_name:key==='owner'?'Presentasi':'Fixture '+key,email:key+'@example.invalid',role,active,region:'UAT',skills:[]});
const people=[person('director','director'),person('admin','admin'),person('supervisor','product_specialist'),person('owner','application_specialist'),person('other','product_specialist'),person('viewer','viewer'),person('inactive','product_specialist',false)];
const line=(member:keyof typeof ids,supervisor:keyof typeof ids|null,n=1):ReportingRelation=>({id:demoId(500+n),member_id:ids[member],supervisor_id:supervisor?ids[supervisor]:null});
function request(owner:keyof typeof ids,title:string,id:number):Activity{return {id:demoId(id),title,type:'demo',account_id:null,product_id:null,opportunity_id:null,owner_id:ids[owner],start_at:'2026-11-13T02:00:00Z',end_at:'2026-11-13T03:00:00Z',timezone:'Asia/Jakarta',location:'Fixture site',objective:'Original objective remains unchanged',notes:'No patient data',priority:'medium',status:'submitted',report:'',outcome:'',follow_up_date:null,participant_ids:[],equipment_ids:[],submitted_at:'2026-11-12T01:00:00Z',approved_by:null,approved_at:null,reviewed_by:null,reviewed_at:null,approval_note:'',budget:1500000,actual_cost:0,attendance_count:0};}
const mineTitle='Own submitted request',directTitle='Direct report request',unrelatedTitle='Unrelated request';

beforeEach(()=>{
 setLanguage('id');vi.clearAllMocks();
 const data=demoData();data.profiles=people.map(value=>({...value}));data.reporting_lines=[line('owner','supervisor')];
 data.activities=[request('owner',directTitle,401),request('supervisor',mineTitle,402),request('other',unrelatedTitle,403),request('director','Director own request',404)];
 boundary.context={data,profile:data.profiles.find(value=>value.id===ids.supervisor),demo:true,notify:vi.fn(),refresh:vi.fn(async()=>{}),save:vi.fn(async(table:string,patch:any)=>{const before=boundary.context.data[table].find((value:any)=>value.id===patch.id);const result={...before,...patch,id:patch.id||demoId(599)};boundary.context.data[table]=before?boundary.context.data[table].map((value:any)=>value.id===result.id?result:value):[...boundary.context.data[table],result];return result;}),reviewActivity:vi.fn(async(id:string,decision:string,note:string)=>{const before=boundary.context.data.activities.find((value:Activity)=>value.id===id);const result={...before,status:decision,approval_note:note,reviewed_by:boundary.context.profile.id,reviewed_at:'2026-11-12T03:00:00Z'};boundary.context.data.activities=boundary.context.data.activities.map((value:Activity)=>value.id===id?result:value);return result;})};
});
afterEach(()=>{cleanup();setLanguage('id')});

describe('one-stage review queue',()=>{
 it('allows an assigned specialist supervisor but excludes own and unrelated requests',()=>{
  render(<ApprovalPage/>);
  expect(screen.getByText(directTitle)).toBeTruthy();
  expect(screen.queryByText(mineTitle)).toBeNull();expect(screen.queryByText(unrelatedTitle)).toBeNull();
 });
 it('does not give admins global review access; a directly assigned admin can review',()=>{
  boundary.context.profile=people.find(value=>value.id===ids.admin);const app=render(<ApprovalPage/>);
  expect(screen.queryByText(directTitle)).toBeNull();
  boundary.context.data.reporting_lines=[line('owner','admin')];app.rerender(<ApprovalPage/>);
  expect(screen.getByText(directTitle)).toBeTruthy();expect(screen.queryByText(unrelatedTitle)).toBeNull();
 });
 it('lets the Product Director review another member even when a supervisor is assigned, never their own',()=>{
  boundary.context.profile=people.find(value=>value.id===ids.director);render(<ApprovalPage/>);
  expect(screen.getByText(directTitle)).toBeTruthy();expect(screen.getByText(unrelatedTitle)).toBeTruthy();
  expect(screen.queryByText('Director own request')).toBeNull();
 });
 it('does not treat an ancestor as an additional approval stage',()=>{
  boundary.context.profile=people.find(value=>value.id===ids.other);
  boundary.context.data.reporting_lines=[line('owner','supervisor'),line('supervisor','other',2)];render(<ApprovalPage/>);
  expect(screen.queryByText(directTitle)).toBeNull();expect(screen.getByText(mineTitle)).toBeTruthy();
 });
 it('shows an own request without approve or reject actions and preserves the request data',async()=>{
  const user=userEvent.setup();render(<ApprovalPage/>);
  await user.selectOptions(screen.getByRole('combobox',{name:'Cakupan pengajuan'}),'mine');
  await user.click(screen.getByRole('button',{name:'Tinjau '+mineTitle}));
  const detail=within(await screen.findByRole('dialog'));
  expect(detail.getByText('Original objective remains unchanged')).toBeTruthy();
  expect(detail.queryByRole('button',{name:'Setujui pengajuan'})).toBeNull();expect(detail.queryByRole('button',{name:'Tolak pengajuan'})).toBeNull();
  expect(boundary.context.reviewActivity).not.toHaveBeenCalled();
 });
 it('retains a rejected RPC error and retries through reviewActivity without direct business edits',async()=>{
  const user=userEvent.setup();boundary.context.reviewActivity.mockRejectedValueOnce(new Error('Decision was not accepted by server'));render(<ApprovalPage/>);
  await user.click(screen.getByRole('button',{name:'Tinjau '+directTitle}));
  await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Setujui pengajuan'}));
  let dialog=within(screen.getByRole('dialog'));await user.type(dialog.getByLabelText('Catatan keputusan (opsional)'),'  Ready for demo  ');
  await user.click(dialog.getByRole('button',{name:'Konfirmasi persetujuan'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Decision was not accepted by server');
  expect(boundary.context.data.activities.find((value:Activity)=>value.id===demoId(401)).status).toBe('submitted');
  dialog=within(screen.getByRole('dialog'));await user.click(dialog.getByRole('button',{name:'Konfirmasi persetujuan'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  expect(boundary.context.reviewActivity).toHaveBeenLastCalledWith(demoId(401),'approved','Ready for demo');
  expect(boundary.context.save).not.toHaveBeenCalled();expect(boundary.context.refresh).not.toHaveBeenCalled();
 });
 it('requires a nonblank rejection reason and records the submitted note',async()=>{
  const user=userEvent.setup();render(<ApprovalPage/>);await user.click(screen.getByRole('button',{name:'Tinjau '+directTitle}));
  await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Tolak pengajuan'}));
  const dialog=within(screen.getByRole('dialog')),note=dialog.getByLabelText(/Alasan penolakan/);
  await user.type(note,'   ');await user.click(dialog.getByRole('button',{name:'Konfirmasi penolakan'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Alasan penolakan wajib diisi.');expect(boundary.context.reviewActivity).not.toHaveBeenCalled();
  await user.clear(note);await user.type(note,'Schedule needs revision');await user.click(dialog.getByRole('button',{name:'Konfirmasi penolakan'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(boundary.context.reviewActivity).toHaveBeenCalledWith(demoId(401),'rejected','Schedule needs revision');
 });
 it('does not invent timestamps for a legacy recorded approval',async()=>{
  const user=userEvent.setup();boundary.context.data.activities.push({...request('owner','Legacy recorded review',405),status:'approved',approved_by:ids.supervisor,approved_at:null,reviewed_at:null});render(<ApprovalPage/>);
  await user.selectOptions(screen.getByRole('combobox',{name:'Cakupan pengajuan'}),'history');
  expect(screen.getByText('Legacy recorded review')).toBeTruthy();expect(screen.getByText('Waktu keputusan belum tercatat')).toBeTruthy();
 });
});

describe('hierarchy editing and safe graph rules',()=>{
 it('rejects self, cycles, inactive and viewer relationships while allowing a director route',()=>{
  const graph=[line('owner','supervisor'),line('supervisor','director',2)];
  expect(reportingLineError(ids.owner,ids.owner,people,graph)).toMatch(/dirinya sendiri/);
  expect(reportingLineError(ids.director,ids.owner,people,graph)).toMatch(/siklus/);
  expect(reportingLineError(ids.owner,ids.inactive,people,graph)).toMatch(/aktif/);
  expect(reportingLineError(ids.owner,ids.viewer,people,graph)).toMatch(/viewer/);
  expect(reportingLineError(ids.viewer,ids.director,people,graph)).toMatch(/hak kerja/);
  expect(reportingLineError(ids.owner,null,people,graph)).toBe('');
 });
 it('can display a corrupt legacy cycle safely without infinite traversal',()=>{
  const tree=hierarchyForest(people,[line('owner','supervisor'),line('supervisor','owner',2)]);
  const nodes=tree.flatMap(root=>[root,...root.children,...root.children.flatMap(child=>child.children)]);
  expect(nodes.some(node=>node.cycle)).toBe(true);
 });
 it('shows hierarchy read-only to a specialist',()=>{
  render(<ApprovalPage initialTab="hierarchy"/>);
  expect(screen.getByRole('list',{name:'Pohon hierarki tim'})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Atur hubungan tim'})).toBeNull();expect(screen.queryByRole('button',{name:'Atur atasan'})).toBeNull();
 });
 it('lets a manager update the existing reporting line while preserving member identities',async()=>{
  const user=userEvent.setup();boundary.context.profile=people.find(value=>value.id===ids.director);render(<ApprovalPage initialTab="hierarchy"/>);
  await user.click(screen.getByRole('button',{name:'Tabel'}));
  const target=screen.getByText('Presentasi',{exact:true}).closest('tr')!;
  await user.click(within(target).getByRole('button',{name:'Atur atasan'}));
  const form=within(screen.getByRole('dialog'));await user.selectOptions(form.getByLabelText(/Atasan langsung/),ids.director);await user.click(form.getByRole('button',{name:'Simpan'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  expect(boundary.context.save).toHaveBeenCalledWith('reporting_lines',{id:demoId(501),member_id:ids.owner,supervisor_id:ids.director});
 });
});
