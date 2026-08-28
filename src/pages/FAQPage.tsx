import { FAQAccordion, type FAQItem } from '../components/common/FAQAccordion';
import { Seo } from '../components/common/Seo';
import { siteConfig } from '../config/site';
import { usePublicData } from '../data/PublicDataProvider';

function formatPounds(pence: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100);
}

const staticFaqs: FAQItem[] = [
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
  const { bookingSettings } = usePublicData();
  const deposit = formatPounds(bookingSettings.depositPence);
  const cutoff = `${bookingSettings.cancellationCutoffHours} ${bookingSettings.cancellationCutoffHours === 1 ? 'hour' : 'hours'}`;
  const faqs = [
    ...staticFaqs.slice(0, 9),
    {
      question: 'What is the cancellation policy?',
      answer: `Free changes are available up to ${cutoff} before the appointment. Cancellations within ${cutoff} may result in loss of the ${deposit} deposit.`,
    },
    ...staticFaqs.slice(9),
  ];

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
