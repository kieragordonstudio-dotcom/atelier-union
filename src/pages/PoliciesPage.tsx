import { Seo } from '../components/common/Seo';
import { siteConfig } from '../config/site';

export function PoliciesPage() {
  return (
    <>
      <Seo
        title="Policies"
        description="Fictional Atelier Union booking, cancellation, hygiene and finish guarantee policies."
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">POLICIES</p>
          <h1>Clear before you arrive.</h1>
          <p className="lead">
            Demonstration policy copy for the concept booking journey.
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
            <h3>Every appointment reset</h3>
            <p>{siteConfig.hygiene}</p>
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
