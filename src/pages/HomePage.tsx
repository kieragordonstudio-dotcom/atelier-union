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
    result: 'Builder Gel is probably right for you →',
    to: '/book?treatment=builder-gel-new',
  },
  {
    label: 'I want longer nails',
    result: 'Take a look at Extensions →',
    to: '/book?treatment=soft-gel-extensions',
  },
  {
    label: 'I want colour on my natural nails',
    result: 'A Gel Manicure is a good place to start →',
    to: '/book?treatment=signature-gel',
  },
  {
    label: 'I already have product that needs removed',
    result: 'Tell us what’s already on your nails →',
    to: '/treatments#treatment-finder',
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
          </div>
          <figure className="image-frame hero-media">
            <img
              src="/images/hero-manicure.webp"
              alt="Close-up of manicured hands with a deep red finish."
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
            copy="From natural finishes to detailed nail art, explore different shapes, colours and finishes."
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
            title="Find your treatment"
            copy="Not sure what to book? Tell us what you want from your nails and we’ll point you in the right direction."
          />
          <div className="category-list">
            {treatmentCategories.map((category) => (
              <article className="category-row" key={category.id}>
                <h3>{category.label}</h3>
                <p>{category.description}</p>
                <Link className="text-link" to={`/treatments#${category.id}`}>
                  View {category.label}
                </Link>
              </article>
            ))}
          </div>

          <div className="recommendation">
            <div>
              <p className="eyebrow">Not sure what to book?</p>
              <h2>Start with what you want.</h2>
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
          <SectionHeading title="Signature treatments" />
          <div className="feature-grid">
            {featuredTreatments.map((treatment) => (
              <article className="feature-card" key={treatment.id}>
                <h3>{treatment.name}</h3>
                <p className="muted">{treatment.description}</p>
                <div className="feature-meta">
                  <span>{treatment.duration} min</span>
                  <span>£{treatment.price}</span>
                </div>
                <Link className="text-link feature-action" to={`/book?treatment=${treatment.id}`}>
                  Book this treatment →
                </Link>
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
              Every appointment follows the same seven-step standard. Thorough
              preparation, precise shaping and a final check before you leave.
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
            title="Meet the artists behind the work."
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
              alt="A manicure treatment in progress."
              loading="lazy"
            />
          </figure>
          <div>
            <p className="eyebrow">HYGIENE</p>
            <h2>Immaculate means more than the finish.</h2>
            <p className="lead">{siteConfig.hygiene}</p>
            <ButtonLink to="/studio">See the studio standard</ButtonLink>
          </div>
        </div>
      </section>

      <section className="section tight finish-guarantee">
        <div className="container">
          <p className="eyebrow">THE FINISH GUARANTEE</p>
          <h2>If something isn’t right, we’ll put it right.</h2>
          <p className="lead">{siteConfig.guarantee}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="EXAMPLE CLIENT NOTES"
            title="Client notes"
            copy="Illustrative content for this concept website."
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
            <ButtonLink to="/reviews#write-review" tone="ghost">
              Write a review
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container studio-standard-grid">
          <div>
            <p className="eyebrow">UNION STREET</p>
            <h2>Find us on Union Street</h2>
            <p className="lead">Union Street, Aberdeen. Right in the city centre.</p>
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

      <section className="section final-cta">
        <div className="container final-cta-inner">
          <p className="eyebrow">BOOKING</p>
          <h2>Ready for your next set?</h2>
          <p className="lead">
            Choose your treatment, artist and appointment time in just a few
            steps.
          </p>
          <div className="button-row">
            <ButtonLink to="/book" tone="dark">
              Book an appointment
            </ButtonLink>
            <ButtonLink to="/treatments" tone="dark">
              Explore treatments
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
