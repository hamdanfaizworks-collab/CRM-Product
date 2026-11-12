import {useState} from 'react';
import {GitBranch,Layers3,List,LoaderCircle,Plus,UserRound} from 'lucide-react';
import {tr,useLanguage,getLocale} from './i18n';
import {useCRM,friendlyError} from './store';
import {Badge,Dialog,Empty,SearchToolbar} from './ui';
import {ROLE_LABEL,type Profile} from './types';
import {isManager} from './rules';

export interface ReportingRelation {id:string;member_id:string;supervisor_id:string|null}
export interface HierarchyNode {person:Profile;children:HierarchyNode[];cycle?:boolean}
const DIRECTOR_ROUTE='__director_route__';
export const eligibleHierarchyMember=(person:Profile)=>person.active&&person.role!=='viewer';

// Validate the proposed edge against the complete graph, including hidden/inactive ancestors.
export function reportingLineError(memberId:string,supervisorId:string|null,profiles:Profile[],relations:ReportingRelation[]):string{
 const member=profiles.find(person=>person.id===memberId);
 if(!member||!eligibleHierarchyMember(member))return 'Pilih anggota aktif yang memiliki hak kerja.';
 if(!supervisorId)return '';
 if(memberId===supervisorId)return 'Anggota tidak dapat menjadi atasan dirinya sendiri.';
 const supervisor=profiles.find(person=>person.id===supervisorId);
 if(!supervisor||!eligibleHierarchyMember(supervisor))return 'Atasan harus anggota aktif selain viewer.';
 const edges=new Map(relations.map(line=>[line.member_id,line.supervisor_id]));
 edges.set(memberId,supervisorId);
 const visited=new Set<string>();let current:string|null=supervisorId;
 while(current){
  if(current===memberId)return 'Hubungan ini membuat siklus dalam hierarki tim.';
  if(visited.has(current))return 'Jalur atasan yang dipilih mengandung siklus. Perbaiki hierarki terlebih dahulu.';
  visited.add(current);current=edges.get(current)||null;
 }
 return '';
}

export function hierarchyForest(profiles:Profile[],relations:ReportingRelation[]):HierarchyNode[]{
 const people=profiles.filter(eligibleHierarchyMember).slice().sort((a,b)=>a.full_name.localeCompare(b.full_name,getLocale()));
 const byId=new Map(people.map(person=>[person.id,person]));
 const parent=new Map(relations.filter(line=>byId.has(line.member_id)&&!!line.supervisor_id&&byId.has(line.supervisor_id)).map(line=>[line.member_id,line.supervisor_id!]));
 const children=new Map<string,Profile[]>();
 for(const person of people){const id=parent.get(person.id);if(id)children.set(id,[...children.get(id)||[],person]);}
 const seen=new Set<string>();
 const walk=(person:Profile,path:Set<string>):HierarchyNode=>{
  if(path.has(person.id))return {person,children:[],cycle:true};
  seen.add(person.id);const next=new Set(path).add(person.id);
  return {person,children:(children.get(person.id)||[]).map(child=>walk(child,next))};
 };
 const roots=people.filter(person=>!parent.has(person.id)).map(person=>walk(person,new Set()));
 for(const person of people)if(!seen.has(person.id))roots.push(walk(person,new Set()));
 return roots;
}

function TreeBranch({node}:{node:HierarchyNode}){
 return <li><div className="hierarchy-node"><span className="hierarchy-avatar"><UserRound size={16}/></span><div><strong>{node.person.full_name}</strong><small>{ROLE_LABEL[node.person.role]}</small></div>{node.cycle&&<Badge value="rejected" label={tr('Siklus perlu diperbaiki')}/>}</div>{node.children.length>0&&<ul>{node.children.map(child=><TreeBranch node={child} key={child.person.id}/>)}</ul>}</li>;
}

