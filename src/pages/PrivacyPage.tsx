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
            Atelier Union is a fictional, self-initiated concept. Its booking
            flow is a working demonstration, not a real salon service.
          </p>
        </div>
      </section>
      <section className="section tight">
        <div className="container policy-grid">
          <article className="info-panel">
            <h3>Information requested</h3>
            <p>
              Test booking details are submitted to the KGD demo backend and
              database to demonstrate the booking and admin workflow. Please do
              not enter real personal information.
            </p>
          </article>
          <article className="info-panel">
            <h3>Payment</h3>
            <p>
              No card details are collected. The payment area is explicitly marked
              as a demo, no real payment is taken, and no information is sent to a
              real salon.
            </p>
          </article>
          <article className="info-panel">
            <h3>Demonstration only</h3>
            <p>
              The submitted details exist only to demonstrate how a connected
              salon booking and owner-area workflow could operate.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
