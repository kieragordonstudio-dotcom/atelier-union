import { Seo } from '../components/common/Seo';
import { siteConfig } from '../config/site';

export function PoliciesPage() {
  return (
    <>
      <Seo
        title="Policies"
        description="Atelier Union booking, cancellation, hygiene and finish guarantee policies."
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">POLICIES</p>
          <h1>Clear before you arrive.</h1>
          <p className="lead">
            The practical things to know before booking.
          </p>
        </div>
      </section>
      <section className="section tight">
        <div className="container policy-grid">
          <article className="info-panel">
            <p className="eyebrow">Booking</p>
            <h3>Demo deposit</h3>
            <p>{siteConfig.bookingPolicy}</p>
          </article>
          <article className="info-panel">
            <p className="eyebrow">Cancellation</p>
            <h3>Twenty-four hours</h3>
            <p>{siteConfig.cancellation}</p>
          </article>
          <article className="info-panel">
            <p className="eyebrow">Hygiene</p>
            <h3>Clean between every client.</h3>
            <p>
              Tools are sterilised for every client, single-use items are
              replaced after each appointment, and every desk is cleaned and
              reset before the next service.
            </p>
          </article>
          <article className="info-panel">
            <p className="eyebrow">Guarantee</p>
            <h3>Seven-day finish</h3>
            <p>{siteConfig.guarantee}</p>
          </article>
        </div>
      </section>
    </>
  );
}