export function TeamHierarchy(){
 useLanguage();
 const {data,profile,save}=useCRM();
 const relations:ReportingRelation[]=data.reporting_lines||[];
 const people=data.profiles;
 const writable=isManager(profile.role);
 const [search,setSearch]=useState(''),[view,setView]=useState<'tree'|'table'>('tree'),[edit,setEdit]=useState<Partial<ReportingRelation>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const eligible=people.filter(eligibleHierarchyMember).slice().sort((a,b)=>a.full_name.localeCompare(b.full_name,getLocale()));
 const rows=eligible.filter(person=>[person.full_name,person.region,people.find(other=>other.id===relations.find(line=>line.member_id===person.id)?.supervisor_id)?.full_name].some(value=>String(value||'').toLocaleLowerCase(getLocale()).includes(search.toLocaleLowerCase(getLocale()))));
 const forest=hierarchyForest(people,relations);
 const beginEdit=(memberId?:string)=>{const existing=relations.find(line=>line.member_id===memberId);setError('');setEdit(existing||{member_id:memberId||'',supervisor_id:null});};
 const closeEditor=()=>{if(!busy)setEdit(null);};
 async function saveLine(event:React.FormEvent){
  event.preventDefault();if(!edit)return;setError('');
  const memberId=edit.member_id||'',supervisor=edit.supervisor_id||null;
  const invalid=reportingLineError(memberId,supervisor,people,relations);if(invalid){setError(tr(invalid));return;}
  const existing=relations.find(line=>line.member_id===memberId);setBusy(true);
  try{await save('reporting_lines',{...(existing?{id:existing.id}:{}),member_id:memberId,supervisor_id:supervisor});setEdit(null);}
  catch(cause){setError(friendlyError(cause));}
  finally{setBusy(false);}
 }
 return <section className="hierarchy-module">
  <div className="approval-section-heading"><div><h2>{tr('Hierarki tim')}</h2><p className="muted">{tr('Tentukan satu atasan langsung untuk setiap anggota tim.')}</p></div>{writable&&<button className="btn primary" onClick={()=>beginEdit()}><Plus size={16}/>{tr('Atur hubungan tim')}</button>}</div>
  <div className="info-banner">{tr('Persetujuan hanya satu tahap: atasan langsung atau Product Director. Admin tidak memiliki hak persetujuan global dan harus ditetapkan sebagai atasan untuk meninjau pengajuan.')}</div>
  <SearchToolbar search={search} setSearch={setSearch} placeholder="Cari anggota atau atasan…"><div className="segmented" aria-label={tr('Tampilan hierarki')}><button type="button" className={view==='tree'?'selected':''} aria-pressed={view==='tree'} onClick={()=>setView('tree')}><GitBranch size={15}/>{tr('Pohon')}</button><button type="button" className={view==='table'?'selected':''} aria-pressed={view==='table'} onClick={()=>setView('table')}><List size={15}/>{tr('Tabel')}</button></div></SearchToolbar>
  {!eligible.length?<Empty title="Belum ada anggota yang dapat ditetapkan" description="Tambahkan anggota aktif selain viewer melalui pengelolaan tim."/>:<>
   {view==='tree'&&!search&&<div className="card hierarchy-tree-panel"><div className="hierarchy-tree-label"><Layers3 size={16}/><span>{tr('Hubungan pelaporan langsung')}</span><Badge value="active" label={tr('{{value0}} anggota aktif',{value0:eligible.length})}/></div><ul className="hierarchy-tree" aria-label={tr('Pohon hierarki tim')}>{forest.map(node=><TreeBranch key={node.person.id} node={node}/>)}</ul><p className="muted hierarchy-footnote">{tr('Anggota tanpa atasan langsung tampil sebagai akar. Product Director tersedia sebagai peninjau pengajuan anggota lain.')}</p></div>}
   {(view==='table'||!!search)&&<div className="card table-wrap"><table className="data-table"><thead><tr><th>{tr('Anggota')}</th><th>{tr('Peran')}</th><th>{tr('Atasan langsung')}</th><th>{tr('Jalur persetujuan')}</th>{writable&&<th>{tr('Aksi')}</th>}</tr></thead><tbody>{rows.map(person=>{const relation=relations.find(line=>line.member_id===person.id);const supervisor=people.find(other=>other.id===relation?.supervisor_id);return <tr key={person.id}><td><strong>{person.full_name}</strong><small className="muted">{person.region||'—'}</small></td><td>{ROLE_LABEL[person.role]}</td><td>{supervisor?<><span>{supervisor.full_name}</span>{!eligibleHierarchyMember(supervisor)&&<small className="overdue-text">{tr('Atasan tidak aktif atau tidak memenuhi syarat')}</small>}</>:<span className="muted">{tr('Tidak ditetapkan')}</span>}</td><td>{supervisor&&eligibleHierarchyMember(supervisor)?tr('Atasan langsung / Product Director'):tr('Product Director')}</td>{writable&&<td><button className="btn secondary small" onClick={()=>beginEdit(person.id)}>{tr('Atur atasan')}</button></td>}</tr>})}</tbody></table>{!rows.length&&<Empty title="Anggota tidak ditemukan" description="Coba kata kunci lain."/>}</div>}
   {view==='tree'&&!search&&writable&&<button className="btn secondary hierarchy-table-action" onClick={()=>setView('table')}>{tr('Kelola hubungan melalui tabel')}</button>}
  </>}
  {!writable&&<p className="muted hierarchy-footnote">{tr('Hanya Product Director dan Admin yang dapat mengubah hierarki tim.')}</p>}
  {edit&&<Dialog title={tr('Atur atasan langsung')} onClose={closeEditor}><form onSubmit={event=>void saveLine(event)}><div className="dialog-body"><div className="form-grid"><label className="field"><span>{tr('Anggota tim')} <b className="required">*</b></span><select aria-label={tr('Anggota tim')} required disabled={!!edit.id||busy} value={edit.member_id||''} onChange={event=>setEdit({...edit,member_id:event.target.value,supervisor_id:edit.supervisor_id===event.target.value?null:edit.supervisor_id})}><option value="">{tr('Pilih…')}</option>{eligible.map(person=><option value={person.id} key={person.id}>{person.full_name}</option>)}</select>{edit.id&&<small>{tr('Anggota pada hubungan yang sudah ada tidak dapat diganti.')}</small>}</label><label className="field"><span>{tr('Atasan langsung')}</span><select aria-label={tr('Atasan langsung')} disabled={busy} value={edit.supervisor_id||DIRECTOR_ROUTE} onChange={event=>setEdit({...edit,supervisor_id:event.target.value===DIRECTOR_ROUTE?null:event.target.value})}><option value={DIRECTOR_ROUTE}>{tr('Tanpa atasan langsung / Product Director')}</option>{eligible.filter(person=>person.id!==edit.member_id).map(person=><option key={person.id} value={person.id}>{person.full_name}</option>)}</select></label></div><p className="muted hierarchy-footnote">{tr('Satu atasan langsung. Product Director tetap dapat meninjau pengajuan anggota lain.')}</p>{error&&<div className="form-error" role="alert">{error}</div>}</div><div className="dialog-footer"><button type="button" className="btn secondary" disabled={busy} onClick={closeEditor}>{tr('Batal')}</button><button className="btn primary" disabled={busy}>{busy&&<LoaderCircle size={16} className="spin"/>}{tr('Simpan')}</button></div></form></Dialog>}
 </section>;
}
