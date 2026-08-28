import { Ban, CalendarPlus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../../lib/api';
import { dateTime, KgdEmpty, KgdModal, KgdPage, KgdStatus, money } from '../components';
import { fromSalonInput, SALON_TIMEZONE, salonDateKey, salonDateTime, toSalonInput } from '../time';

type Artist = { id: string; slug: string; name: string; active: boolean };
type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  total_pence: number;
  deposit_pence: number;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'unpaid' | 'deposit_recorded' | 'paid' | 'refunded';
  customer_note: string;
  internal_notes: string;
  booking_source: string;
  client_id: string;
  client_name: string;
  email: string;
  phone: string;
  artist_id: string;
  artist_name: string;
  services: Array<{ name: string; slug: string; type: string; durationMinutes: number; pricePence: number }>;
};
type TimeOff = { id: string; artist_id: string; artist_name: string; type: string; starts_at: string; ends_at: string; reason: string };
type WorkingHour = { artist_id: string; artist_name: string; day_of_week: number; start_time: string; end_time: string; active: boolean };
type CalendarData = { appointments: Appointment[]; timeOff: TimeOff[]; workingHours: WorkingHour[]; artists: Artist[] };
type Catalog = {
  treatments: Array<{ id: string; name: string; duration: number; price: number; allowsProductRemoval?: boolean; acceptsAddOns?: boolean }>;
  addOns: Array<{ id: string; name: string; duration: number; price: number }>;
};
type Slot = { startsAt: string; time: string; artist: string; artistName: string };
type ShowFilter = 'all' | 'appointments' | 'time_off' | 'blocked';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function rangeFor(view: 'day' | 'week' | 'month', anchor: DateTime) {
  const start = view === 'day'
    ? anchor.startOf('day')
    : view === 'week'
      ? anchor.startOf('week')
      : anchor.startOf('month').startOf('week');
  const end = view === 'day' ? start.plus({ days: 1 }) : view === 'week' ? start.plus({ days: 7 }) : start.plus({ days: 42 });
  return { start, end };
}

function blockOverlapsDay(block: TimeOff, day: DateTime) {
  const startsAt = salonDateTime(block.starts_at);
  const endsAt = salonDateTime(block.ends_at);
  return startsAt < day.plus({ days: 1 }) && endsAt > day;
}

function blockLabel(block: TimeOff) {
  return block.type === 'time_off' ? 'Time off' : 'Blocked';
}

function emptyCalendarLabel(show: ShowFilter) {
  if (show === 'time_off') return 'No time off';
  if (show === 'blocked') return 'No blocked time';
  return 'No bookings';
}

function monthCalendarLabel(show: ShowFilter, appointmentCount: number, blockCount: number, open: boolean) {
  if (show === 'time_off') return blockCount ? `${blockCount} time off` : 'No time off';
  if (show === 'blocked') return blockCount ? `${blockCount} blocked` : 'No blocked time';
  return open ? `${appointmentCount} booked` : 'Closed';
}

