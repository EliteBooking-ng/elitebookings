import React, { useState } from 'react';
import { Hotel, Home, Car, Plane, Truck, MapPin, Calendar, Users, Search } from 'lucide-react';
import { UNCOVERED_STATES } from '../data/nigerianStates';
import type { ServiceType } from '../types/trip';

type Category = 'stays' | 'homes' | 'drive' | 'jets' | 'moving' | null;
type SearchTab = 'stays' | 'homes' | 'drive' | 'jets' | 'moving';

interface UnifiedSearchCardProps {
  onExplore: (category: Category, location?: string | null) => void;
  onRequestService: (config: { defaultCategory?: ServiceType; prefillLocation?: string; source: string }) => void;
}

const COVERED_CITIES = [
  { label: 'Lagos', value: 'Lagos, Lagos State' },
  { label: 'Abuja', value: 'Abuja, Federal Capital Territory' },
  { label: 'Port Harcourt', value: 'Port Harcourt, Rivers State' },
];

// Hotels and Shortlets are separate tabs, not a nested toggle under one
// combined tab — a combined tab previously defaulted to Hotel and gave
// Shortlets no directly-clickable way in.
const TABS: { id: SearchTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'stays', label: 'Hotels', icon: Hotel },
  { id: 'homes', label: 'Shortlets', icon: Home },
  { id: 'drive', label: 'Cars', icon: Car },
  { id: 'jets', label: 'Private Jets', icon: Plane },
  { id: 'moving', label: 'Trucks & Moving', icon: Truck },
];

const CTA_LABEL: Record<SearchTab, string> = {
  stays: 'Search Hotels',
  homes: 'Search Shortlets',
  drive: 'Search Cars',
  jets: 'Request Private Jet',
  moving: 'Request a Move',
};

// The search card's date/guest fields are deliberately cosmetic in this
// pass — no date or guest filtering exists anywhere in the real booking
// grids today (dates are only ever collected inside the per-property
// booking modal), and there's no "guests" concept backing any of them. Kept
// visible to match the reference layout, but never fabricated into a filter
// that doesn't actually work.
export const UnifiedSearchCard: React.FC<UnifiedSearchCardProps> = ({ onExplore, onRequestService }) => {
  const [activeTab, setActiveTab] = useState<SearchTab>('stays');
  const [location, setLocation] = useState('');
  const [dates, setDates] = useState('');
  const [guests, setGuests] = useState('');

  const needsLocation = activeTab === 'stays' || activeTab === 'homes' || activeTab === 'drive';
  const isValid = !needsLocation || !!location;

  const handleSearch = () => {
    if (activeTab === 'jets' || activeTab === 'moving') {
      onExplore(activeTab, null);
      return;
    }

    if (!location) return;

    const isCovered = COVERED_CITIES.some((c) => c.value === location);
    if (isCovered) {
      onExplore(activeTab, location);
    } else {
      const defaultCategory: ServiceType = activeTab === 'stays' ? 'Hotel' : activeTab === 'homes' ? 'Shortlet' : 'Car Rental';
      onRequestService({ defaultCategory, prefillLocation: location, source: 'Home Search Card' });
    }
  };

  return (
    <div className="bg-white rounded-[1.75rem] sm:rounded-[2rem] shadow-xl border border-charcoal/5 p-3 sm:p-5">
      {/* Category tabs */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setLocation(''); }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                isActive ? 'bg-charcoal text-cream' : 'bg-charcoal/5 text-charcoal/60 hover:bg-charcoal/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {needsLocation && (
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30 pointer-events-none" />
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full appearance-none bg-cream/40 border border-charcoal/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-charcoal outline-none focus:border-gold transition-colors"
            >
              <option value="">Where are you going?</option>
              <optgroup label="Available Now">
                {COVERED_CITIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </optgroup>
              <optgroup label="Other States (we'll source it for you)">
                {UNCOVERED_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        {needsLocation && (
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal/30 pointer-events-none" />
              <input
                type="text"
                value={dates}
                onChange={(e) => setDates(e.target.value)}
                placeholder="Check-in – Check-out"
                className="w-full bg-cream/40 border border-charcoal/10 rounded-xl pl-9 pr-3 py-3 text-xs text-charcoal placeholder:text-charcoal/40 outline-none focus:border-gold transition-colors"
              />
            </div>
            <div className="relative">
              <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal/30 pointer-events-none" />
              <input
                type="text"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                placeholder="Guests"
                className="w-full bg-cream/40 border border-charcoal/10 rounded-xl pl-9 pr-3 py-3 text-xs text-charcoal placeholder:text-charcoal/40 outline-none focus:border-gold transition-colors"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!isValid}
          onClick={handleSearch}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-gold via-amber-300 to-gold text-charcoal font-bold text-xs uppercase tracking-[0.2em] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-40"
        >
          <Search className="w-4 h-4" /> {CTA_LABEL[activeTab]}
        </button>
      </div>
    </div>
  );
};
