import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';

const footerLinks = [
  { label: 'Treatments', to: '/treatments' },
  { label: 'Lookbook', to: '/lookbook' },
  { label: 'Artists', to: '/artists' },
  { label: 'Book', to: '/book' },
  { label: 'Policies', to: '/policies' },
  { label: 'Privacy', to: '/privacy' },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <p className="wordmark">{siteConfig.name}</p>
            <p className="lead">{siteConfig.footer}</p>
          </div>
          <div>
            <p className="eyebrow">Visit</p>
            <p>
              {siteConfig.address.line1}
              <br />
              {siteConfig.address.city} {siteConfig.address.postcode}
              <br />
              {siteConfig.address.country}
            </p>
            <p>{siteConfig.contactPlaceholder}</p>
          </div>
          <div className="footer-links" aria-label="Footer navigation">
            {footerLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
            {siteConfig.socials.map((social) => (
              <a key={social.label} href={social.href}>
                {social.label}
              </a>
            ))}
          </div>
        </div>
        <p className="footer-small">
          {siteConfig.demoDisclaimer}
        </p>
      </div>
    </footer>
  );
}
