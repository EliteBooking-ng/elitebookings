import React from 'react';
import { motion } from 'motion/react';
import { MapPin, ChevronRight, ShieldCheck } from 'lucide-react';

export interface PopularStayItem {
  id: string;
  name: string;
  location: string;
  price: string;
  images: string[];
  cityLocation: string; // the exact selectedLocation string to deep-link back into Explore
}

interface PopularStaysPreviewProps {
  listings: PopularStayItem[];
  onSelect: (cityLocation: string) => void;
  onViewAll: () => void;
}

// No rating/review data exists anywhere in this codebase — deliberately no
// "4.8 ★" style score here. A plain "Verified Listing" badge is the honest
// trust signal instead of fabricated social proof.
export const PopularStaysPreview: React.FC<PopularStaysPreviewProps> = ({ listings, onSelect, onViewAll }) => {
  if (listings.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl text-charcoal font-light">Popular Stays</h2>
          <p className="text-charcoal/50 text-xs sm:text-sm mt-1">Handpicked properties for your next trip.</p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-1 text-[11px] uppercase tracking-wider font-bold text-gold hover:text-gold/70 transition-colors cursor-pointer flex-shrink-0"
        >
          View All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        {listings.map((item, idx) => (
          <motion.button
            key={item.id}
            type="button"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx }}
            onClick={() => onSelect(item.cityLocation)}
            className="text-left bg-white rounded-2xl sm:rounded-[1.5rem] border border-charcoal/5 shadow-sm hover:shadow-lg transition-shadow overflow-hidden cursor-pointer group"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={item.images[0]}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-charcoal text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                <ShieldCheck className="w-3 h-3 text-gold" /> Verified
              </span>
            </div>
            <div className="p-3 sm:p-4">
              <h3 className="font-serif text-sm sm:text-base text-charcoal font-medium truncate">{item.name}</h3>
              <p className="flex items-center gap-1 text-charcoal/50 text-[11px] mt-1 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" /> {item.location}
              </p>
              <div className="flex items-center justify-between mt-2.5">
                <p className="text-charcoal text-xs sm:text-sm font-semibold">
                  From <span className="text-gold">&#8358;{item.price}</span> / night
                </p>
                <ChevronRight className="w-4 h-4 text-charcoal/30 group-hover:text-gold group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
