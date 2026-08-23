const trustItems = [
  '7-day finish guarantee',
  'Specialist nail artists',
  'Clear prices before booking',
  'Sterilised tools for every client',
];

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Studio trust points">
      <div className="container trust-strip-grid">
        {trustItems.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}
