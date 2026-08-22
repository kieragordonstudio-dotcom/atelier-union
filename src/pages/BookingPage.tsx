import { BookingShell } from '../components/booking/BookingShell';
import { Seo } from '../components/common/Seo';

export function BookingPage() {
  return (
    <>
      <Seo
        title="Book an appointment"
        description="A complete front-end demo booking journey for Atelier Union."
      />
      <section className="page-hero booking-hero">
        <div className="container">
          <p className="eyebrow">BOOKING</p>
          <h1>Book without uncertainty.</h1>
          <p className="lead">
            Demo booking: treatment, artist, time and total stay visible at every
            step. No real payment will be taken.
          </p>
        </div>
      </section>
      <section className="section tight">
        <div className="container">
          <BookingShell />
        </div>
      </section>
    </>
  );
}
