export type TreatmentCategory =
  | 'manicures'
  | 'builder'
  | 'extensions'
  | 'pedicures'
  | 'removal'
  | 'addons';

export type AddOnId =
  | 'micro-french'
  | 'chrome'
  | 'minimal-art'
  | 'detailed-art';

export type ProductOn = 'none' | 'gel' | 'builder' | 'extensions';

export type Treatment = {
  id: string;
  category: TreatmentCategory;
  name: string;
  shortName: string;
  description: string;
  duration: number;
  price: number;
  featured?: boolean;
  acceptsAddOns?: boolean;
  allowsProductRemoval?: boolean;
  finderTags: string[];
};

export type AddOn = {
  id: AddOnId;
  name: string;
  description: string;
  duration: number;
  price: number;
  priceLabel: string;
  compatibleCategories: TreatmentCategory[];
};

export const treatmentCategories: Array<{
  id: TreatmentCategory;
  label: string;
  description: string;
}> = [
  {
    id: 'manicures',
    label: 'Manicures',
    description: 'Natural nail care, gel colour and refined finishes.',
  },
  {
    id: 'builder',
    label: 'Builder Gel',
    description:
      'Strength and structure while keeping the natural nail at the centre.',
  },
  {
    id: 'extensions',
    label: 'Extensions',
    description: 'Added length, shape and lightweight structure.',
  },
  {
    id: 'pedicures',
    label: 'Pedicures',
    description: 'Care, preparation and polished colour.',
  },
  {
    id: 'addons',
    label: 'Nail Art',
    description: 'French, chrome and detailed finishes.',
  },
  {
    id: 'removal',
    label: 'Removal & Repair',
    description: 'Safe removal, infills and individual repairs.',
  },
];

export const treatments: Treatment[] = [
  {
    id: 'signature-gel',
    category: 'manicures',
    name: 'Signature Gel Manicure',
    shortName: 'Gel Manicure',
    description: 'Shape, detailed cuticle work and gel colour.',
    duration: 45,
    price: 46,
    featured: true,
    acceptsAddOns: true,
    allowsProductRemoval: true,
    finderTags: ['colour', 'natural'],
  },
  {
    id: 'naked-manicure',
    category: 'manicures',
    name: 'Naked Manicure',
    shortName: 'Naked Manicure',
    description: 'Detailed natural nail care, buffing and conditioning finish.',
    duration: 40,
    price: 38,
    finderTags: ['natural'],
  },
  {
    id: 'gel-manicure-removal',
    category: 'manicures',
    name: 'Gel Manicure + Removal',
    shortName: 'Gel + Removal',
    description: 'Safe removal followed by fresh cuticle work and gel colour.',
    duration: 65,
    price: 54,
    acceptsAddOns: true,
    allowsProductRemoval: false,
    finderTags: ['colour', 'removal'],
  },
  {
    id: 'builder-gel-new',
    category: 'builder',
    name: 'Builder Gel Manicure',
    shortName: 'Builder Gel',
    description:
      'Builder gel overlay designed to strengthen natural nails, finished with colour.',
    duration: 60,
    price: 56,
    featured: true,
    acceptsAddOns: true,
    allowsProductRemoval: true,
    finderTags: ['strength', 'natural'],
  },
  {
    id: 'builder-gel-infill',
    category: 'builder',
    name: 'Builder Gel Infill',
    shortName: 'Builder Infill',
    description: 'Rebalance and refresh an existing builder-gel set.',
    duration: 60,
    price: 52,
    acceptsAddOns: true,
    finderTags: ['strength', 'infill'],
  },
  {
    id: 'builder-gel-removal',
    category: 'builder',
    name: 'Builder Gel + Removal',
    shortName: 'Builder + Removal',
    description:
      'Removal of existing product followed by a fresh builder-gel manicure.',
    duration: 75,
    price: 64,
    acceptsAddOns: true,
    finderTags: ['strength', 'removal'],
  },
  {
    id: 'soft-gel-extensions',
    category: 'extensions',
    name: 'Soft Gel Extensions',
    shortName: 'Extensions',
    description: 'Added length with a refined, lightweight finish.',
    duration: 75,
    price: 68,
    acceptsAddOns: true,
    allowsProductRemoval: true,
    finderTags: ['length'],
  },
  {
    id: 'extension-infill',
    category: 'extensions',
    name: 'Extension Infill',
    shortName: 'Extension Infill',
    description: 'Rebalance and refresh existing extensions.',
    duration: 75,
    price: 62,
    acceptsAddOns: true,
    finderTags: ['length', 'infill'],
  },
  {
    id: 'signature-pedicure',
    category: 'pedicures',
    name: 'Signature Pedicure',
    shortName: 'Pedicure',
    description: 'Thorough preparation, foot care and traditional polish.',
    duration: 55,
    price: 50,
    featured: true,
    finderTags: ['pedicure'],
  },
  {
    id: 'gel-pedicure',
    category: 'pedicures',
    name: 'Gel Pedicure',
    shortName: 'Gel Pedicure',
    description: 'Thorough preparation, foot care and gel colour.',
    duration: 60,
    price: 58,
    finderTags: ['pedicure', 'colour'],
  },
  {
    id: 'gel-removal',
    category: 'removal',
    name: 'Gel Removal',
    shortName: 'Gel Removal',
    description: 'Safe removal with tidy and conditioning finish.',
    duration: 20,
    price: 14,
    finderTags: ['removal'],
  },
  {
    id: 'builder-removal-only',
    category: 'removal',
    name: 'Builder Gel Removal',
    shortName: 'Builder Removal',
    description: 'Careful removal of builder gel with nail tidy.',
    duration: 30,
    price: 18,
    finderTags: ['removal'],
  },
  {
    id: 'nail-repair',
    category: 'removal',
    name: 'Nail Repair',
    shortName: 'Repair',
    description: 'Repair of one damaged nail.',
    duration: 15,
    price: 6,
    finderTags: ['repair'],
  },
];

