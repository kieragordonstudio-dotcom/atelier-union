import { CalendarClock, Clock3, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import { dateTime, KgdEmpty, KgdModal, KgdPage, KgdStatus } from '../components';
import { fromSalonInput, toSalonInput } from '../time';

type Artist = {
  id: string;
  name: string;
  role: string;
  image: string;
  specialties: string[];
  profile: string;
  selected_work: string[];
  active: boolean;
  service_ids: string[];
};
type Service = { id: string; name: string; active: boolean };
type WorkingHour = {
  artist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
};
type TimeOff = {
  id: string;
  artist_id: string;
  artist_name: string;
  type: 'time_off' | 'blocked';
  starts_at: string;
  ends_at: string;
  reason: string;
};
type TeamData = {
  artists: Artist[];
  services: Service[];
  workingHours: WorkingHour[];
  timeOff: TimeOff[];
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null);
  const [artist, setArtist] = useState<Artist | null | undefined>();
  const [hoursArtist, setHoursArtist] = useState<Artist | null>(null);
  const [timeOff, setTimeOff] = useState<TimeOff | null | undefined>();
  const [error, setError] = useState('');

  async function load() {
    try {
      setData(await apiFetch<TeamData>('/api/admin/team'));
      setError('');
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Team details could not be loaded.');
    }
  }

  useEffect(() => { void load(); }, []);

  async function toggle(item: Artist) {
    try {
      await apiFetch(`/api/admin/artists/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      });
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Nail Artist could not be updated.');
    }
  }

  async function removeBlock(id: string) {
    try {
      await apiFetch(`/api/admin/time-off/${id}`, { method: 'DELETE' });
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Time off could not be removed.');
    }
  }

  return (
    <KgdPage
      eyebrow="PEOPLE & AVAILABILITY"
      title="Team"
      actions={<button className="kgd-button is-primary" type="button" onClick={() => setArtist(null)}><Plus size={16} />New Nail Artist</button>}
    >
      {error ? <KgdStatus message={error} error /> : null}
      {!data ? <p className="kgd-loading-inline">Loading team...</p> : (
        <>
          <section className="kgd-team-grid">
            {data.artists.map((item) => {
              const hours = data.workingHours.filter((hour) => hour.artist_id === item.id && hour.active);
              return (
                <article className="kgd-team-member" key={item.id}>
                  <header>
                    <div><h2>{item.name}</h2><p>{item.role}</p></div>
                    <button className={`kgd-toggle ${item.active ? 'is-on' : ''}`} type="button" aria-pressed={item.active} onClick={() => void toggle(item)}><span />{item.active ? 'Active' : 'Inactive'}</button>
                  </header>
                  <p className="kgd-specialties">{item.specialties.join(' · ') || 'No specialties set'}</p>
                  <dl className="kgd-definition-list">
                    <div><dt>Services</dt><dd>{item.service_ids.length}</dd></div>
                    <div><dt>Working days</dt><dd>{hours.length}</dd></div>
                  </dl>
                  <div className="kgd-actions">
                    <button className="kgd-button" type="button" onClick={() => setArtist(item)}>Edit profile</button>
                    <button className="kgd-button" type="button" onClick={() => setHoursArtist(item)}><Clock3 size={16} />Hours</button>
                    <button className="kgd-button" type="button" onClick={() => setTimeOff({ id: '', artist_id: item.id, artist_name: item.name, type: 'time_off', starts_at: '', ends_at: '', reason: '' })}><CalendarClock size={16} />Time off</button>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="kgd-section">
            <header><div><p className="kgd-eyebrow">UPCOMING</p><h2>Time off & blocks</h2></div></header>
            {data.timeOff.length ? <div className="kgd-list">{data.timeOff.map((block) => (
              <div className="kgd-list-row" key={block.id}>
                <span><strong>{block.artist_name}</strong><small>{dateTime(block.starts_at)} to {dateTime(block.ends_at)}</small></span>
                <span>{block.reason}</span>
                <span className={`kgd-badge is-${block.type}`}>{block.type === 'time_off' ? 'Time off' : 'Blocked'}</span>
                <button className="kgd-text-button" type="button" onClick={() => setTimeOff(block)}>Edit</button>
                <button className="kgd-icon-button" type="button" title="Delete block" onClick={() => void removeBlock(block.id)}><Trash2 size={16} /></button>
              </div>
            ))}</div> : <KgdEmpty>No upcoming time off or blocked periods.</KgdEmpty>}
          </section>
        </>
      )}

      {data && artist !== undefined ? <ArtistForm artist={artist ?? undefined} services={data.services} onClose={() => setArtist(undefined)} onSaved={async () => { setArtist(undefined); await load(); }} /> : null}
      {data && hoursArtist ? <HoursForm artist={hoursArtist} current={data.workingHours.filter((hour) => hour.artist_id === hoursArtist.id)} onClose={() => setHoursArtist(null)} onSaved={async () => { setHoursArtist(null); await load(); }} /> : null}
      {data && timeOff !== undefined ? <TimeOffForm artists={data.artists} block={timeOff ?? undefined} onClose={() => setTimeOff(undefined)} onSaved={async () => { setTimeOff(undefined); await load(); }} /> : null}
    </KgdPage>
  );
}

function ArtistForm({ artist, services, onClose, onSaved }: { artist?: Artist; services: Service[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: artist?.name ?? '', role: artist?.role ?? 'Nail Artist', image: artist?.image ?? '/images/artist-maya.webp',
    specialties: (artist?.specialties ?? []).join(', '), profile: artist?.profile ?? '', selectedWork: (artist?.selected_work ?? []).join(', '),
    serviceIds: artist?.service_ids ?? services.filter((service) => service.active).map((service) => service.id), active: artist?.active ?? true,
  });
  const [message, setMessage] = useState('');
  function split(value: string) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiFetch(artist ? `/api/admin/artists/${artist.id}` : '/api/admin/artists', {
        method: artist ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, specialties: split(form.specialties), selectedWork: split(form.selectedWork) }),
      });
      onSaved();
    } catch (requestError) { setMessage(requestError instanceof ApiError ? requestError.message : 'Nail Artist could not be saved.'); }
  }
  return <KgdModal title={artist ? `Edit ${artist.name}` : 'New Nail Artist'} onClose={onClose} wide><form className="kgd-form" onSubmit={submit}>
    <div className="kgd-form-grid"><label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label><span>Role</span><input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} required /></label><label><span>Image path</span><input value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} required /></label><label><span>Specialties, comma separated</span><input value={form.specialties} onChange={(event) => setForm({ ...form, specialties: event.target.value })} /></label></div>
    <label><span>Profile</span><textarea value={form.profile} onChange={(event) => setForm({ ...form, profile: event.target.value })} /></label>
    <label><span>Selected work labels, comma separated</span><input value={form.selectedWork} onChange={(event) => setForm({ ...form, selectedWork: event.target.value })} /></label>
    <fieldset className="kgd-check-group"><legend>Services offered</legend>{services.map((service) => <label key={service.id}><input type="checkbox" checked={form.serviceIds.includes(service.id)} onChange={() => setForm({ ...form, serviceIds: form.serviceIds.includes(service.id) ? form.serviceIds.filter((id) => id !== service.id) : [...form.serviceIds, service.id] })} />{service.name}{!service.active ? ' (inactive)' : ''}</label>)}</fieldset>
    <label className="kgd-checkbox"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />Available for public booking</label>
    {message ? <KgdStatus message={message} error /> : null}<div className="kgd-form-actions"><button className="kgd-button" type="button" onClick={onClose}>Close</button><button className="kgd-button is-primary" type="submit">Save Nail Artist</button></div>
  </form></KgdModal>;
}

function HoursForm({ artist, current, onClose, onSaved }: { artist: Artist; current: WorkingHour[]; onClose: () => void; onSaved: () => void }) {
  const initial = useMemo(() => days.map((_, index) => {
    const saved = current.find((hour) => hour.day_of_week === index + 1);
    return { dayOfWeek: index + 1, active: saved?.active ?? false, startTime: saved?.start_time.slice(0, 5) ?? '09:00', endTime: saved?.end_time.slice(0, 5) ?? '17:00' };
  }), [current]);
  const [hours, setHours] = useState(initial);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try { await apiFetch(`/api/admin/artists/${artist.id}/working-hours`, { method: 'PUT', body: JSON.stringify({ hours }) }); onSaved(); }
    catch (requestError) { setMessage(requestError instanceof ApiError ? requestError.message : 'Working hours could not be saved.'); }
  }
  return <KgdModal title={`${artist.name} working hours`} onClose={onClose}><form className="kgd-form" onSubmit={submit}><div className="kgd-hours-editor">{hours.map((hour, index) => <div className="kgd-hours-row" key={hour.dayOfWeek}><label className="kgd-checkbox"><input type="checkbox" checked={hour.active} onChange={(event) => setHours(hours.map((item, itemIndex) => itemIndex === index ? { ...item, active: event.target.checked } : item))} />{days[index]}</label><input aria-label={`${days[index]} start`} type="time" value={hour.startTime} disabled={!hour.active} onChange={(event) => setHours(hours.map((item, itemIndex) => itemIndex === index ? { ...item, startTime: event.target.value } : item))} /><input aria-label={`${days[index]} end`} type="time" value={hour.endTime} disabled={!hour.active} onChange={(event) => setHours(hours.map((item, itemIndex) => itemIndex === index ? { ...item, endTime: event.target.value } : item))} /></div>)}</div>{message ? <KgdStatus message={message} error /> : null}<div className="kgd-form-actions"><button className="kgd-button" type="button" onClick={onClose}>Close</button><button className="kgd-button is-primary" type="submit">Save hours</button></div></form></KgdModal>;
}

function TimeOffForm({ artists, block, onClose, onSaved }: { artists: Artist[]; block?: TimeOff; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ artistId: block?.artist_id ?? artists[0]?.id ?? '', type: block?.type ?? 'time_off', startsAt: toSalonInput(block?.starts_at), endsAt: toSalonInput(block?.ends_at), reason: block?.reason ?? '' });
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiFetch(block?.id ? `/api/admin/time-off/${block.id}` : '/api/admin/time-off', { method: block?.id ? 'PATCH' : 'POST', body: JSON.stringify({ ...form, startsAt: fromSalonInput(form.startsAt), endsAt: fromSalonInput(form.endsAt) }) });
      onSaved();
    } catch (requestError) { setMessage(requestError instanceof ApiError ? requestError.message : 'Time off could not be saved.'); }
  }
  return <KgdModal title={block?.id ? 'Edit time off' : 'Add time off'} onClose={onClose}><form className="kgd-form" onSubmit={submit}><label><span>Nail Artist</span><select value={form.artistId} onChange={(event) => setForm({ ...form, artistId: event.target.value })}>{artists.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Type</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as 'time_off' | 'blocked' })}><option value="time_off">Time off</option><option value="blocked">Blocked time</option></select></label><div className="kgd-form-grid"><label><span>Starts</span><input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required /></label><label><span>Ends</span><input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} required /></label></div><label><span>Reason</span><input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required /></label>{message ? <KgdStatus message={message} error /> : null}<div className="kgd-form-actions"><button className="kgd-button" type="button" onClick={onClose}>Close</button><button className="kgd-button is-primary" type="submit">Save time off</button></div></form></KgdModal>;
}
