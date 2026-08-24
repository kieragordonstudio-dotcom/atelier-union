import { Download, Plus, Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../../lib/api';
import { dateOnly, dateTime, KgdEmpty, KgdModal, KgdPage, KgdStatus, money } from '../components';

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string;
  created_at: string;
  last_appointment: string | null;
  next_appointment: string | null;
  visits: number;
  lifetime_spend: number;
  cancellations?: number;
  no_shows?: number;
  total_spend?: number;
};
type ClientAppointment = { id: string; starts_at: string; status: string; payment_status: string; total_pence: number; artist_name: string; services: string };

export function ClientsPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<{ client: Client; appointments: ClientAppointment[] } | null>(null);
  const [createOpen, setCreateOpen] = useState(params.get('action') === 'new');
  const [error, setError] = useState('');

  async function load() {
    try {
      const result = await apiFetch<{ clients: Client[] }>(`/api/admin/clients?q=${encodeURIComponent(query)}`);
      setClients(result.clients);
    } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Clients could not be loaded.'); }
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [query]);
  async function openClient(id: string) {
    try { setSelected(await apiFetch(`/api/admin/clients/${id}`)); } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Client could not be loaded.'); }
  }
  function close() { setSelected(null); setCreateOpen(false); setParams({}); }

  return <KgdPage eyebrow="RELATIONSHIPS" title="Clients" actions={<><a className="kgd-button" href="/api/admin/clients/export.csv"><Download size={16}/>Export CSV</a><button className="kgd-button is-primary" type="button" onClick={()=>setCreateOpen(true)}><Plus size={16}/>New client</button></>}>
    <div className="kgd-toolbar"><label className="kgd-search"><Search size={17}/><input aria-label="Search clients" placeholder="Search name, email or phone" value={query} onChange={(event)=>setQuery(event.target.value)}/></label><span className="kgd-count">{clients.length} clients</span></div>
    {error?<KgdStatus message={error} error/>:null}
    <section className="kgd-table-shell"><table className="kgd-table"><thead><tr><th>Client</th><th>Contact</th><th>Last appointment</th><th>Next appointment</th><th>Visits</th><th>Lifetime spend</th></tr></thead><tbody>{clients.map((client)=><tr key={client.id} onClick={()=>void openClient(client.id)} tabIndex={0} onKeyDown={(event)=>{if(event.key==='Enter')void openClient(client.id);}}><td><strong>{client.name}</strong></td><td><span>{client.email||'No email'}</span><small>{client.phone||'No phone'}</small></td><td>{client.last_appointment?dateOnly(client.last_appointment):'—'}</td><td>{client.next_appointment?dateOnly(client.next_appointment):'—'}</td><td>{client.visits}</td><td>{money(client.lifetime_spend)}</td></tr>)}</tbody></table>{!clients.length?<KgdEmpty>No clients match this search.</KgdEmpty>:null}</section>
    {createOpen?<ClientForm title="New client" onClose={close} onSaved={async()=>{close();await load();}}/>:null}
    {selected?<ClientProfile data={selected} onClose={close} onSaved={async()=>{close();await load();}}/>:null}
  </KgdPage>;
}

function ClientForm({title,onClose,onSaved,client}:{title:string;onClose:()=>void;onSaved:()=>void;client?:Client}){
  const [form,setForm]=useState({name:client?.name??'',email:client?.email??'',phone:client?.phone??'',notes:client?.notes??''}); const [message,setMessage]=useState('');
  async function submit(event:FormEvent){event.preventDefault();try{await apiFetch(client?`/api/admin/clients/${client.id}`:'/api/admin/clients',{method:client?'PATCH':'POST',body:JSON.stringify(form)});onSaved();}catch(error){setMessage(error instanceof ApiError?error.message:'Client could not be saved.');}}
  return <KgdModal title={title} onClose={onClose}><form className="kgd-form" onSubmit={submit}><label><span>Name</span><input value={form.name} onChange={(event)=>setForm({...form,name:event.target.value})} required/></label><label><span>Email</span><input type="email" value={form.email} onChange={(event)=>setForm({...form,email:event.target.value})}/></label><label><span>Phone</span><input value={form.phone} onChange={(event)=>setForm({...form,phone:event.target.value})}/></label><label><span>Notes</span><textarea value={form.notes} onChange={(event)=>setForm({...form,notes:event.target.value})}/></label>{message?<KgdStatus message={message} error/>:null}<div className="kgd-form-actions"><button className="kgd-button" type="button" onClick={onClose}>Close</button><button className="kgd-button is-primary" type="submit">Save client</button></div></form></KgdModal>;
}

function ClientProfile({data,onClose,onSaved}:{data:{client:Client;appointments:ClientAppointment[]};onClose:()=>void;onSaved:()=>void}){
  const [edit,setEdit]=useState(false); const [confirmDelete,setConfirmDelete]=useState(false); const [message,setMessage]=useState(''); const {client,appointments}=data;
  async function anonymize(){try{await apiFetch(`/api/admin/clients/${client.id}/anonymize`,{method:'POST'});onSaved();}catch(error){setMessage(error instanceof ApiError?error.message:'Client data could not be anonymised.');}}
  if(edit)return <ClientForm title={`Edit ${client.name}`} client={client} onClose={()=>setEdit(false)} onSaved={onSaved}/>;
  return <KgdModal title={client.name} onClose={onClose} wide><div className="kgd-detail-strip"><div><span>Completed visits</span><strong>{client.visits}</strong></div><div><span>Total spend</span><strong>{money(client.total_spend)}</strong></div><div><span>Cancellations / no-shows</span><strong>{client.cancellations??0} / {client.no_shows??0}</strong></div></div><div className="kgd-client-summary"><span>{client.email||'No email'}</span><span>{client.phone||'No phone'}</span><p>{client.notes||'No client notes.'}</p></div><div className="kgd-actions"><button className="kgd-button" type="button" onClick={()=>setEdit(true)}>Edit details</button><button className="kgd-button is-danger" type="button" onClick={()=>setConfirmDelete(true)}>GDPR anonymise</button></div>{confirmDelete?<div className="kgd-confirm"><p>This permanently removes the client’s personal details while retaining anonymised financial and appointment records.</p><button className="kgd-button is-danger" type="button" onClick={()=>void anonymize()}>Confirm anonymisation</button><button className="kgd-button" type="button" onClick={()=>setConfirmDelete(false)}>Keep client</button></div>:null}{message?<KgdStatus message={message} error/>:null}<section className="kgd-section"><header><h3>Booking history</h3></header>{appointments.length?<div className="kgd-list">{appointments.map((appointment)=><div className="kgd-list-row" key={appointment.id}><span><strong>{appointment.services}</strong><small>{dateTime(appointment.starts_at)} · {appointment.artist_name}</small></span><span className={`kgd-badge is-${appointment.status}`}>{appointment.status.replace('_',' ')}</span><strong>{money(appointment.total_pence)}</strong></div>)}</div>:<KgdEmpty>No booking history.</KgdEmpty>}</section></KgdModal>;
}
