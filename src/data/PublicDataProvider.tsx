import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { artists as fallbackArtists, type Artist } from './artists';
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
  ready: boolean;
};

type CatalogResponse = Omit<PublicData, 'ready'> & {
  artists: Array<Omit<Artist, 'nextAvailable'> & { nextAvailable?: string }>;
};

const fallback: PublicData = {
  artists: fallbackArtists,
  treatments: fallbackTreatments,
  addOns: fallbackAddOns,
  treatmentCategories: fallbackCategories,
  ready: false,
};

const PublicDataContext = createContext<PublicData>(fallback);

export function PublicDataProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<CatalogResponse>('/api/public/catalog')
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch(() => {
        // Static data keeps public pages stable while the server is unavailable.
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<PublicData>(() => {
    if (!catalog) return fallback;
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
      ready: true,
    };
  }, [catalog]);

  return <PublicDataContext.Provider value={value}>{children}</PublicDataContext.Provider>;
}

export function usePublicData() {
  return useContext(PublicDataContext);
}
