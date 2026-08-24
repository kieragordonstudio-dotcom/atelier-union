import { Ban, CalendarPlus, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { dateTime, KgdEmpty, KgdPage, money } from '../components';

type Appointment = {
  id: string;
  starts_at: string;
  client_name: string;
  artist_name: string;
  service_name?: string;
  services?: string;
  status: string;
  payment_status: string;
  total_pence: number;
};
type Dashboard = {
  metrics: {
    todayAppointments: number;
    bookings_this_week: number;
    revenue_this_week: number;
    deposits: number;
    outstanding_balances: number;
    new_clients_30_days: number;
    nextAppointment: Appointment | null;
  };
  today: Appointment[];
  upcoming: Appointment[];
};

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Dashboard>('/api/admin/dashboard').then(setData).catch((requestError) => setError(String(requestError)));
  }, []);

  return (
    <KgdPage
      eyebrow="OPERATIONS"
      title="Today at Atelier Union"
      actions={
        <>
          <Link className="kgd-button" to="/KGD/calendar?action=new"><CalendarPlus size={16} />New appointment</Link>
          <Link className="kgd-button" to="/KGD/clients?action=new"><UserPlus size={16} />New client</Link>
          <Link className="kgd-button" to="/KGD/calendar?action=block"><Ban size={16} />Block time</Link>
        </>
      }
    >
      {error ? <p className="kgd-status is-error">{error}</p> : null}
      {!data ? <p className="kgd-loading-inline">Loading dashboard...</p> : (
        <>
          <section className="kgd-metric-strip" aria-label="Salon summary">
            <div><span>Today</span><strong>{data.metrics.todayAppointments}</strong></div>
            <div><span>Bookings this week</span><strong>{data.metrics.bookings_this_week}</strong></div>
            <div><span>Revenue this week</span><strong>{money(data.metrics.revenue_this_week)}</strong></div>
            <div><span>Deposits</span><strong>{money(data.metrics.deposits)}</strong></div>
            <div><span>Outstanding</span><strong>{money(data.metrics.outstanding_balances)}</strong></div>
            <div><span>New clients, 30 days</span><strong>{data.metrics.new_clients_30_days}</strong></div>
          </section>

          <div className="kgd-two-column">
            <section className="kgd-section">
              <header><div><p className="kgd-eyebrow">SCHEDULE</p><h2>Today</h2></div></header>
              {data.today.length ? (
                <div className="kgd-list">
                  {data.today.map((appointment) => (
                    <Link className="kgd-list-row" to={`/KGD/calendar?appointment=${appointment.id}`} key={appointment.id}>
                      <time>{new Date(appointment.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time>
                      <span><strong>{appointment.client_name}</strong><small>{appointment.services}</small></span>
                      <span>{appointment.artist_name}</span>
                      <span className={`kgd-badge is-${appointment.status}`}>{appointment.status.replace('_', ' ')}</span>
                    </Link>
                  ))}
                </div>
              ) : <KgdEmpty>No appointments today.</KgdEmpty>}
            </section>

            <section className="kgd-section">
              <header><div><p className="kgd-eyebrow">FORWARD VIEW</p><h2>Upcoming</h2></div></header>
              {data.upcoming.length ? (
                <div className="kgd-list">
                  {data.upcoming.map((appointment) => (
                    <Link className="kgd-list-row is-compact" to={`/KGD/calendar?appointment=${appointment.id}`} key={appointment.id}>
                      <span><strong>{appointment.client_name}</strong><small>{dateTime(appointment.starts_at)} · {appointment.service_name}</small></span>
                      <span>{appointment.artist_name}</span>
                      <strong>{money(appointment.total_pence)}</strong>
                    </Link>
                  ))}
                </div>
              ) : <KgdEmpty>No upcoming appointments yet.</KgdEmpty>}
            </section>
          </div>
        </>
      )}
    </KgdPage>
  );
}
