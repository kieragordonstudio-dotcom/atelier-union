import { Seo } from '../components/common/Seo';

export function PrivacyPage() {
  return (
    <>
      <Seo
        title="Privacy"
        description="Privacy information for the Atelier Union concept website."
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">PRIVACY</p>
          <h1>Privacy notice.</h1>
          <p className="lead">
            This concept booking form does not send details to a real salon or
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
              a realistic salon booking journey. The details stay on the page.
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
            <h3>For a live salon</h3>
            <p>
              A real salon website would connect forms and payments only after
              adding its own privacy policy.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