export function CalendarPage() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(DateTime.now().setZone(SALON_TIMEZONE).startOf('day'));
  const [artistId, setArtistId] = useState('');
  const [show, setShow] = useState<ShowFilter>('all');
  const [data, setData] = useState<CalendarData | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<TimeOff | null>(null);
  const [newOpen, setNewOpen] = useState(params.get('action') === 'new');
  const [newDate, setNewDate] = useState<string | undefined>();
  const [blockOpen, setBlockOpen] = useState(params.get('action') === 'block');
  const [error, setError] = useState('');
  const range = useMemo(() => rangeFor(view, anchor), [anchor, view]);

  async function load() {
    setError('');
    const query = new URLSearchParams({ from: range.start.toUTC().toISO()!, to: range.end.toUTC().toISO()! });
    if (artistId) query.set('artistId', artistId);
    try {
      const result = await apiFetch<CalendarData>(`/api/admin/calendar?${query}`);
      setData(result);
      const appointmentId = params.get('appointment');
      if (appointmentId) setSelected(result.appointments.find((item) => item.id === appointmentId) ?? null);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Calendar could not be loaded.');
    }
  }

  useEffect(() => { void load(); }, [artistId, range.start.toMillis(), range.end.toMillis()]);
  useEffect(() => { apiFetch<Catalog>('/api/public/catalog').then(setCatalog).catch(() => undefined); }, []);

  function move(direction: number) {
    setAnchor((current) => current.plus(view === 'month' ? { months: direction } : { days: direction * (view === 'day' ? 1 : 7) }));
  }
  function closeModal() {
    setSelected(null);
    setSelectedBlock(null);
    setNewOpen(false);
    setNewDate(undefined);
    setBlockOpen(false);
    setParams({});
  }

  function openNewAppointment(day?: DateTime) {
    setNewDate(day ? salonDateKey(day) : undefined);
    setNewOpen(true);
  }

  const displayDays = Array.from(
    { length: view === 'day' ? 1 : view === 'week' ? 7 : 42 },
    (_, index) => range.start.plus({ days: index }),
  );

  return (
    <KgdPage
      eyebrow="OPERATIONS"
      title="Calendar"
      actions={
        <>
          <button className="kgd-button" type="button" onClick={() => openNewAppointment()}><CalendarPlus size={16} />New appointment</button>
          <button className="kgd-button" type="button" onClick={() => setBlockOpen(true)}><Ban size={16} />Block time</button>
        </>
      }
    >
      <div className="kgd-toolbar">
        <div className="kgd-segmented" aria-label="Calendar view">
          {(['day', 'week', 'month'] as const).map((item) => (
            <button key={item} className={view === item ? 'is-active' : ''} type="button" onClick={() => setView(item)}>{item}</button>
          ))}
        </div>
        <div className="kgd-date-nav">
          <button className="kgd-icon-button" type="button" title="Previous" onClick={() => move(-1)}><ChevronLeft size={18} /></button>
          <button className="kgd-button" type="button" onClick={() => setAnchor(DateTime.now().setZone(SALON_TIMEZONE).startOf('day'))}>Today</button>
          <button className="kgd-icon-button" type="button" title="Next" onClick={() => move(1)}><ChevronRight size={18} /></button>
        </div>
        <strong className="kgd-range-label">
          {view === 'month'
            ? anchor.toFormat('LLLL yyyy')
            : `${range.start.toFormat('d LLL')} – ${range.end.minus({ days: 1 }).toFormat('d LLL yyyy')}`}
        </strong>
        <label className="kgd-inline-field"><span>Artist</span><select value={artistId} onChange={(event) => setArtistId(event.target.value)}><option value="">All artists</option>{data?.artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></label>
        <label className="kgd-inline-field"><span>Show</span><select value={show} onChange={(event) => setShow(event.target.value as ShowFilter)}><option value="all">All</option><option value="appointments">Appointments</option><option value="time_off">Time off</option><option value="blocked">Blocked</option></select></label>
      </div>
      {error ? <KgdStatus message={error} error /> : null}
      {!data ? <p className="kgd-loading-inline">Loading calendar...</p> : view === 'month' ? (
        <MonthView days={displayDays} data={data} show={show} onSelect={setSelected} onSelectBlock={setSelectedBlock} onCreate={openNewAppointment} />
      ) : (
        <ScheduleView days={displayDays} data={data} show={show} onSelect={setSelected} onSelectBlock={setSelectedBlock} onCreate={openNewAppointment} />
      )}

      {selected && data ? <AppointmentModal appointment={selected} artists={data.artists} onClose={closeModal} onSaved={async () => { closeModal(); await load(); }} /> : null}
      {selectedBlock ? <BlockDetailModal block={selectedBlock} onClose={closeModal} onDeleted={async () => { closeModal(); await load(); }} /> : null}
      {newOpen && data && catalog ? <NewAppointmentModal artists={data.artists.filter((artist) => artist.active)} catalog={catalog} initialDate={newDate} onClose={closeModal} onSaved={async () => { closeModal(); await load(); }} /> : null}
      {blockOpen && data ? <BlockTimeModal artists={data.artists.filter((artist) => artist.active)} onClose={closeModal} onSaved={async () => { closeModal(); await load(); }} /> : null}
    </KgdPage>
  );
}

