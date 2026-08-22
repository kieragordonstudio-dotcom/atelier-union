import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { siteConfig } from './config/site';

export function App() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header quiet={isHome} />
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
      <p className="demo-ribbon">{siteConfig.demoDisclaimer}</p>
    </>
  );
}
