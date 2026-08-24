import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import { KgdEmpty, KgdModal, KgdPage, KgdStatus } from '../components';

type Selector = { id: string; name: string; active: boolean };
type Look = {
  id: string;
  name: string;
  image: string;
  alt_text: string;
  category: string;
  complexity: string;
  description: string;
  treatment_id: string;
  treatment_name: string;
  add_on_id: string | null;
  add_on_name: string | null;
  artist_id: string | null;
  artist_name: string | null;
  published: boolean;
  active: boolean;
  sort_order: number;
};
type LookbookData = {
  looks: Look[];
  treatments: Selector[];
  addOns: Selector[];
  artists: Selector[];
  categories: string[];
  complexities: string[];
};

export function LookbookPage() {
  const [data, setData] = useState<LookbookData | null>(null);
  const [selected, setSelected] = useState<Look | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      setData(await apiFetch<LookbookData>('/api/admin/lookbook'));
      setError('');
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Lookbook could not be loaded.');
    }
  }
  useEffect(() => { void load(); }, []);

  async function update(look: Look, changes: Partial<{ published: boolean; active: boolean }>) {
    try {
      await apiFetch(`/api/admin/lookbook/${look.id}`, { method: 'PATCH', body: JSON.stringify(changes) });
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Look could not be updated.');
    }
  }

  async function move(look: Look, direction: number) {
    if (!data) return;
    const ordered = [...data.looks];
    const index = ordered.findIndex((item) => item.id === look.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try {
      await apiFetch('/api/admin/lookbook/reorder', {
        method: 'POST',
        body: JSON.stringify({ items: ordered.map((item, sortOrder) => ({ id: item.id, sortOrder })) }),
      });
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Look order could not be saved.');
    }
  }

  async function remove(look: Look) {
    if (!window.confirm(`Remove ${look.name}?`)) return;
    try {
      await apiFetch(`/api/admin/lookbook/${look.id}`, { method: 'DELETE' });
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Look could not be removed.');
    }
  }

  return <KgdPage eyebrow="PUBLIC PORTFOLIO" title="Lookbook" actions={<button className="kgd-button is-primary" type="button" onClick={() => setCreateOpen(true)}><Plus size={16} />New look</button>}>
    {error ? <KgdStatus message={error} error /> : null}
    {!data ? <p className="kgd-loading-inline">Loading lookbook...</p> : <section className="kgd-table-shell"><table className="kgd-table"><thead><tr><th>Order</th><th>Look</th><th>Category</th><th>Treatment</th><th>Artist</th><th>Published</th><th>Active</th><th></th></tr></thead><tbody>{data.looks.map((look, index) => <tr key={look.id}><td><div className="kgd-order"><button className="kgd-icon-button" type="button" title="Move up" disabled={index === 0} onClick={() => void move(look, -1)}><ArrowUp size={15} /></button><button className="kgd-icon-button" type="button" title="Move down" disabled={index === data.looks.length - 1} onClick={() => void move(look, 1)}><ArrowDown size={15} /></button></div></td><td><div className="kgd-look-cell"><img className="kgd-look-thumb" src={look.image} alt="" /><span><strong>{look.name}</strong><small>{look.description}</small></span></div></td><td>{look.category}<small>{look.complexity}</small></td><td>{look.treatment_name}<small>{look.add_on_name ?? 'No add-on'}</small></td><td>{look.artist_name ?? 'Any Nail Artist'}</td><td><button className={`kgd-toggle ${look.published ? 'is-on' : ''}`} type="button" aria-pressed={look.published} onClick={() => void update(look, { published: !look.published })}><span />{look.published ? 'Published' : 'Hidden'}</button></td><td><button className={`kgd-toggle ${look.active ? 'is-on' : ''}`} type="button" aria-pressed={look.active} onClick={() => void update(look, { active: !look.active })}><span />{look.active ? 'Active' : 'Inactive'}</button></td><td><div className="kgd-order"><button className="kgd-text-button" type="button" onClick={() => setSelected(look)}>Edit</button><button className="kgd-icon-button" type="button" title="Remove look" onClick={() => void remove(look)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>{!data.looks.length ? <KgdEmpty>No looks yet.</KgdEmpty> : null}</section>}
    {data && (createOpen || selected) ? <LookForm data={data} look={selected ?? undefined} onClose={() => { setCreateOpen(false); setSelected(null); }} onSaved={async () => { setCreateOpen(false); setSelected(null); await load(); }} /> : null}
  </KgdPage>;
}

function LookForm({ data, look, onClose, onSaved }: { data: LookbookData; look?: Look; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: look?.name ?? '',
    image: look?.image ?? '',
    altText: look?.alt_text ?? '',
    category: look?.category ?? data.categories[0],
    complexity: look?.complexity ?? data.complexities[0],
    description: look?.description ?? '',
    treatmentId: look?.treatment_id ?? data.treatments.find((item) => item.active)?.id ?? '',
    addOnId: look?.add_on_id ?? '',
    artistId: look?.artist_id ?? '',
    published: look?.published ?? true,
    active: look?.active ?? true,
  });
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiFetch(look ? `/api/admin/lookbook/${look.id}` : '/api/admin/lookbook', {
        method: look ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, addOnId: form.addOnId || null, artistId: form.artistId || null }),
      });
      onSaved();
    } catch (requestError) {
      setMessage(requestError instanceof ApiError ? requestError.message : 'Look could not be saved.');
    }
  }
  return <KgdModal title={look ? `Edit ${look.name}` : 'New look'} onClose={onClose} wide><form className="kgd-form" onSubmit={submit}><div className="kgd-form-grid"><label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label><span>Image path / URL</span><input value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} required /></label><label><span>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{data.categories.map((category) => <option key={category}>{category}</option>)}</select></label><label><span>Complexity</span><select value={form.complexity} onChange={(event) => setForm({ ...form, complexity: event.target.value })}>{data.complexities.map((complexity) => <option key={complexity}>{complexity}</option>)}</select></label><label><span>Suggested treatment</span><select value={form.treatmentId} onChange={(event) => setForm({ ...form, treatmentId: event.target.value })}>{data.treatments.map((item) => <option key={item.id} value={item.id}>{item.name}{!item.active ? ' (inactive)' : ''}</option>)}</select></label><label><span>Optional add-on</span><select value={form.addOnId} onChange={(event) => setForm({ ...form, addOnId: event.target.value })}><option value="">No add-on</option>{data.addOns.map((item) => <option key={item.id} value={item.id}>{item.name}{!item.active ? ' (inactive)' : ''}</option>)}</select></label><label><span>Recommended artist</span><select value={form.artistId} onChange={(event) => setForm({ ...form, artistId: event.target.value })}><option value="">Any Nail Artist</option>{data.artists.map((item) => <option key={item.id} value={item.id}>{item.name}{!item.active ? ' (inactive)' : ''}</option>)}</select></label></div><label><span>Alt text</span><input value={form.altText} onChange={(event) => setForm({ ...form, altText: event.target.value })} required /></label><label><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><fieldset className="kgd-check-group"><legend>Visibility</legend><label><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />Published</label><label><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />Active</label></fieldset>{message ? <KgdStatus message={message} error /> : null}<div className="kgd-form-actions"><button className="kgd-button" type="button" onClick={onClose}>Close</button><button className="kgd-button is-primary" type="submit">Save look</button></div></form></KgdModal>;
}
