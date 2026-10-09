import React from 'react';
import { Hotel, Home, Car, PlaneTakeoff, Truck } from 'lucide-react';
import type { ServiceType } from '../types/trip';

type Category = 'stays' | 'homes' | 'drive' | 'jets' | 'moving' | null;

interface QuickCategoryLinksProps {
  onExplore: (category: Category) => void;
  onRequestService: (config: { defaultCategory?: ServiceType; source: string }) => void;
}

// Hotels and Shortlets are deliberately two separate tiles — they used to
// be combined into one "Hotels & Shortlets" tile that only ever opened
// Hotels, leaving Shortlets with no quick-link entry point at all.
const LINKS = [
  { label: 'Hotels', icon: Hotel, action: 'explore' as const, category: 'stays' as Category },
  { label: 'Shortlets', icon: Home, action: 'explore' as const, category: 'homes' as Category },
  { label: 'Cars & Airport Pickups', icon: Car, action: 'explore' as const, category: 'drive' as Category },
  { label: 'Trucks & Forklifts', icon: Truck, action: 'request' as const, requestCategory: 'Truck' as ServiceType },
  { label: 'Private Jets (On Request)', icon: PlaneTakeoff, action: 'explore' as const, category: 'jets' as Category },
];

export const QuickCategoryLinks: React.FC<QuickCategoryLinksProps> = ({ onExplore, onRequestService }) => {
  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-4">
      {LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <button
            key={link.label}
            type="button"
            onClick={() => {
              if (link.action === 'explore') onExplore(link.category);
              else onRequestService({ defaultCategory: link.requestCategory, source: 'Quick Links' });
            }}
            className="flex flex-col items-center gap-2 cursor-pointer group"
          >
            <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-charcoal/5 group-hover:bg-gold/15 flex items-center justify-center text-charcoal group-hover:text-gold transition-colors">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <span className="text-[9px] sm:text-[10px] text-center text-charcoal/60 font-medium leading-tight">{link.label}</span>
          </button>
        );
      })}
    </div>
  );
};
