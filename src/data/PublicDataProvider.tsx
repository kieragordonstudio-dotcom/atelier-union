import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { artists as fallbackArtists, type Artist } from './artists';
import { lookbook as fallbackLookbook, type Look } from './lookbook';
import { siteConfig } from '../config/site';
import {
  addOns as fallbackAddOns,
  treatmentCategories as fallbackCategories,
  treatments as fallbackTreatments,
  type AddOn,
  type Treatment,
} from './treatments';

type Category = (typeof fallbackCategories)[number];
type PublicData = {
  artists: Artist[];
  treatments: Treatment[];
  addOns: AddOn[];
  treatmentCategories: Category[];
  lookbook: Look[];
  website: PublicWebsite;
  ready: boolean;
};

export type PublicWebsite = {
  salonName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  postcode: string;
  country: string;
  instagramUrl: string;
  emailUrl: string;
  openingHours: Array<{ days: string; hours: string }>;
  contactLabel: string;
};

type CatalogResponse = Omit<PublicData, 'ready' | 'lookbook' | 'website'> & {
  artists: Array<Omit<Artist, 'nextAvailable'> & { nextAvailable?: string }>;
  website?: {
    salon_name: string;
    email: string | null;
    phone: string | null;
    address_line_1: string;
    city: string;
    postcode: string;
    country: string;
    instagram_url: string | null;
    email_url: string | null;
    opening_hours: Array<{ days: string; hours: string }>;
  } | null;
};

type LookbookResponse = { looks: Look[] };

const fallbackWebsite: PublicWebsite = {
  salonName: siteConfig.shortName,
  email: siteConfig.email,
  phone: '',
  addressLine1: siteConfig.address.line1,
  city: siteConfig.address.city,
  postcode: siteConfig.address.postcode,
  country: siteConfig.address.country,
  instagramUrl: siteConfig.socials.find((social) => social.label === 'Instagram')?.href ?? '',
  emailUrl: siteConfig.socials.find((social) => social.label === 'Email')?.href ?? '',
  openingHours: siteConfig.openingHours,
  contactLabel: siteConfig.contactPlaceholder,
};

const fallback: PublicData = {
  artists: fallbackArtists,
  treatments: fallbackTreatments,
  addOns: fallbackAddOns,
  treatmentCategories: fallbackCategories,
  lookbook: fallbackLookbook,
  website: fallbackWebsite,
  ready: false,
};

const PublicDataContext = createContext<PublicData>(fallback);

export function PublicDataProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [looks, setLooks] = useState<Look[] | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<CatalogResponse>('/api/public/catalog')
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch(() => {
        // Static data keeps public pages stable while the server is unavailable.
      });
    apiFetch<LookbookResponse>('/api/public/lookbook')
      .then((data) => {
        if (active) setLooks(data.looks);
      })
      .catch(() => {
        // The static lookbook remains the public fallback.
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<PublicData>(() => {
    if (!catalog) return fallback;
    const website = catalog.website
      ? {
          salonName: catalog.website.salon_name,
          email: catalog.website.email ?? '',
          phone: catalog.website.phone ?? '',
          addressLine1: catalog.website.address_line_1,
          city: catalog.website.city,
          postcode: catalog.website.postcode,
          country: catalog.website.country,
          instagramUrl: catalog.website.instagram_url ?? '',
          emailUrl: catalog.website.email_url ?? '',
          openingHours: catalog.website.opening_hours,
          contactLabel:
            catalog.website.email === siteConfig.email && !catalog.website.phone
              ? siteConfig.contactPlaceholder
              : catalog.website.phone ?? catalog.website.email ?? siteConfig.contactPlaceholder,
        }
      : fallbackWebsite;
    return {
      ...catalog,
      artists: catalog.artists.map((artist) => ({
        ...artist,
        nextAvailable:
          artist.nextAvailable ??
          fallbackArtists.find((fallbackArtist) => fallbackArtist.id === artist.id)
            ?.nextAvailable ??
          'Check booking availability',
      })),
      lookbook: looks ?? fallbackLookbook,
      website,
      ready: true,
    };
  }, [catalog, looks]);

  return <PublicDataContext.Provider value={value}>{children}</PublicDataContext.Provider>;
}

export function usePublicData() {
  return useContext(PublicDataContext);
}
