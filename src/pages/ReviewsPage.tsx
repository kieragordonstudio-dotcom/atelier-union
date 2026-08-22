import { Seo } from '../components/common/Seo';
import { reviews } from '../data/reviews';

export function ReviewsPage() {
  return (
    <>
      <Seo
        title="Client notes"
        description="Fictional demonstration reviews for the Atelier Union concept website."
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">CLIENT NOTES</p>
          <h1>What clients say.</h1>
          <p className="lead">
            These are illustrative reviews for the concept site. They are not
            verified Google, Trustpilot or third-party reviews.
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
