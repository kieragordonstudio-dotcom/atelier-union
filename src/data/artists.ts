export type Artist = {
  id: string;
  name: string;
  role: string;
  image: string;
  specialties: string[];
  profile: string;
  selectedWork: string[];
  nextAvailable: string;
};

export const artists: Artist[] = [
  {
    id: 'maya',
    name: 'Maya Fraser',
    role: 'Senior Nail Artist',
    image: '/images/artist-maya.webp',
    specialties: ['Builder gel', 'Short natural shapes', 'Micro French'],
    profile:
      'Known for meticulous builder-gel work, short natural shapes and extremely fine French finishes.',
    selectedWork: ['Natural Builder', 'Micro French', 'Oxblood'],
    nextAvailable: 'Today, 16:15',
  },
  {
    id: 'sophie',
    name: 'Sophie Reid',
    role: 'Nail Artist',
    image: '/images/artist-sophie.webp',
    specialties: ['Gel manicures', 'Tonal colour', 'Subtle chrome'],
    profile:
      'Specialises in clean natural manicures, tonal colour and subtle chrome.',
    selectedWork: ['Chrome', 'Naked Manicure', 'Soft Blush'],
    nextAvailable: 'Monday, 12:45',
  },
  {
    id: 'isla',
    name: 'Isla Morgan',
    role: 'Nail Artist',
    image: '/images/artist-isla.webp',
    specialties: ['Extensions', 'Occasion sets', 'Fine-detail art'],
    profile:
      'Known for extensions, occasion sets and fine-detail art.',
    selectedWork: ['Extensions', 'Detailed Art', 'Evening Red'],
    nextAvailable: 'Tuesday, 15:30',
  },
];

export function getArtistById(id?: string | null) {
  return artists.find((artist) => artist.id === id);
}
