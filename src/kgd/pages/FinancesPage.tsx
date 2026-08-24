import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import { KgdEmpty, KgdPage, KgdStatus, money } from '../components';

type Finances = {
  range: number;
  summary: { booked_revenue: number; completed_revenue: number; deposits: number; outstanding_balances: number; refunds_adjustments: number; taxSetAsidePercent: number; estimatedTaxSetAside: number };
  months: Array<{ month: string; booked: number; completed: number }>;
};

export function FinancesPage() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<Finances | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { setData(null); apiFetch<Finances>(`/api/admin/finances?range=${range}`).then(setData).catch((requestError) => setError(requestError instanceof ApiError ? requestError.message : 'Finance data could not be loaded.')); }, [range]);
  return <KgdPage eyebrow="SALON FINANCES" title="Finances" actions={<><div className="kgd-segmented" aria-label="Finance range">{[7, 30, 90].map((days) => <button className={range === days ? 'is-active' : ''} type="button" key={days} onClick={() => setRange(days)}>{days} days</button>)}</div><a className="kgd-button" href="/api/admin/finances/export.csv"><Download size={16} />Export CSV</a></>}>
    {error ? <KgdStatus message={error} error /> : null}
    {!data ? <p className="kgd-loading-inline">Loading finances...</p> : <><section className="kgd-metric-strip"><div><span>Booked revenue</span><strong>{money(data.summary.booked_revenue)}</strong></div><div><span>Completed revenue</span><strong>{money(data.summary.completed_revenue)}</strong></div><div><span>Deposits</span><strong>{money(data.summary.deposits)}</strong></div><div><span>Outstanding</span><strong>{money(data.summary.outstanding_balances)}</strong></div><div><span>Refunds / adjustments</span><strong>{money(data.summary.refunds_adjustments)}</strong></div></section><div className="kgd-two-column"><section className="kgd-section"><header><div><p className="kgd-eyebrow">PLANNING ESTIMATE</p><h2>Tax set-aside</h2></div></header><div className="kgd-tax"><strong>{money(data.summary.estimatedTaxSetAside)}</strong><span>{data.summary.taxSetAsidePercent}% of completed revenue</span><p>Planning estimate only. This is not tax advice.</p></div></section><section className="kgd-section"><header><div><p className="kgd-eyebrow">12-MONTH VIEW</p><h2>Monthly totals</h2></div></header>{data.months.length ? <div className="kgd-ranked-list">{data.months.map((month) => <div key={month.month}><strong>{new Date(`${month.month}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong><small>Booked {money(month.booked)}</small><b>{money(month.completed)} completed</b></div>)}</div> : <KgdEmpty>No financial activity yet.</KgdEmpty>}</section></div></>}
  </KgdPage>;
}
