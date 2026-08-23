export type Review = {
  name: string;
  treatment: string;
  body: string;
};

export const reviews: Review[] = [
  {
    name: 'Claire M.',
    treatment: 'Builder Gel',
    body: 'My nails looked polished but still like my own nails. The appointment felt calm and unhurried.',
  },
  {
    name: 'Aisha K.',
    treatment: 'Micro French',
    body: 'The French line was so fine. I normally feel rushed in salons, but not here.',
  },
  {
    name: 'Beth R.',
    treatment: 'Gel Manicure',
    body: 'Clear pricing, beautiful finish and no awkward upselling. I booked my next appointment before leaving.',
  },
  {
    name: 'Megan T.',
    treatment: 'Removal & Repair',
    body: 'They explained what my nails needed and did not push a service that would have been wrong for them.',
  },
  {
    name: 'Louise A.',
    treatment: 'Chrome',
    body: 'Subtle chrome, not flashy. Exactly what I had saved, but cleaner.',
  },
  {
    name: 'Hannah S.',
    treatment: 'Pedicure',
    body: 'A very tidy, professional pedicure. The studio felt spotless without feeling clinical.',
  },
  {
    name: 'Nadia F.',
    treatment: 'Extensions',
    body: 'I wanted length but nothing bulky. Isla understood the shape straight away.',
  },
  {
    name: 'Emma W.',
    treatment: 'Signature Gel',
    body: 'The booking process was simple and the treatment matched the description. That should be normal, but it rarely is.',
  },
  {
    name: 'Jade P.',
    treatment: 'Builder Infill',
    body: 'Four weeks later the structure still looked balanced. Very careful work.',
  },
];
