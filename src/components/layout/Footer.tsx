import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';
import { usePublicData } from '../../data/PublicDataProvider';

const footerLinks = [
  { label: 'Treatments', to: '/treatments' },
  { label: 'Lookbook', to: '/lookbook' },
  { label: 'Artists', to: '/artists' },
  { label: 'Book', to: '/book' },
  { label: 'Policies', to: '/policies' },
  { label: 'Privacy', to: '/privacy' },
];

export function Footer() {
  const { website } = usePublicData();
  const socials = [
    { label: 'Instagram', href: website.instagramUrl },
    { label: 'Email', href: website.emailUrl },
  ].filter((social) => social.href);

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
              {website.addressLine1}
              <br />
              {website.city} {website.postcode}
              <br />
              {website.country}
            </p>
            <p>{website.contactLabel}</p>
          </div>
          <div className="footer-links" aria-label="Footer navigation">
            {footerLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
            {socials.map((social) => (
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
