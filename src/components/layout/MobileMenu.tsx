import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';

const links = [
  { label: 'Treatments', to: '/treatments' },
  { label: 'Lookbook', to: '/lookbook' },
  { label: 'Artists', to: '/artists' },
  { label: 'Studio', to: '/studio' },
  { label: 'Reviews', to: '/reviews' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Book', to: '/book' },
];

export function MobileMenu({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}) {
  return (
    <aside
      id="mobile-menu"
      className={`mobile-menu ${open ? 'is-open' : ''}`}
      aria-hidden={!open}
    >
      <nav aria-label="Mobile navigation">
        {links.map((link) => (
          <Link key={link.to} to={link.to} onClick={onNavigate}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="mobile-menu-meta">
        <span>{siteConfig.address.line1}, {siteConfig.address.city}</span>
        <span>{siteConfig.openingHours[0].days} - {siteConfig.openingHours[5].days}</span>
        <span>{siteConfig.phone}</span>
      </div>
    </aside>
  );
}
