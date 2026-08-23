import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { siteConfig } from '../../config/site';
import { MobileMenu } from './MobileMenu';

const navItems = [
  { label: 'Treatments', to: '/treatments' },
  { label: 'Lookbook', to: '/lookbook' },
  { label: 'Artists', to: '/artists' },
  { label: 'Studio', to: '/studio' },
  { label: 'Book', to: '/book' },
];

export function Header({ quiet = false }: { quiet?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-open', open);
    return () => document.body.classList.remove('menu-open');
  }, [open]);

  return (
    <>
      <header
        className={`site-header ${scrolled || !quiet ? 'is-solid' : ''} ${
          open ? 'is-open' : ''
        }`}
      >
        <div className="header-inner">
          <div className="brand-lockup">
            <Link className="wordmark" to="/" onClick={() => setOpen(false)}>
              {siteConfig.name}
            </Link>
            <span className="concept-marker">Concept website</span>
          </div>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.slice(0, -1).map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <Link className="button-link ghost mobile-book" to="/book">
              Book
            </Link>
            <Link className="button-link ghost desktop-book" to="/book">
              Book
            </Link>
            <button
              className="menu-button"
              type="button"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((current) => !current)}
            >
              {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={open} onNavigate={() => setOpen(false)} />
    </>
  );
}
