import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import { KgdEmpty, KgdPage, KgdStatus, money } from '../components';

type Analytics = {
  range: number;
  summary: { bookings: number; completed_bookings: number; cancellations: number; no_shows: number; revenue: number; average_booking_value: number };
  clients: { new_clients: number; returning_clients: number };
  topTreatments: Array<{ name: string; bookings: number; revenue: number }>;
  byArtist: Array<{ name: string; bookings: number; booked_minutes: number; available_minutes: number; utilisation: number }>;
};

export function AnalyticsPage() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { setData(null); apiFetch<Analytics>(`/api/admin/analytics?range=${range}`).then(setData).catch((requestError) => setError(requestError instanceof ApiError ? requestError.message : 'Analytics could not be loaded.')); }, [range]);
  return <KgdPage eyebrow="REAL BUSINESS DATA" title="Analytics" actions={<div className="kgd-segmented" aria-label="Analytics range">{[7, 30, 90].map((days) => <button className={range === days ? 'is-active' : ''} type="button" key={days} onClick={() => setRange(days)}>{days} days</button>)}</div>}>
    {error ? <KgdStatus message={error} error /> : null}
    {!data ? <p className="kgd-loading-inline">Loading analytics...</p> : <>
      <section className="kgd-metric-strip"><div><span>Bookings</span><strong>{data.summary.bookings}</strong></div><div><span>Completed</span><strong>{data.summary.completed_bookings}</strong></div><div><span>Cancellations</span><strong>{data.summary.cancellations}</strong></div><div><span>No-shows</span><strong>{data.summary.no_shows}</strong></div><div><span>Revenue</span><strong>{money(data.summary.revenue)}</strong></div><div><span>Average booking</span><strong>{money(data.summary.average_booking_value)}</strong></div></section>
      <div className="kgd-two-column"><section className="kgd-section"><header><div><p className="kgd-eyebrow">CLIENT MIX</p><h2>New vs returning</h2></div></header><div className="kgd-comparison"><div><strong>{data.clients.new_clients}</strong><span>New clients</span></div><div><strong>{data.clients.returning_clients}</strong><span>Returning clients</span></div></div></section><section className="kgd-section"><header><div><p className="kgd-eyebrow">DEMAND</p><h2>Top treatments</h2></div></header>{data.topTreatments.length ? <div className="kgd-ranked-list">{data.topTreatments.map((item, index) => <div key={item.name}><span>{index + 1}</span><strong>{item.name}</strong><small>{item.bookings} bookings</small><b>{money(item.revenue)}</b></div>)}</div> : <KgdEmpty>No treatment data in this period.</KgdEmpty>}</section></div>
      <section className="kgd-section"><header><div><p className="kgd-eyebrow">TEAM</p><h2>Bookings & utilisation</h2></div></header>{data.byArtist.length ? <div className="kgd-utilisation">{data.byArtist.map((artist) => <div className="kgd-utilisation-row" key={artist.name}><span><strong>{artist.name}</strong><small>{artist.bookings} bookings · {artist.booked_minutes} booked minutes</small></span><div className="kgd-progress" aria-label={`${artist.utilisation}% utilisation`}><i style={{ width: `${Math.min(100, artist.utilisation)}%` }} /></div><b>{artist.utilisation}%</b></div>)}</div> : <KgdEmpty>No artist data yet.</KgdEmpty>}</section>
    </>}
  </KgdPage>;
}
