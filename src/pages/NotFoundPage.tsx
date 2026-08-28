import { ButtonLink } from '../components/common/Button';
import { Seo } from '../components/common/Seo';

export function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" description="The requested Atelier Union page could not be found." />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">404</p>
          <h1>Page not found.</h1>
          <div className="button-row">
            <ButtonLink to="/">Home</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
