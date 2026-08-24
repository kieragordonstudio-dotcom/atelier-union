import { Link } from 'react-router-dom';
import { usePublicData } from '../../data/PublicDataProvider';

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
  const { website } = usePublicData();
  const firstHours = website.openingHours[0];
  const lastHours = website.openingHours[website.openingHours.length - 1];

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
        <span>{website.addressLine1}, {website.city}</span>
        {firstHours && lastHours ? <span>{firstHours.days} - {lastHours.days}</span> : null}
        <span>{website.contactLabel}</span>
      </div>
    </aside>
  );
}
