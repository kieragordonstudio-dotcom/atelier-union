import { FAQAccordion, type FAQItem } from '../components/common/FAQAccordion';
import { Seo } from '../components/common/Seo';
import { siteConfig } from '../config/site';

const faqs: FAQItem[] = [
  {
    question: 'What should I book if I am unsure?',
    answer:
      'Use the treatment finder or book a Signature Gel Manicure if you want colour on natural nails. If strength is the concern, choose Builder Gel.',
  },
  {
    question: 'What is builder gel?',
    answer:
      'Builder gel is a structured overlay for natural nails. It adds strength and shape without requiring an extension tip.',
  },
  {
    question: 'Do I need removal?',
    answer:
      'Yes, if you currently have gel, builder gel or extensions on. Select the product type during booking so enough time is reserved.',
  },
  {
    question: 'How long will my appointment take?',
    answer:
      'The booking summary updates as you choose treatments, removal and add-ons. Most appointments range from 45 to 90 minutes.',
  },
  {
    question: 'How early should I arrive?',
    answer:
      'Please arrive five minutes before your appointment so consultation can begin on time.',
  },
  {
    question: 'What happens if I am late?',
    answer:
      'If you arrive late, we may need to simplify the service or reschedule if there is no longer enough time to complete it properly.',
  },
  {
    question: 'Can you repair one broken nail?',
    answer:
      'Yes. Book Nail Repair if it is a standalone repair, or add a note to your appointment if it is part of another service.',
  },
  {
    question: 'How does nail-art pricing work?',
    answer:
      'Micro French and chrome have fixed add-on prices. Minimal and detailed art start from the listed price because time and complexity vary.',
  },
  {
    question: 'What is the Finish Guarantee?',
    answer: siteConfig.guarantee,
  },
  {
    question: 'What is the cancellation policy?',
    answer: siteConfig.cancellation,
  },
  {
    question: 'Can I choose my Nail Artist?',
    answer:
      'Yes. You can choose Maya, Sophie or Isla, or select Any Nail Artist to see the earliest appointments.',
  },
  {
    question: 'How often should builder gel be infilled?',
    answer:
      'Most builder-gel clients return every three to four weeks, depending on growth and wear.',
  },
];

export function FAQPage() {
  return (
    <>
      <Seo
        title="FAQ"
        description="Frequently asked questions about Atelier Union treatments, booking and policies."
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">FAQ</p>
          <h1>Before you book.</h1>
          <p className="lead">
            Clear answers to the questions that usually decide the right
            appointment.
          </p>
        </div>
      </section>
      <section className="section tight">
        <div className="container">
          <FAQAccordion items={faqs} />
        </div>
      </section>
    </>
  );
}