function ScheduleView({ days, data, show, onSelect, onSelectBlock, onCreate }: { days: DateTime[]; data: CalendarData; show: ShowFilter; onSelect: (appointment: Appointment) => void; onSelectBlock: (block: TimeOff) => void; onCreate: (day: DateTime) => void }) {
  const today = DateTime.now().setZone(SALON_TIMEZONE).startOf('day');
  return (
    <div className={`kgd-schedule-grid ${days.length === 1 ? 'is-day' : ''}`}>
      {days.map((day) => {
        const key = salonDateKey(day);
        const appointments = show === 'all' || show === 'appointments' ? data.appointments.filter((item) => salonDateKey(item.starts_at) === key) : [];
        const blocks = show === 'appointments' ? [] : data.timeOff.filter((item) => blockOverlapsDay(item, day) && (show === 'all' || item.type === show));
        const hours = data.workingHours.filter((item) => item.day_of_week === day.weekday && item.active);
        const canCreate = day >= today && hours.length > 0 && (show === 'all' || show === 'appointments');
        return (
          <section className="kgd-day-column" key={key}>
            <header><span>{day.toFormat('ccc')}</span><strong>{day.day}</strong><small>{hours.length ? hours.map((hour) => `${hour.artist_name.split(' ')[0]} ${hour.start_time.slice(0,5)}–${hour.end_time.slice(0,5)}`).join(' · ') : 'Closed'}</small></header>
            <div className="kgd-day-events">
              {blocks.map((block) => <button className={`kgd-calendar-block is-${block.type}`} type="button" key={block.id} onClick={() => onSelectBlock(block)}><span>{blockLabel(block)}</span><strong>{block.reason}</strong><small>{block.artist_name}</small><small>{dateTime(block.starts_at)} to {dateTime(block.ends_at)}</small></button>)}
              {appointments.map((appointment) => (
                <button className={`kgd-calendar-event is-${appointment.status}`} type="button" key={appointment.id} onClick={() => onSelect(appointment)}>
                  <time>{salonDateTime(appointment.starts_at).toFormat('HH:mm')}</time>
                  <strong>{appointment.client_name}</strong>
                  <small>{appointment.services.map((service) => service.name).join(', ')}</small>
                  <small>{appointment.artist_name}</small>
                </button>
              ))}
              {!appointments.length && !blocks.length ? canCreate ? (
                <button className="kgd-day-empty is-action" type="button" onClick={() => onCreate(day)}>
                  <CalendarPlus size={14} aria-hidden="true" />
                  New appointment
                </button>
              ) : <span className="kgd-day-empty">{emptyCalendarLabel(show)}</span> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MonthView({ days, data, show, onSelect, onSelectBlock, onCreate }: { days: DateTime[]; data: CalendarData; show: ShowFilter; onSelect: (appointment: Appointment) => void; onSelectBlock: (block: TimeOff) => void; onCreate: (day: DateTime) => void }) {
  const today = DateTime.now().setZone(SALON_TIMEZONE).startOf('day');
  return (
    <div className="kgd-month">
      {dayNames.map((day) => <span className="kgd-month-weekday" key={day}>{day.slice(0,3)}</span>)}
      {days.map((day) => {
        const key = salonDateKey(day);
        const appointments = show === 'all' || show === 'appointments' ? data.appointments.filter((item) => salonDateKey(item.starts_at) === key && item.status !== 'cancelled') : [];
        const blocks = show === 'appointments' ? [] : data.timeOff.filter((item) => blockOverlapsDay(item, day) && (show === 'all' || item.type === show));
        const open = data.workingHours.some((item) => item.day_of_week === day.weekday && item.active);
        const itemsShown = appointments.length + blocks.length;
        const canCreate = day >= today && open && itemsShown === 0 && (show === 'all' || show === 'appointments');
        return <div className="kgd-month-day" key={key}><header><strong>{day.day}</strong><span>{monthCalendarLabel(show, appointments.length, blocks.length, open)}</span></header>{blocks.slice(0, Math.max(0, 3 - appointments.length)).map((block) => {
          const blockDetails = `${blockLabel(block)} · ${block.artist_name} · ${block.reason} · ${dateTime(block.starts_at)} to ${dateTime(block.ends_at)}`;
          return <button aria-label={blockDetails} className={`is-${block.type}`} type="button" title={blockDetails} key={block.id} onClick={() => onSelectBlock(block)}>{blockDetails}</button>;
        })}{appointments.slice(0, Math.max(0, 3 - blocks.length)).map((appointment) => <button type="button" key={appointment.id} onClick={() => onSelect(appointment)}>{salonDateTime(appointment.starts_at).toFormat('HH:mm')} {appointment.client_name}</button>)}{canCreate ? <button className="kgd-month-empty-action" type="button" aria-label={`New appointment on ${day.toFormat('cccc d LLLL')}`} onClick={() => onCreate(day)}>New appointment</button> : null}{itemsShown > 3 ? <small>+{itemsShown-3} more</small> : null}</div>;
      })}
    </div>
  );
}

function AppointmentModal({ appointment, artists, onClose, onSaved }: { appointment: Appointment; artists: Artist[]; onClose: () => void; onSaved: () => void }) {
  const [artistId, setArtistId] = useState(appointment.artist_id);
  const [startsAt, setStartsAt] = useState(toSalonInput(appointment.starts_at));
  const [status, setStatus] = useState(appointment.status);
  const [paymentStatus, setPaymentStatus] = useState(appointment.payment_status);
  const [notes, setNotes] = useState(appointment.internal_notes);
  const [message, setMessage] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault(); setMessage('');
    try {
      await apiFetch(`/api/admin/appointments/${appointment.id}`, { method:'PATCH', body:JSON.stringify({ artistId, startsAt:fromSalonInput(startsAt), status, paymentStatus, internalNotes:notes }) });
      onSaved();
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Appointment could not be saved.'); }
  }
  return <KgdModal title={`${appointment.client_name} · ${dateTime(appointment.starts_at)}`} onClose={onClose} wide><form className="kgd-form" onSubmit={save}><div className="kgd-detail-strip"><div><span>Service</span><strong>{appointment.services.map((service)=>service.name).join(', ')}</strong></div><div><span>Total</span><strong>{money(appointment.total_pence)}</strong></div><div><span>Source</span><strong>{appointment.booking_source}</strong></div></div><div className="kgd-form-grid"><label><span>Start</span><input type="datetime-local" value={startsAt} onChange={(event)=>setStartsAt(event.target.value)} /></label><label><span>Nail Artist</span><select value={artistId} onChange={(event)=>setArtistId(event.target.value)}>{artists.filter((artist)=>artist.active || artist.id===artistId).map((artist)=><option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></label><label><span>Status</span><select value={status} onChange={(event)=>setStatus(event.target.value as Appointment['status'])}><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No-show</option></select></label><label><span>Payment</span><select value={paymentStatus} onChange={(event)=>setPaymentStatus(event.target.value as Appointment['payment_status'])}><option value="unpaid">Unpaid</option><option value="deposit_recorded">Deposit recorded</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select></label></div><label><span>Internal notes</span><textarea value={notes} onChange={(event)=>setNotes(event.target.value)} /></label><div className="kgd-client-summary"><strong>{appointment.client_name}</strong><span>{appointment.email}</span><span>{appointment.phone}</span>{appointment.customer_note ? <p>Customer note: {appointment.customer_note}</p> : null}</div>{message ? <KgdStatus message={message} error /> : null}<div className="kgd-form-actions"><button className="kgd-button" type="button" onClick={onClose}>Close</button><button className="kgd-button is-primary" type="submit">Save appointment</button></div></form></KgdModal>;
}

function NewAppointmentModal({ artists, catalog, initialDate, onClose, onSaved }: { artists: Artist[]; catalog: Catalog; initialDate?: string; onClose: () => void; onSaved: () => void }) {
  const [serviceSlug, setServiceSlug] = useState(catalog.treatments[0]?.id ?? '');
  const [artistSlug, setArtistSlug] = useState(artists[0]?.slug ?? '');
  const [date, setDate] = useState(initialDate ?? DateTime.now().setZone(SALON_TIMEZONE).plus({ days: 1 }).toISODate()!);
  const [startsAt, setStartsAt] = useState('');
  const [addOnSlugs, setAddOnSlugs] = useState<string[]>([]);
  const [productOn, setProductOn] = useState('none');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [customer, setCustomer] = useState({ fullName:'', email:'', mobile:'', note:'' });
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!serviceSlug || !artistSlug || !date) return;
    const query = new URLSearchParams({service:serviceSlug,artist:artistSlug,addOns:addOnSlugs.join(','),productOn,from:date,to:date});
    apiFetch<{slots:Slot[]}>(`/api/public/availability?${query}`).then((result)=>{setSlots(result.slots);setStartsAt('');}).catch((error)=>setMessage(error instanceof ApiError?error.message:'Availability could not be loaded.'));
  }, [serviceSlug,artistSlug,date,addOnSlugs,productOn]);
  async function submit(event: FormEvent) { event.preventDefault(); setMessage(''); try { await apiFetch('/api/admin/appointments',{method:'POST',body:JSON.stringify({serviceSlug,artistSlug,startsAt,addOnSlugs,productOn,customer})}); onSaved(); } catch(error){setMessage(error instanceof ApiError?error.message:'Appointment could not be created.');} }
  return <KgdModal title="New appointment" onClose={onClose} wide><form className="kgd-form" onSubmit={submit}><div className="kgd-form-grid"><label><span>Treatment</span><select value={serviceSlug} onChange={(event)=>setServiceSlug(event.target.value)}>{catalog.treatments.map((service)=><option key={service.id} value={service.id}>{service.name} · {service.duration} min · £{service.price}</option>)}</select></label><label><span>Nail Artist</span><select value={artistSlug} onChange={(event)=>setArtistSlug(event.target.value)}>{artists.map((artist)=><option key={artist.id} value={artist.slug}>{artist.name}</option>)}</select></label><label><span>Date</span><input type="date" value={date} min={DateTime.now().setZone(SALON_TIMEZONE).toISODate()!} onChange={(event)=>setDate(event.target.value)} /></label><label><span>Time</span><select value={startsAt} onChange={(event)=>setStartsAt(event.target.value)} required><option value="">Choose time</option>{slots.map((slot)=><option key={slot.startsAt} value={slot.startsAt}>{slot.time}</option>)}</select></label></div><fieldset className="kgd-check-group"><legend>Add-ons</legend>{catalog.addOns.map((addOn)=><label key={addOn.id}><input type="checkbox" checked={addOnSlugs.includes(addOn.id)} onChange={()=>setAddOnSlugs((current)=>current.includes(addOn.id)?current.filter((id)=>id!==addOn.id):[...current,addOn.id])} />{addOn.name}</label>)}</fieldset><label><span>Existing product</span><select value={productOn} onChange={(event)=>setProductOn(event.target.value)}><option value="none">Nothing</option><option value="gel">Gel</option><option value="builder">Builder gel / BIAB</option><option value="extensions">Extensions</option></select></label><div className="kgd-form-grid"><label><span>Client name</span><input value={customer.fullName} onChange={(event)=>setCustomer({...customer,fullName:event.target.value})} required /></label><label><span>Email</span><input type="email" value={customer.email} onChange={(event)=>setCustomer({...customer,email:event.target.value})} required /></label><label><span>Phone</span><input value={customer.mobile} onChange={(event)=>setCustomer({...customer,mobile:event.target.value})} required /></label></div><label><span>Customer note</span><textarea value={customer.note} onChange={(event)=>setCustomer({...customer,note:event.target.value})} /></label>{message?<KgdStatus message={message} error/>:null}<div className="kgd-form-actions"><button className="kgd-button" type="button" onClick={onClose}>Close</button><button className="kgd-button is-primary" type="submit" disabled={!startsAt}>Create appointment</button></div></form></KgdModal>;
}

function BlockTimeModal({ artists, onClose, onSaved }: { artists: Artist[]; onClose: () => void; onSaved: () => void }) {
  const [artistId,setArtistId]=useState(artists[0]?.id??''); const [startsAt,setStartsAt]=useState(''); const [endsAt,setEndsAt]=useState(''); const [reason,setReason]=useState('Blocked time'); const [message,setMessage]=useState('');
  async function submit(event:FormEvent){event.preventDefault();try{await apiFetch('/api/admin/time-off',{method:'POST',body:JSON.stringify({artistId,type:'blocked',startsAt:fromSalonInput(startsAt),endsAt:fromSalonInput(endsAt),reason})});onSaved();}catch(error){setMessage(error instanceof ApiError?error.message:'Time could not be blocked.');}}
  return <KgdModal title="Block time" onClose={onClose}><form className="kgd-form" onSubmit={submit}><label><span>Nail Artist</span><select value={artistId} onChange={(event)=>setArtistId(event.target.value)}>{artists.map((artist)=><option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></label><label><span>Starts</span><input type="datetime-local" value={startsAt} onChange={(event)=>setStartsAt(event.target.value)} required /></label><label><span>Ends</span><input type="datetime-local" value={endsAt} onChange={(event)=>setEndsAt(event.target.value)} required /></label><label><span>Reason</span><input value={reason} onChange={(event)=>setReason(event.target.value)} required /></label>{message?<KgdStatus message={message} error/>:null}<div className="kgd-form-actions"><button className="kgd-button" type="button" onClick={onClose}>Close</button><button className="kgd-button is-primary" type="submit">Block time</button></div></form></KgdModal>;
}

function BlockDetailModal({ block, onClose, onDeleted }: { block: TimeOff; onClose: () => void; onDeleted: () => void }) {
  const [message, setMessage] = useState('');
  async function remove() {
    try {
      await apiFetch(`/api/admin/time-off/${block.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'The calendar block could not be removed.');
    }
  }
  return <KgdModal title={blockLabel(block)} onClose={onClose}><div className="kgd-form"><div className="kgd-detail-strip"><div><span>Artist</span><strong>{block.artist_name}</strong></div><div><span>Type</span><strong>{blockLabel(block)}</strong></div></div><label><span>Reason</span><strong>{block.reason}</strong></label><label><span>Start / end</span><strong>{dateTime(block.starts_at)} to {dateTime(block.ends_at)}</strong></label>{message ? <KgdStatus message={message} error /> : null}<div className="kgd-form-actions"><button className="kgd-button" type="button" onClick={onClose}>Close</button><button className="kgd-button is-danger" type="button" onClick={() => void remove()}><Trash2 size={16} />Delete</button></div></div></KgdModal>;
}
