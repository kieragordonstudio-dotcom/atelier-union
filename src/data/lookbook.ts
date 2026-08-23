import type { AddOnId } from './treatments';

export type LookCategory =
  | 'Minimal'
  | 'French'
  | 'Chrome'
  | 'Colour'
  | 'Art'
  | 'Occasion';

export type Look = {
  id: string;
  name: string;
  image: string;
  category: LookCategory;
  complexity: 'Low' | 'Medium' | 'High';
  description: string;
  addOnPrice: string;
  additionalTime: string;
  suggestedBaseTreatment: string;
  addOn?: AddOnId;
  artist: string;
  alt: string;
};

export const lookbook: Look[] = [
  {
    id: 'micro-french',
    name: 'Micro French',
    image: '/images/work-micro-french.webp',
    category: 'French',
    complexity: 'Medium',
    description: 'Fine white detailing over a clean natural base.',
    addOnPrice: 'Nail art add-on: +£10 · adds 15 min',
    additionalTime: 'Adds 15 min to your appointment',
    suggestedBaseTreatment: 'signature-gel',
    addOn: 'micro-french',
    artist: 'Maya Fraser',
    alt: 'Close hands with a refined pale manicure suitable for micro French.',
  },
  {
    id: 'oxblood',
    name: 'Oxblood',
    image: '/images/work-oxblood.webp',
    category: 'Colour',
    complexity: 'Low',
    description: 'A deep lacquer colour with crisp shaping and high shine.',
    addOnPrice: 'Included with treatment',
    additionalTime: 'Included with treatment',
    suggestedBaseTreatment: 'signature-gel',
    artist: 'Maya Fraser',
    alt: 'Close-up of hands with deep red polished nails.',
  },
  {
    id: 'natural-builder',
    name: 'Natural Builder',
    image: '/images/work-natural-builder.webp',
    category: 'Minimal',
    complexity: 'Low',
    description: 'A structured natural overlay for strength without bulk.',
    addOnPrice: 'Included with treatment',
    additionalTime: 'Included with treatment',
    suggestedBaseTreatment: 'builder-gel-new',
    artist: 'Maya Fraser',
    alt: 'Close hands showing neat natural nails with a soft finish.',
  },
  {
    id: 'soft-chrome',
    name: 'Soft Chrome',
    image: '/images/work-chrome.webp',
    category: 'Chrome',
    complexity: 'Medium',
    description: 'A restrained reflective finish over a neutral base.',
    addOnPrice: 'Chrome add-on: +£10 · adds 10 min',
    additionalTime: 'Adds 10 min to your appointment',
    suggestedBaseTreatment: 'builder-gel-new',
    addOn: 'chrome',
    artist: 'Sophie Reid',
    alt: 'Hands with polished nails and jewellery in an editorial close-up.',
  },
  {
    id: 'studio-red',
    name: 'Studio Red',
    image: '/images/hero-manicure.webp',
    category: 'Occasion',
    complexity: 'Medium',
    description: 'A deep evening finish with a shorter natural shape.',
    addOnPrice: 'Included with treatment',
    additionalTime: 'Included with treatment',
    suggestedBaseTreatment: 'signature-gel',
    artist: 'Isla Morgan',
    alt: 'Two manicured hands gently touching in a beauty editorial image.',
  },
  {
    id: 'detail-line',
    name: 'Detail Line',
    image: '/images/sterile-tools.webp',
    category: 'Art',
    complexity: 'High',
    description: 'Fine-detail work booked with additional studio time.',
    addOnPrice: 'Detailed nail art: from +£20 · adds 30 min',
    additionalTime: 'Adds 30 min to your appointment',
    suggestedBaseTreatment: 'soft-gel-extensions',
    addOn: 'detailed-art',
    artist: 'Isla Morgan',
    alt: 'Nail technician applying a detailed finish during a manicure.',
  },
];

export const lookbookFilters = [
  'All',
  'Minimal',
  'French',
  'Chrome',
  'Colour',
  'Art',
  'Occasion',
] as const;

export function getLookById(id?: string | null) {
  return lookbook.find((look) => look.id === id);
}
