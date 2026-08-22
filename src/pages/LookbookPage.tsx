import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ButtonLink } from '../components/common/Button';
import { Seo } from '../components/common/Seo';
import { lookbook, lookbookFilters, type LookCategory } from '../data/lookbook';

export function LookbookPage() {
  const [params] = useSearchParams();
  const initialLook = params.get('look');
  const [filter, setFilter] = useState<(typeof lookbookFilters)[number]>('All');
  const [activeLookId, setActiveLookId] = useState(initialLook ?? lookbook[0].id);

  const visibleLooks = useMemo(() => {
    if (filter === 'All') return lookbook;
    return lookbook.filter((look) => look.category === (filter as LookCategory));
  }, [filter]);

  const activeLook =
    lookbook.find((look) => look.id === activeLookId) ?? visibleLooks[0];

  return (
    <>
      <Seo
        title="The Lookbook"
        description="Find a finish you love, understand the appointment it needs, then book it."
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">LOOKBOOK</p>
          <h1>The Lookbook.</h1>
          <p className="lead">
            Find a finish you love, understand the appointment it needs, then book it.
          </p>
          <div className="button-row" role="tablist" aria-label="Lookbook filters">
            {lookbookFilters.map((item) => (
              <button
                key={item}
                className={`filter-button ${filter === item ? 'is-selected' : ''}`}
                type="button"
                role="tab"
                aria-selected={filter === item}
                onClick={() => {
                  setFilter(item);
                  const nextLook =
                    item === 'All'
                      ? lookbook[0]
                      : lookbook.find((look) => look.category === item);
                  if (nextLook) setActiveLookId(nextLook.id);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container lookbook-grid">
          {visibleLooks.map((look) => (
            <article className="look-card" key={look.id}>
              <button
                type="button"
                className="image-frame"
                onClick={() => setActiveLookId(look.id)}
                aria-label={`View ${look.name}`}
              >
                <img src={look.image} alt={look.alt} loading="lazy" />
              </button>
              <div>
                <h3>{look.name}</h3>
                <p className="muted">{look.description}</p>
                <div className="look-meta">
                  <span>{look.category}</span>
                  <span>{look.complexity}</span>
                  <span>{look.additionalTime}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {activeLook ? (
        <section className="section tight" style={{ background: 'var(--color-surface)' }}>
          <div className="container studio-standard-grid">
            <figure className="image-frame" style={{ aspectRatio: '4 / 5' }}>
              <img src={activeLook.image} alt={activeLook.alt} />
            </figure>
            <div>
              <p className="eyebrow">Selected look</p>
              <h2>{activeLook.name}</h2>
              <p className="lead">{activeLook.description}</p>
              <div className="category-list">
                <div className="simple-row">
                  <h3>Suggested treatment</h3>
                  <p>{activeLook.suggestedBaseTreatment}</p>
                  <span />
                </div>
                <div className="simple-row">
                  <h3>Add-on</h3>
                  <p>{activeLook.addOnPrice}</p>
                  <span>{activeLook.additionalTime}</span>
                </div>
                <div className="simple-row">
                  <h3>Artist</h3>
                  <p>{activeLook.artist}</p>
                  <span />
                </div>
              </div>
              <div className="button-row" style={{ marginTop: 'var(--space-8)' }}>
                <ButtonLink
                  to={`/book?treatment=${activeLook.suggestedBaseTreatment}${
                    activeLook.addOn ? `&addon=${activeLook.addOn}` : ''
                  }&look=${activeLook.id}`}
                  tone="accent"
                >
                  Book this look
                </ButtonLink>
                <Link className="button-link ghost" to="/treatments">
                  Compare treatments
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
