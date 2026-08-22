import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../components/common/Button';
import { Seo } from '../components/common/Seo';
import { SectionHeading } from '../components/common/SectionHeading';
import {
  addOns,
  treatmentCategories,
  treatments,
  type Treatment,
} from '../data/treatments';

const finderQuestions = [
  { label: 'Colour on my natural nails', tag: 'colour', result: 'signature-gel' },
  { label: 'Extra strength', tag: 'strength', result: 'builder-gel-new' },
  { label: 'Extra length', tag: 'length', result: 'soft-gel-extensions' },
  { label: 'A pedicure', tag: 'pedicure', result: 'gel-pedicure' },
];

export function TreatmentsPage() {
  const [selectedFinder, setSelectedFinder] = useState(finderQuestions[1]);
  const [hasProduct, setHasProduct] = useState<'no' | 'yes'>('no');

  const recommendation = useMemo(() => {
    if (hasProduct === 'yes' && selectedFinder.tag === 'colour') {
      return treatments.find((treatment) => treatment.id === 'gel-manicure-removal');
    }
    return treatments.find((treatment) => treatment.id === selectedFinder.result);
  }, [hasProduct, selectedFinder]);

  return (
    <>
      <Seo
        title="Treatments and prices"
        description="Atelier Union treatments, prices, timings and a simple treatment finder."
      />
      <section className="page-hero">
        <div className="container page-hero-grid">
          <div>
            <p className="eyebrow">TREATMENTS</p>
            <h1>Choose by outcome, not jargon.</h1>
            <p className="lead">
              Every treatment shows the expected time and price before you book.
              Add-ons are explained where the final design can change the price.
            </p>
          </div>
          <figure className="image-frame">
            <img src="/images/sterile-tools.webp" alt="A nail treatment in progress." />
          </figure>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <SectionHeading
            title="Treatment finder."
            copy="Answer two simple questions and go straight to booking with the right service preselected."
          />
          <div className="booking-panel">
            <p className="eyebrow">What are you looking for?</p>
            <div className="finder-grid">
              {finderQuestions.map((question) => (
                <button
                  key={question.label}
                  className={`option-button ${
                    selectedFinder.label === question.label ? 'is-selected' : ''
                  }`}
                  type="button"
                  onClick={() => setSelectedFinder(question)}
                >
                  {question.label}
                </button>
              ))}
            </div>
            <p className="eyebrow" style={{ marginTop: 'var(--space-8)' }}>
              Do you currently have gel, builder gel or extensions on?
            </p>
            <div className="button-row">
              <button
                type="button"
                className={`button ${hasProduct === 'no' ? 'accent' : 'ghost'}`}
                onClick={() => setHasProduct('no')}
              >
                No
              </button>
              <button
                type="button"
                className={`button ${hasProduct === 'yes' ? 'accent' : 'ghost'}`}
                onClick={() => setHasProduct('yes')}
              >
                Yes
              </button>
            </div>
            {recommendation ? (
              <article className="info-panel" style={{ marginTop: 'var(--space-8)' }}>
                <p className="eyebrow">Recommended</p>
                <h3>{recommendation.name}</h3>
                <p className="muted">{recommendation.description}</p>
                <p className="price">
                  {recommendation.duration} min · £{recommendation.price}
                </p>
                <ButtonLink to={`/book?treatment=${recommendation.id}`} tone="accent">
                  Book this treatment
                </ButtonLink>
              </article>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading title="Treatments & prices." />
          {treatmentCategories
            .filter((category) => category.id !== 'addons')
            .map((category) => {
              const categoryTreatments = treatments.filter(
                (treatment: Treatment) => treatment.category === category.id,
              );
              return (
                <div id={category.id} key={category.id} style={{ marginBottom: 'var(--space-12)' }}>
                  <p className="eyebrow">{category.label}</p>
                  <div className="category-list">
                    {categoryTreatments.map((treatment) => (
                      <article className="treatment-row" key={treatment.id}>
                        <h3>{treatment.name}</h3>
                        <p>{treatment.description}</p>
                        <div className="price">
                          {treatment.duration} min · £{treatment.price}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          <div id="addons">
            <p className="eyebrow">Add-ons</p>
            <p className="lead">
              Nail-art pricing varies because complexity changes time. Minimal
              detail is usually selected nails; detailed art needs longer studio time.
            </p>
            <div className="category-list">
              {addOns.map((addOn) => (
                <article className="treatment-row" key={addOn.id}>
                  <h3>{addOn.name}</h3>
                  <p>{addOn.description}</p>
                  <div className="price">
                    +{addOn.duration} min · {addOn.priceLabel}
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="button-row" style={{ marginTop: 'var(--space-10)' }}>
            <ButtonLink to="/book" tone="accent">
              Start booking
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
