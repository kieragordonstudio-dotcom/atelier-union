import { ButtonLink } from '../components/common/Button';
import { Seo } from '../components/common/Seo';
import { SectionHeading } from '../components/common/SectionHeading';
import { siteConfig } from '../config/site';
import { usePublicData } from '../data/PublicDataProvider';

const standards = [
  'Consultation before product selection',
  'Sterilised metal tools for every client',
  'Single-use files and buffers where appropriate',
  'Careful shaping before colour',
  'Final inspection under clean light',
  'Aftercare notes before leaving',
];

export function StudioPage() {
  const { website } = usePublicData();

  return (
    <>
      <Seo
        title="The studio"
        description="Atelier Union studio standards, hygiene approach, guarantee and Union Street location."
      />
      <section className="page-hero">
        <div className="container page-hero-grid">
          <div>
            <p className="eyebrow">THE STUDIO</p>
            <h1>A different kind of nail appointment.</h1>
            <p className="lead">
              Calm, thorough and built around the health of your natural nails
              as much as the finished result.
            </p>
          </div>
          <figure className="image-frame">
            <img src="/images/studio-interior.webp" alt="Contemporary salon interior." />
          </figure>
        </div>
      </section>

      <section className="section dark-band">
        <div className="container studio-standard-grid">
          <div>
            <p className="eyebrow">THE STUDIO STANDARD</p>
            <h2>Every appointment. The same standard.</h2>
            <p className="lead">
              The finished result should feel effortless. The process behind it
              is anything but rushed.
            </p>
          </div>
          <div className="process-list">
            {standards.map((standard, index) => (
              <div className="process-item" key={standard}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{standard}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container policy-grid">
          <article className="info-panel">
            <p className="eyebrow">Hygiene</p>
            <h3>Clean between every client.</h3>
            <p>
              Tools are sterilised for every client, single-use items are
              replaced after each appointment, and every desk is cleaned and
              reset before the next service.
            </p>
          </article>
          <article className="info-panel">
            <p className="eyebrow">Product philosophy</p>
            <h3>Structure first.</h3>
            <p>
              We choose product according to the nail in front of us, not by
              habit. If a lighter service is better, we will say so.
            </p>
          </article>
          <article className="info-panel">
            <p className="eyebrow">Guarantee</p>
            <h3>Seven-day finish cover.</h3>
            <p>{siteConfig.guarantee}</p>
          </article>
        </div>
      </section>

      <section className="section tight" style={{ background: 'var(--color-surface)' }}>
        <div className="container studio-standard-grid">
          <figure className="image-frame" style={{ aspectRatio: '4 / 5' }}>
            <img
              src="/images/treatment-process.webp"
              alt="Manicure preparation at a salon desk."
              loading="lazy"
            />
          </figure>
          <div>
            <SectionHeading
              eyebrow="UNION STREET"
              title="Find us on Union Street"
              copy={`${website.addressLine1}, ${website.city}. Right in the city centre.`}
            />
            <div className="category-list">
              {website.openingHours.map((row) => (
                <div className="simple-row" key={row.days}>
                  <h3>{row.days}</h3>
                  <p>{row.hours}</p>
                  <span />
                </div>
              ))}
            </div>
            <div className="button-row" style={{ marginTop: 'var(--space-8)' }}>
              <ButtonLink to="/book" tone="accent">
                Book an appointment
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
