import { useCallback, useEffect, useState } from 'react';

// Local-only favorites — this app has no customer accounts (confirmed
// nowhere else in the codebase), so "Saved" is deliberately scoped to this
// browser only, same honesty-first approach as the rest of the Home/Saved/
// Account redesign. Deep-links back into Explore rather than retaining a
// full listing object, since that's all a browser-only favorites list can
// reliably stay in sync with.
export type SavedListingType = 'hotel' | 'shortlet' | 'car';

export interface SavedListing {
  id: string;
  type: SavedListingType;
  name: string;
  location: string;
  image: string;
  price: string;
  city?: string;
  savedAt: number;
}

const STORAGE_KEY = 'elite-bookings:savedListings';

function readStoredListings(): SavedListing[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useSavedListings() {
  const [items, setItems] = useState<SavedListing[]>(() => readStoredListings());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore — e.g. storage disabled in a private/incognito context.
    }
  }, [items]);

  const isSaved = useCallback(
    (type: SavedListingType, id: string) => items.some((i) => i.type === type && i.id === id),
    [items]
  );

  const toggleSaved = useCallback((listing: Omit<SavedListing, 'savedAt'>) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.type === listing.type && i.id === listing.id);
      if (exists) {
        return prev.filter((i) => !(i.type === listing.type && i.id === listing.id));
      }
      return [{ ...listing, savedAt: Date.now() }, ...prev];
    });
  }, []);

  return { items, isSaved, toggleSaved };
}
