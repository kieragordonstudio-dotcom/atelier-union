import { Link } from 'react-router-dom';
import { ButtonLink } from '../components/common/Button';
import { Seo } from '../components/common/Seo';
import { SectionHeading } from '../components/common/SectionHeading';
import { TrustStrip } from '../components/common/TrustStrip';
import { siteConfig } from '../config/site';
import { artists } from '../data/artists';
import { lookbook } from '../data/lookbook';
import { reviews } from '../data/reviews';
import { treatmentCategories, treatments } from '../data/treatments';

const recommendationOptions = [
  {
    label: 'I want stronger natural nails',
    result: 'Recommend Builder Gel.',
    to: '/book?treatment=builder-gel-new',
  },
  {
    label: 'I want extra length',
    result: 'Recommend Extensions.',
    to: '/book?treatment=soft-gel-extensions',
  },
  {
    label: 'I want colour on my natural nails',
    result: 'Recommend Gel Manicure.',
    to: '/book?treatment=signature-gel',
  },
  {
    label: 'I already have product that needs removed',
    result: 'Choose the matching removal option during booking.',
    to: '/book?treatment=gel-manicure-removal',
  },
];

const process = [
  'Consultation',
  'Preparation',
  'Precision shaping',
  'Detailed cuticle work',
  'Application',
  'Finish inspection',
  'Aftercare',
];

export function HomePage() {
  const featuredTreatments = treatments.filter((treatment) => treatment.featured);
  const signatureLooks = lookbook.slice(0, 4);

  return (
    <>
      <Seo
        title="Premium nail salon in Aberdeen"
        description={siteConfig.description}
      />
      <section className="hero">
        <div className="wide-container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{siteConfig.eyebrow}</p>
            <h1>{siteConfig.strapline}</h1>
            <p className="lead">{siteConfig.description}</p>
            <div className="button-row">
              <ButtonLink to="/book" tone="accent">
                Book an appointment
              </ButtonLink>
              <ButtonLink to="/treatments" tone="ghost">
                Explore treatments
              </ButtonLink>
            </div>
            <p className="trust-line">4.9 ★ · Loved by our clients</p>
          </div>
          <figure className="image-frame hero-media">
            <img
              src="/images/hero-manicure.webp"
              alt="Editorial close-up of immaculate manicured hands."
            />
          </figure>
        </div>
      </section>

      <TrustStrip />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="OUR WORK"
            title="The work speaks first."
            copy="From immaculate natural finishes to considered detail work, every set is shaped around the person wearing it."
          />
          <div className="signature-grid">
            {signatureLooks.map((look) => (
              <Link
                key={look.id}
                to={`/lookbook?look=${look.id}`}
                className="image-frame signature-card"
              >
                <img src={look.image} alt={look.alt} loading="lazy" />
                <span className="image-label">{look.name}</span>
              </Link>
            ))}
          </div>
          <div className="button-row" style={{ marginTop: 'var(--space-8)' }}>
            <ButtonLink to="/lookbook">Explore the Lookbook</ButtonLink>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <SectionHeading
            title="Find your treatment."
            copy="You do not need to know the terminology. Start with what you want from your nails."
          />
          <div className="category-list">
            {treatmentCategories.map((category) => (
              <article className="category-row" key={category.id}>
                <h3>{category.label}</h3>
                <p>{category.description}</p>
                <Link className="text-link" to={`/treatments#${category.id}`}>
                  View
                </Link>
              </article>
            ))}
          </div>

          <div className="recommendation">
            <div>
              <p className="eyebrow">Not sure what to book?</p>
              <h2>Start with the outcome.</h2>
            </div>
            <div className="recommendation-options">
              {recommendationOptions.map((option) => (
                <Link className="option-button" key={option.label} to={option.to}>
                  <strong>{option.label}</strong>
                  <br />
                  <span className="muted">{option.result}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading title="The essentials." />
          <div className="feature-grid">
            {featuredTreatments.map((treatment) => (
              <article className="feature-card" key={treatment.id}>
                <h3>{treatment.name}</h3>
                <p className="muted">{treatment.description}</p>
                <div className="feature-meta">
                  <span>{treatment.duration} min</span>
                  <span>£{treatment.price}</span>
                </div>
              </article>
            ))}
          </div>
          <div className="button-row" style={{ marginTop: 'var(--space-8)' }}>
            <ButtonLink to="/treatments">View all treatments & prices</ButtonLink>
          </div>
        </div>
      </section>

      <section className="section dark-band">
        <div className="container studio-standard-grid">
          <div>
            <p className="eyebrow">THE STUDIO STANDARD</p>
            <h2>There is a difference in the details.</h2>
            <p className="lead">
              Every appointment follows the same considered process, from
              preparation to final inspection.
            </p>
            <p className="muted">
              No rushed finishes. No skipped preparation. Every appointment is
              completed to the same standard.
            </p>
          </div>
          <div className="process-list">
            {process.map((item, index) => (
              <div className="process-item" key={item}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="THE ARTISTS"
            title="Expertise, with a point of view."
          />
          <div className="artist-grid">
            {artists.map((artist) => (
              <article className="artist-card" key={artist.id}>
                <figure className="image-frame">
                  <img src={artist.image} alt={`${artist.name} at work`} loading="lazy" />
                </figure>
                <div className="artist-card-content">
                  <p className="eyebrow">{artist.role}</p>
                  <h3>{artist.name}</h3>
                  <p className="muted">{artist.profile}</p>
                  <Link className="text-link" to={`/book?artist=${artist.id}`}>
                    Book with {artist.name.split(' ')[0]}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section tight" style={{ background: 'var(--color-surface)' }}>
        <div className="container studio-standard-grid">
          <figure className="image-frame" style={{ aspectRatio: '4 / 5' }}>
            <img
              src="/images/treatment-process.webp"
              alt="A precise manicure treatment in progress."
              loading="lazy"
            />
          </figure>
          <div>
            <p className="eyebrow">HYGIENE</p>
            <h2>A calm studio, reset for every client.</h2>
            <p className="lead">{siteConfig.hygiene}</p>
            <p>{siteConfig.guarantee}</p>
            <ButtonLink to="/studio">See the studio standard</ButtonLink>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="CLIENT NOTES"
            title="Clear, calm and exacting."
            copy="Fictional demonstration reviews, written to show the tone and structure of the finished template."
          />
          <div className="review-grid">
            {reviews.slice(0, 3).map((review) => (
              <article className="review-card" key={review.name}>
                <p>{review.body}</p>
                <p className="eyebrow">{review.name} · {review.treatment}</p>
              </article>
            ))}
          </div>
          <div className="button-row" style={{ marginTop: 'var(--space-8)' }}>
            <ButtonLink to="/reviews">Read client notes</ButtonLink>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container studio-standard-grid">
          <div>
            <p className="eyebrow">UNION STREET</p>
            <h2>In the centre of Aberdeen.</h2>
            <p className="lead">
              A quiet appointment-led studio on Union Street, with clear pricing,
              considered aftercare and booking that takes less than a minute.
            </p>
            <ButtonLink to="/book" tone="accent">
              Book an appointment
            </ButtonLink>
          </div>
          <figure className="image-frame" style={{ aspectRatio: '16 / 10' }}>
            <img
              src="/images/studio-interior.webp"
              alt="A calm contemporary beauty studio interior."
              loading="lazy"
            />
          </figure>
        </div>
      </section>
    </>
  );
}
