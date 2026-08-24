import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Gauge,
  Globe2,
  Images,
  Menu,
  Scissors,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ApiError, apiFetch, getSession, resetApiSession } from '../lib/api';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CalendarPage } from './pages/CalendarPage';
import { ClientsPage } from './pages/ClientsPage';
import { DashboardPage } from './pages/DashboardPage';
import { FinancesPage } from './pages/FinancesPage';
import { LookbookPage } from './pages/LookbookPage';
import { ServicesPage } from './pages/ServicesPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeamPage } from './pages/TeamPage';
import { WebsitePage } from './pages/WebsitePage';
import './kgd.css';

export type KgdUser = { id: string; email: string; role: 'owner' | 'admin' | 'guest'; businessId: string };

const navigation = [
  { to: '/KGD', label: 'Dashboard', icon: Gauge, end: true },
  { to: '/KGD/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/KGD/clients', label: 'Clients', icon: Users },
  { to: '/KGD/services', label: 'Services', icon: Scissors },
  { to: '/KGD/team', label: 'Team', icon: Users },
  { to: '/KGD/lookbook', label: 'Lookbook', icon: Images },
  { to: '/KGD/website', label: 'Website', icon: Globe2 },
  { to: '/KGD/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/KGD/finances', label: 'Finances', icon: CircleDollarSign },
  { to: '/KGD/settings', label: 'Settings', icon: Settings },
];

const guestNavigation = navigation.filter(({ label }) =>
  ['Services', 'Team', 'Lookbook', 'Website', 'Analytics'].includes(label),
);

function Login({ onLogin }: { onLogin: (user: KgdUser) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await apiFetch<{ user: KgdUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      onLogin(result.user);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError ? requestError.message : 'Sign in failed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="kgd kgd-login-shell">
      <section className="kgd-login-panel">
        <p className="kgd-mark">KGD</p>
        <p className="kgd-eyebrow">ATELIER UNION OPERATIONS</p>
        <h1>Sign in</h1>
        <form className="kgd-form" onSubmit={submit}>
          <label>
            <span>Username or email</span>
            <input autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error ? <p className="kgd-status is-error" role="alert">{error}</p> : null}
          <button className="kgd-button is-primary" type="submit" disabled={submitting}>
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}

function KgdLayout({ user, onLogout }: { user: KgdUser; onLogout: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const guest = user.role === 'guest';
  const visibleNavigation = guest ? guestNavigation : navigation;
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className={`kgd kgd-shell ${guest ? 'is-guest' : ''}`}>
      <header className="kgd-mobile-header">
        <span className="kgd-mark">KGD</span>
        <button className="kgd-icon-button" type="button" onClick={() => setMenuOpen((open) => !open)} title="Navigation">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      <aside className={`kgd-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="kgd-brand">
          <span className="kgd-mark">KGD</span>
          <span>ATELIER UNION</span>
        </div>
        <nav aria-label="KGD navigation">
          {visibleNavigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={17} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="kgd-sidebar-footer">
          <span>{user.email}</span>
          <button type="button" onClick={onLogout}>Log out</button>
        </div>
      </aside>
      <main className="kgd-main">
        {guest ? <p className="kgd-status">Guest preview · Read-only access</p> : null}
        <fieldset className="kgd-guest-content" disabled={guest}>
          <Routes>
            <Route index element={guest ? <Navigate to="/KGD/services" replace /> : <DashboardPage />} />
            <Route path="calendar" element={guest ? <Navigate to="/KGD/services" replace /> : <CalendarPage />} />
            <Route path="clients" element={guest ? <Navigate to="/KGD/services" replace /> : <ClientsPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="lookbook" element={<LookbookPage />} />
            <Route path="website" element={<WebsitePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="finances" element={guest ? <Navigate to="/KGD/services" replace /> : <FinancesPage />} />
            <Route path="settings" element={guest ? <Navigate to="/KGD/services" replace /> : <SettingsPage user={user} onLogout={onLogout} />} />
            <Route path="*" element={<Navigate to={guest ? '/KGD/services' : '/KGD'} replace />} />
          </Routes>
        </fieldset>
      </main>
    </div>
  );
}

export function KgdApp() {
  const [user, setUser] = useState<KgdUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'KGD | Atelier Union';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex, nofollow';
    getSession()
      .then((session) => setUser(session.authenticated ? (session.user as KgdUser) : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      resetApiSession();
      setUser(null);
    }
  }

  if (loading) return <main className="kgd kgd-loading">Loading KGD...</main>;
  if (!user) return <Login onLogin={setUser} />;
  return <KgdLayout user={user} onLogout={() => void logout()} />;
}
