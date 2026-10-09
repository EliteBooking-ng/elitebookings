import React from 'react';
import { Bookmark, MapPin, X, ChevronRight } from 'lucide-react';
import type { SavedListing } from '../hooks/useSavedListings';

type Category = 'stays' | 'homes' | 'drive' | 'jets' | 'moving' | null;

interface SavedScreenProps {
  items: SavedListing[];
  onRemove: (item: SavedListing) => void;
  onGoExplore: (category: Category, location?: string | null) => void;
}

const TYPE_TO_CATEGORY: Record<SavedListing['type'], Category> = {
  hotel: 'stays',
  shortlet: 'homes',
  car: 'drive',
};

const CITY_TO_LOCATION: Record<string, string> = {
  Lagos: 'Lagos, Lagos State',
  Abuja: 'Abuja, Federal Capital Territory',
  'Port Harcourt': 'Port Harcourt, Rivers State',
};

// Local-only favorites — this app has no customer accounts, so there's
// nothing to sync across devices. Tapping a card deep-links back into
// Explore's matching grid rather than a detail view, since a saved entry
// deliberately doesn't retain the full listing object needed for that.
export const SavedScreen: React.FC<SavedScreenProps> = ({ items, onRemove, onGoExplore }) => {
  return (
    <main className="flex-grow flex flex-col items-center px-6 md:px-12">
      <div className="w-full max-w-4xl mt-10 mb-20">
        <h1 className="font-serif text-3xl text-charcoal font-light mb-1">Saved</h1>
        <p className="text-charcoal/50 text-sm mb-8">Listings you've bookmarked, kept on this device.</p>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-charcoal/5">
            <Bookmark className="w-10 h-10 text-charcoal/20 mx-auto mb-4" />
            <h3 className="font-serif text-xl text-charcoal font-light mb-1">Nothing Saved Yet</h3>
            <p className="text-charcoal/50 text-sm max-w-xs mx-auto">
              Tap the heart icon on any hotel, shortlet, or car to save it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="bg-white rounded-2xl border border-charcoal/5 shadow-sm overflow-hidden flex">
                <div className="w-28 h-28 flex-shrink-0 relative">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-serif text-sm text-charcoal font-medium truncate">{item.name}</h3>
                    <p className="flex items-center gap-1 text-charcoal/50 text-[11px] mt-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" /> {item.location}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      onClick={() => onGoExplore(TYPE_TO_CATEGORY[item.type], item.city ? CITY_TO_LOCATION[item.city] : null)}
                      className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-gold hover:text-gold/70 transition-colors cursor-pointer"
                    >
                      View <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item)}
                      aria-label="Remove from saved"
                      className="text-charcoal/30 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};
