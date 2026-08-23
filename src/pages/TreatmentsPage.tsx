import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../components/common/Button';
import { Seo } from '../components/common/Seo';
import { SectionHeading } from '../components/common/SectionHeading';
import {
  addOns,
  formatPrice,
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

const pedicureProductOptions = [
  { label: 'Nothing to remove', value: 'none' },
  { label: 'Gel to remove', value: 'gel' },
] as const;

type FinderQuestion = (typeof finderQuestions)[number];
type PedicureProduct = (typeof pedicureProductOptions)[number]['value'];
type Recommendation = {
  treatment: Treatment;
  product?: ProductOn;
  note?: string;
};

function getTreatment(id: string) {
  return treatments.find((treatment) => treatment.id === id);
}

function bookingPath(treatmentId: string, product?: ProductOn) {
  const params = new URLSearchParams({ treatment: treatmentId });
  if (product && product !== 'none') params.set('product', product);
  return `/book?${params.toString()}`;
}

function recommendationFor(
  selectedFinder: FinderQuestion | null,
  productOn: ProductOn | null,
  pedicureProduct: PedicureProduct | null,
): Recommendation | null {
  if (!selectedFinder) return null;

  if (selectedFinder.tag === 'pedicure') {
    if (!pedicureProduct) return null;
    const treatment = getTreatment(
      pedicureProduct === 'gel' ? 'gel-pedicure' : 'signature-pedicure',
    );
    if (!treatment) return null;
    return {
      treatment,
      note:
        pedicureProduct === 'gel'
          ? 'Existing gel on toes can be confirmed during booking.'
          : undefined,
    };
  }

  if (!productOn) return null;

  if (selectedFinder.tag === 'colour') {
    if (productOn === 'gel') {
      const treatment = getTreatment('gel-manicure-removal');
      return treatment ? { treatment } : null;
    }
    const treatment = getTreatment('signature-gel');
    return treatment
      ? { treatment, product: productOn === 'none' ? undefined : productOn }
      : null;
  }

  if (selectedFinder.tag === 'strength') {
    const treatment =
      productOn === 'builder'
        ? getTreatment('builder-gel-infill')
        : getTreatment('builder-gel-new');
    return treatment
      ? {
          treatment,
          product:
            productOn === 'none' || productOn === 'builder'
              ? undefined
              : productOn,
        }
      : null;
  }

  if (selectedFinder.tag === 'length') {
    const treatment =
      productOn === 'extensions'
        ? getTreatment('extension-infill')
        : getTreatment('soft-gel-extensions');
    return treatment
      ? {
          treatment,
          product:
            productOn === 'none' || productOn === 'extensions'
              ? undefined
              : productOn,
        }
      : null;
  }

  const treatment = getTreatment(selectedFinder.result);
  return treatment ? { treatment } : null;
}

function recommendationPrice(recommendation: Recommendation) {
  const removal =
    recommendation.product && recommendation.treatment.allowsProductRemoval
      ? productRemoval[recommendation.product]
      : productRemoval.none;

  return {
    duration: recommendation.treatment.duration + removal.duration,
    price: recommendation.treatment.price + removal.price,
  };
}

export function TreatmentsPage() {
  const [selectedFinder, setSelectedFinder] = useState<FinderQuestion | null>(null);
  const [productOn, setProductOn] = useState<ProductOn | null>(null);
  const [pedicureProduct, setPedicureProduct] = useState<PedicureProduct | null>(
    null,
  );

  const recommendation = useMemo(() => {
    return recommendationFor(selectedFinder, productOn, pedicureProduct);
  }, [pedicureProduct, productOn, selectedFinder]);

  const recommendationTotal = recommendation
    ? recommendationPrice(recommendation)
    : null;
  const showProductQuestion =
    selectedFinder !== null && selectedFinder.tag !== 'pedicure';
  const showPedicureQuestion = selectedFinder?.tag === 'pedicure';

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

      <section className="section tight" id="treatment-finder">
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
                    selectedFinder?.label === question.label ? 'is-selected' : ''
                  }`}
                  type="button"
                  onClick={() => {
                    setSelectedFinder(question);
                    setProductOn(null);
                    setPedicureProduct(null);
                  }}
                >
                  {question.label}
                </button>
              ))}
            </div>
            {showProductQuestion ? (
              <>
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
              </>
            ) : null}
            {showPedicureQuestion ? (
              <>
                <p className="eyebrow" style={{ marginTop: 'var(--space-8)' }}>
                  Do you currently have gel on your toes?
                </p>
                <div className="finder-grid">
                  {pedicureProductOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`option-button ${
                        pedicureProduct === option.value ? 'is-selected' : ''
                      }`}
                      onClick={() => setPedicureProduct(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {recommendation ? (
              <article className="info-panel" style={{ marginTop: 'var(--space-8)' }}>
                <p className="eyebrow">Suggested appointment</p>
                <h3>{recommendation.treatment.name}</h3>
                <p className="muted">{recommendation.treatment.description}</p>
                {recommendation.note ? (
                  <p className="muted">{recommendation.note}</p>
                ) : null}
                <p className="price">
                  {recommendationTotal?.duration} min ·{' '}
                  {formatPrice(recommendationTotal?.price ?? 0)}
                </p>
                <ButtonLink
                  to={bookingPath(recommendation.treatment.id, recommendation.product)}
                  tone="accent"
                >
                  Book this treatment
                </ButtonLink>
              </article>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading title="Treatments & prices" />
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
                      <article
                        className="treatment-row treatment-list-row"
                        key={treatment.id}
                      >
                        <h3>{treatment.name}</h3>
                        <p>{treatment.description}</p>
                        <div className="price">
                          {treatment.duration} min · £{treatment.price}
                        </div>
                        <Link
                          className="text-link row-action"
                          to={bookingPath(treatment.id)}
                        >
                          Book →
                        </Link>
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
