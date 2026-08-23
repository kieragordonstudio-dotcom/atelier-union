import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';

    if (!location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }

    const targetId = decodeURIComponent(location.hash.slice(1));
    const scrollToTarget = () => {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ block: 'start', behavior });
        return true;
      }
      return false;
    };

    if (scrollToTarget()) return;
    const timeout = window.setTimeout(scrollToTarget, 80);
    return () => window.clearTimeout(timeout);
  }, [location.hash, location.key, location.pathname, location.search]);

  return null;
}

export function App() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <>
      <ScrollManager />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header quiet={isHome} />
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
