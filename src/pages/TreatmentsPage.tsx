import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../components/common/Button';
import { Seo } from '../components/common/Seo';
import { SectionHeading } from '../components/common/SectionHeading';
import {
  addOns,
  productRemoval,
  treatmentCategories,
  treatments,
  type ProductOn,
  type Treatment,
} from '../data/treatments';

const finderQuestions = [
  { label: 'Colour on my natural nails', tag: 'colour', result: 'signature-gel' },
  { label: 'Stronger natural nails', tag: 'strength', result: 'builder-gel-new' },
  { label: 'Longer nails', tag: 'length', result: 'soft-gel-extensions' },
  { label: 'A pedicure', tag: 'pedicure', result: 'gel-pedicure' },
];

const productOptions: Array<{ label: string; value: ProductOn }> = [
  { label: 'Nothing', value: 'none' },
  { label: 'Gel', value: 'gel' },
  { label: 'Builder gel / BIAB', value: 'builder' },
  { label: 'Extensions', value: 'extensions' },
];

export function TreatmentsPage() {
  const [selectedFinder, setSelectedFinder] = useState(finderQuestions[1]);
  const [productOn, setProductOn] = useState<ProductOn>('none');

  const recommendation = useMemo(() => {
    if (productOn === 'gel' && selectedFinder.tag === 'colour') {
      return treatments.find((treatment) => treatment.id === 'gel-manicure-removal');
    }
    if (productOn === 'builder' && selectedFinder.tag === 'strength') {
      return treatments.find((treatment) => treatment.id === 'builder-gel-infill');
    }
    if (productOn === 'extensions' && selectedFinder.tag === 'length') {
      return treatments.find((treatment) => treatment.id === 'extension-infill');
    }
    return treatments.find((treatment) => treatment.id === selectedFinder.result);
  }, [productOn, selectedFinder]);

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
              Every appointment shows exactly what’s included, how long it takes
              and what it costs. If your design needs extra time, you’ll see
              that before you book.
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
            title="Not sure what to book?"
            copy="Tell us what you want from your nails and we’ll suggest the right appointment."
          />
          <div className="booking-panel">
            <p className="eyebrow">What would you like from your appointment?</p>
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
              Do you already have any product on your nails?
            </p>
            <div className="finder-grid">
              {productOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`option-button ${
                    productOn === option.value ? 'is-selected' : ''
                  }`}
                  onClick={() => setProductOn(option.value)}
                >
                  <strong>{option.label}</strong>
                  <br />
                  <span className="muted">
                    {productRemoval[option.value].duration
                      ? `Removal adds ${productRemoval[option.value].duration} min`
                      : 'No removal needed'}
                  </span>
                </button>
              ))}
            </div>
            {recommendation ? (
              <article className="info-panel" style={{ marginTop: 'var(--space-8)' }}>
                <p className="eyebrow">Suggested appointment</p>
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
              work is usually on selected nails; detailed art needs longer
              appointment time.
            </p>
            <div className="category-list">
              {addOns.map((addOn) => (
                <article className="treatment-row" key={addOn.id}>
                  <h3>{addOn.name}</h3>
                  <p>{addOn.description}</p>
                  <div className="price">
                    {addOn.priceLabel} · adds {addOn.duration} min
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
