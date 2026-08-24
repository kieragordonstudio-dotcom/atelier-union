import { ButtonLink } from '../components/common/Button';
import { Seo } from '../components/common/Seo';
import { usePublicData } from '../data/PublicDataProvider';

export function ArtistsPage() {
  const { artists } = usePublicData();
  return (
    <>
      <Seo
        title="Meet your artist"
        description="Meet the Atelier Union nail artists and book by specialist."
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">THE ARTISTS</p>
          <h1>Meet your artist.</h1>
          <p className="lead">
            Choose a specialist, or select Any Nail Artist to see the earliest
            appointments.
          </p>
        </div>
      </section>
      <section className="section tight">
        <div className="container artist-grid">
          {artists.map((artist) => (
            <article className="artist-card" key={artist.id}>
              <figure className="image-frame">
                <img src={artist.image} alt={`${artist.name} portrait`} />
              </figure>
              <div className="artist-card-content">
                <p className="eyebrow">{artist.role}</p>
                <h2 className="serif" style={{ fontSize: 'var(--step-3)' }}>
                  {artist.name}
                </h2>
                <p>{artist.profile}</p>
                <p className="price">Next available: {artist.nextAvailable}</p>
                <ul className="tag-list">
                  {artist.specialties.map((specialty) => (
                    <li key={specialty}>{specialty}</li>
                  ))}
                </ul>
                <div className="button-row" style={{ marginTop: 'var(--space-6)' }}>
                  <ButtonLink to={`/book?artist=${artist.id}`} tone="accent">
                    Book with this artist
                  </ButtonLink>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
