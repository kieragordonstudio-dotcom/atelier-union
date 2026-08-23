import { FormEvent, useState } from 'react';
import { Seo } from '../components/common/Seo';
import { reviews } from '../data/reviews';
import { treatments } from '../data/treatments';

const ratingOptions = ['1', '2', '3', '4', '5'];

type ReviewForm = {
  name: string;
  treatment: string;
  rating: string;
  review: string;
};

export function ReviewsPage() {
  const [form, setForm] = useState<ReviewForm>({
    name: '',
    treatment: '',
    rating: '',
    review: '',
  });
  const [message, setMessage] = useState('');

  function updateField(field: keyof ReviewForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.treatment || !form.rating || !form.review.trim()) {
      setMessage('Please complete every field before submitting.');
      return;
    }

    setMessage(
      'Thanks. This concept form demonstrates the review experience and does not publish or send your review.',
    );
  }

  return (
    <>
      <Seo
        title="Client notes"
        description="Illustrative client notes for the Atelier Union concept website."
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">CLIENT NOTES</p>
          <h1>Client notes</h1>
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
      <section className="section tight" id="write-review">
        <div className="container">
          <div className="review-form-shell">
            <div>
              <p className="eyebrow">YOUR EXPERIENCE</p>
              <h2>Write a review</h2>
              <p className="lead">We’d love to hear about your visit.</p>
            </div>
            <form className="form-grid review-form" onSubmit={submitReview}>
              <label className="field">
                <span>Name</span>
                <input
                  value={form.name}
                  autoComplete="name"
                  maxLength={80}
                  onChange={(event) => updateField('name', event.target.value)}
                />
              </label>
              <label className="field">
                <span>Treatment</span>
                <select
                  value={form.treatment}
                  onChange={(event) => updateField('treatment', event.target.value)}
                >
                  <option value="">Choose treatment</option>
                  {treatments.map((treatment) => (
                    <option key={treatment.id} value={treatment.name}>
                      {treatment.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="rating-field">
                <legend>Rating</legend>
                <div className="rating-options">
                  {ratingOptions.map((rating) => (
                    <label key={rating}>
                      <input
                        type="radio"
                        name="rating"
                        value={rating}
                        checked={form.rating === rating}
                        onChange={(event) => updateField('rating', event.target.value)}
                      />
                      <span>{rating}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="field">
                <span>Your review</span>
                <textarea
                  value={form.review}
                  maxLength={500}
                  onChange={(event) => updateField('review', event.target.value)}
                />
              </label>
              <button className="button accent" type="submit">
                Submit review
              </button>
              <p className="muted" aria-live="polite">
                {message}
              </p>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
