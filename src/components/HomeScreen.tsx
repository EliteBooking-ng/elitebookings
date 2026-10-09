import React from 'react';
import { Search } from 'lucide-react';
import { HomeHero } from './HomeHero';
import { UnifiedSearchCard } from './UnifiedSearchCard';
import { QuickCategoryLinks } from './QuickCategoryLinks';
import { PopularStaysPreview, type PopularStayItem } from './PopularStaysPreview';
import type { ServiceType } from '../types/trip';

type Category = 'stays' | 'homes' | 'drive' | 'jets' | 'moving' | null;

interface HomeScreenProps {
  onExplore: (category: Category, location?: string | null) => void;
  onOpenRequestService: (config: { defaultCategory?: ServiceType; prefillText?: string; prefillLocation?: string; source: string }) => void;
  popularStays: PopularStayItem[];
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onExplore, onOpenRequestService, popularStays }) => {
  const heroImage = popularStays[0]?.images?.[0];

  return (
    <main className="flex-grow flex flex-col items-center px-6 md:px-12">
      <div className="w-full max-w-6xl mt-6 sm:mt-10 mb-16">
        <HomeHero heroImage={heroImage || ''} />

        <div className="max-w-3xl mx-auto -mt-2 sm:-mt-6 mb-14 relative z-10">
          <UnifiedSearchCard
            onExplore={onExplore}
            onRequestService={onOpenRequestService}
          />
        </div>

        <div className="mb-16">
          <QuickCategoryLinks
            onExplore={onExplore}
            onRequestService={onOpenRequestService}
          />
        </div>

        <div className="mb-16">
          <PopularStaysPreview
            listings={popularStays}
            onSelect={(cityLocation) => onExplore('stays', cityLocation)}
            onViewAll={() => onExplore('stays')}
          />
        </div>

        <div className="bg-charcoal/[0.03] border border-charcoal/10 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center flex-shrink-0">
              <Search className="w-4 h-4 text-gold" />
            </span>
            <div>
              <p className="text-charcoal font-serif text-base sm:text-lg">Can't find what you need?</p>
              <p className="text-charcoal/50 text-xs sm:text-sm">Request a service and we'll help you find it.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenRequestService({ source: 'Homepage' })}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gold/40 text-charcoal text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-gold/10 hover:border-gold transition-all cursor-pointer whitespace-nowrap"
          >
            Request Service
          </button>
        </div>
      </div>
    </main>
  );
};
