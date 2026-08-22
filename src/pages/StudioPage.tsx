import { ButtonLink } from '../components/common/Button';
import { Seo } from '../components/common/Seo';
import { SectionHeading } from '../components/common/SectionHeading';
import { siteConfig } from '../config/site';

const standards = [
  'Consultation before product selection',
  'Sterilised metal tools for every client',
  'Single-use files and buffers where appropriate',
  'Precise shaping before colour',
  'Final inspection under clean light',
  'Aftercare notes before leaving',
];

export function StudioPage() {
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
            <h1>A precision beauty studio, not a nail bar.</h1>
            <p className="lead">
              Appointment-led, carefully reset and designed around natural-nail
              health as much as the finished look.
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
            <h2>Every appointment follows a fixed rhythm.</h2>
            <p className="lead">
              The result should feel effortless, but the process is deliberate.
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
            <h3>Clean without feeling clinical.</h3>
            <p>{siteConfig.hygiene}</p>
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
              title="Quietly central."
              copy="The fictional studio is positioned on Union Street, Aberdeen, close to city-centre transport and planned as an appointment-only destination."
            />
            <div className="category-list">
              {siteConfig.openingHours.map((row) => (
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
