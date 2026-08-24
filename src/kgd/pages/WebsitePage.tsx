import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import { KgdPage, KgdStatus } from '../components';

type Website = {
  salon_name: string;
  email: string | null;
  phone: string | null;
  address_line_1: string;
  city: string;
  postcode: string;
  country: string;
  instagram_url: string | null;
  email_url: string | null;
  opening_hours: Array<{ days: string; hours: string }>;
};

export function WebsitePage() {
  const [form, setForm] = useState({ salonName: '', email: '', phone: '', addressLine1: '', city: '', postcode: '', country: '', instagramUrl: '', emailUrl: '', openingHours: [] as Array<{ days: string; hours: string }> });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ website: Website }>('/api/admin/website').then(({ website }) => setForm({
      salonName: website.salon_name, email: website.email ?? '', phone: website.phone ?? '', addressLine1: website.address_line_1, city: website.city, postcode: website.postcode, country: website.country, instagramUrl: website.instagram_url ?? '', emailUrl: website.email_url ?? '', openingHours: website.opening_hours,
    })).catch((requestError) => setError(requestError instanceof ApiError ? requestError.message : 'Website details could not be loaded.'));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage(''); setError('');
    try { await apiFetch('/api/admin/website', { method: 'PATCH', body: JSON.stringify(form) }); setMessage('Website settings saved.'); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Website details could not be saved.'); }
  }

  return <KgdPage eyebrow="STRUCTURED CONTENT" title="Website"><form className="kgd-settings-layout" onSubmit={submit}>
    <section className="kgd-section"><header><div><p className="kgd-eyebrow">CONTACT</p><h2>Salon details</h2></div></header><div className="kgd-form"><div className="kgd-form-grid"><label><span>Salon name</span><input value={form.salonName} onChange={(event) => setForm({ ...form, salonName: event.target.value })} required /></label><label><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label><span>Phone</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label><span>Address line</span><input value={form.addressLine1} onChange={(event) => setForm({ ...form, addressLine1: event.target.value })} /></label><label><span>City</span><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label><label><span>Postcode</span><input value={form.postcode} onChange={(event) => setForm({ ...form, postcode: event.target.value })} /></label><label><span>Country</span><input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} /></label></div></div></section>
    <section className="kgd-section"><header><div><p className="kgd-eyebrow">LINKS</p><h2>Social & contact</h2></div></header><div className="kgd-form"><label><span>Instagram URL</span><input type="url" value={form.instagramUrl} onChange={(event) => setForm({ ...form, instagramUrl: event.target.value })} /></label><label><span>Email link</span><input value={form.emailUrl} onChange={(event) => setForm({ ...form, emailUrl: event.target.value })} placeholder="mailto:hello@example.com" /></label></div></section>
    <section className="kgd-section kgd-settings-wide"><header><div><p className="kgd-eyebrow">OPENING HOURS</p><h2>Public hours</h2></div></header><div className="kgd-hours-editor">{form.openingHours.map((row, index) => <div className="kgd-hours-row is-public" key={`${row.days}-${index}`}><input aria-label="Days" value={row.days} onChange={(event) => setForm({ ...form, openingHours: form.openingHours.map((item, itemIndex) => itemIndex === index ? { ...item, days: event.target.value } : item) })} /><input aria-label="Hours" value={row.hours} onChange={(event) => setForm({ ...form, openingHours: form.openingHours.map((item, itemIndex) => itemIndex === index ? { ...item, hours: event.target.value } : item) })} /></div>)}</div></section>
    <div className="kgd-settings-wide">{error ? <KgdStatus message={error} error /> : null}{message ? <KgdStatus message={message} /> : null}<button className="kgd-button is-primary" type="submit">Save website settings</button></div>
  </form></KgdPage>;
}
