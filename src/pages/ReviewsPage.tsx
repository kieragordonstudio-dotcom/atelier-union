import { Seo } from '../components/common/Seo';
import { reviews } from '../data/reviews';

export function ReviewsPage() {
  return (
    <>
      <Seo
        title="Client notes"
        description="Illustrative client notes for the Atelier Union concept website."
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">CLIENT NOTES</p>
          <h1>Client notes.</h1>
          <p className="lead">
            Illustrative content for this concept website.
          </p>
        </div>
      </section>
      <section className="section tight">
        <div className="container review-grid">
          {reviews.map((review) => (
            <article className="review-card" key={review.name}>
              <p>{review.body}</p>
              <p className="eyebrow">{review.name} · {review.treatment}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