export const addOns: AddOn[] = [
  {
    id: 'micro-french',
    name: 'Micro French',
    description: 'Fine-line French finish, priced for one colour.',
    duration: 15,
    price: 10,
    priceLabel: '+£10',
    compatibleCategories: ['manicures', 'builder', 'extensions'],
  },
  {
    id: 'chrome',
    name: 'Chrome',
    description: 'Chrome powder over a compatible gel or builder finish.',
    duration: 10,
    price: 10,
    priceLabel: '+£10',
    compatibleCategories: ['manicures', 'builder', 'extensions'],
  },
  {
    id: 'minimal-art',
    name: 'Minimal Nail Art',
    description: 'Small accents on selected nails. Final price depends on design.',
    duration: 15,
    price: 12,
    priceLabel: 'from +£12',
    compatibleCategories: ['manicures', 'builder', 'extensions'],
  },
  {
    id: 'detailed-art',
    name: 'Detailed Nail Art',
    description:
      'More involved detail work. Book extra time so the set is not rushed.',
    duration: 30,
    price: 20,
    priceLabel: 'from +£20',
    compatibleCategories: ['builder', 'extensions'],
  },
];

export const productRemoval: Record<
  ProductOn,
  { label: string; duration: number; price: number }
> = {
  none: { label: 'Nothing', duration: 0, price: 0 },
  gel: { label: 'Gel', duration: 20, price: 14 },
  builder: { label: 'Builder gel / BIAB', duration: 30, price: 18 },
  extensions: { label: 'Extensions', duration: 30, price: 20 },
};

export function getTreatmentById(id?: string | null) {
  return treatments.find((treatment) => treatment.id === id);
}

export function getAddOnById(id: AddOnId) {
  return addOns.find((addOn) => addOn.id === id);
}

export function canUseAddOn(treatment: Treatment, addOn: AddOn) {
  return (
    treatment.acceptsAddOns === true &&
    addOn.compatibleCategories.includes(treatment.category)
  );
}

export function formatPrice(value: number) {
  return `£${value}`;
}

export function calculateBookingTotal(
  treatment: Treatment,
  selectedAddOns: AddOnId[],
  productOn: ProductOn,
) {
  const selected = selectedAddOns
    .map((id) => getAddOnById(id))
    .filter((addOn): addOn is AddOn => Boolean(addOn))
    .filter((addOn) => canUseAddOn(treatment, addOn));
  const removal = treatment.allowsProductRemoval
    ? productRemoval[productOn]
    : productRemoval.none;

  return {
    duration:
      treatment.duration +
      selected.reduce((sum, addOn) => sum + addOn.duration, 0) +
      removal.duration,
    price:
      treatment.price +
      selected.reduce((sum, addOn) => sum + addOn.price, 0) +
      removal.price,
    addOns: selected,
    removal,
  };
}
