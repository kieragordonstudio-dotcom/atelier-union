import { Seo } from '../components/common/Seo';

export function PrivacyPage() {
  return (
    <>
      <Seo
        title="Privacy"
        description="Privacy information for the fictional Atelier Union concept website."
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">PRIVACY</p>
          <h1>Demo privacy notice.</h1>
          <p className="lead">
            This concept site does not send booking details to a live salon or
            payment provider.
          </p>
        </div>
      </section>
      <section className="section tight">
        <div className="container policy-grid">
          <article className="info-panel">
            <h3>Information requested</h3>
            <p>
              The mock booking form asks for name, mobile and email to demonstrate
              a realistic salon workflow. The data is not transmitted to a backend.
            </p>
          </article>
          <article className="info-panel">
            <h3>Payment</h3>
            <p>
              No card details are collected. The payment area is explicitly marked
              as a demo and does not process money.
            </p>
          </article>
          <article className="info-panel">
            <h3>Template use</h3>
            <p>
              If this template becomes a live business website, connect forms,
              payments and analytics only after adding a real privacy policy.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
