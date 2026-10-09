import React from 'react';
import { MapPin, Sun, Moon, Bookmark, ChevronRight, MessageCircle, ShieldCheck } from 'lucide-react';
import type { Trip, TripService } from '../types/trip';

interface AccountScreenProps {
  trip: Trip | null;
  services: TripService[];
  onViewTrip: () => void;
  onGoExplore: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onOpenAdmin: () => void;
  savedCount: number;
  onOpenSaved: () => void;
}

// No real login exists for customers (confirmed nowhere in the codebase) —
// deliberately labeled "Guest & Trip", never "My Account"/"Profile", so
// nothing here implies an account that doesn't exist.
export const AccountScreen: React.FC<AccountScreenProps> = ({
  trip, services, onViewTrip, onGoExplore, theme, toggleTheme, onOpenAdmin, savedCount, onOpenSaved,
}) => {
  return (
    <main className="flex-grow flex flex-col items-center px-6 md:px-12">
      <div className="w-full max-w-2xl mt-10 mb-20">
        <h1 className="font-serif text-3xl text-charcoal font-light mb-1">Guest &amp; Trip</h1>
        <p className="text-charcoal/50 text-sm mb-8">No account needed — everything here is tied to this device.</p>

        <div className="bg-white rounded-2xl border border-charcoal/5 shadow-sm p-5 mb-4">
          {trip ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gold">Active Trip</span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-charcoal/50">{trip.status}</span>
              </div>
              <p className="font-serif text-lg text-charcoal mb-1">{trip.tripCode}</p>
              <p className="flex items-center gap-1 text-charcoal/60 text-sm mb-4">
                <MapPin className="w-3.5 h-3.5" /> {trip.location} &middot; {services.length} service{services.length === 1 ? '' : 's'}
              </p>
              <button
                type="button"
                onClick={onViewTrip}
                className="w-full py-3 bg-charcoal hover:bg-charcoal/90 text-gold font-semibold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                View Full Trip
              </button>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-charcoal/50 text-sm mb-4">No active trip yet.</p>
              <button
                type="button"
                onClick={onGoExplore}
                className="px-6 py-2.5 bg-gold text-charcoal font-bold text-xs uppercase tracking-wider rounded-full cursor-pointer"
              >
                Start Exploring
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenSaved}
          className="w-full flex items-center justify-between bg-white rounded-2xl border border-charcoal/5 shadow-sm p-4 mb-4 cursor-pointer hover:border-gold/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center"><Bookmark className="w-4 h-4 text-gold" /></span>
            <span className="text-sm text-charcoal font-medium">Saved Listings</span>
          </div>
          <div className="flex items-center gap-1.5 text-charcoal/40">
            <span className="text-xs">{savedCount}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        <div className="flex items-center justify-between bg-white rounded-2xl border border-charcoal/5 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-gold" /> : <Moon className="w-4 h-4 text-gold" />}
            </span>
            <span className="text-sm text-charcoal font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${theme === 'dark' ? 'bg-gold' : 'bg-charcoal/20'}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <a
          href="https://wa.me/2347072253857?text=Hello%2C%20I%20need%20some%20assistance."
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between bg-white rounded-2xl border border-charcoal/5 shadow-sm p-4 mb-4 cursor-pointer hover:border-gold/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[#25D366]/15 flex items-center justify-center"><MessageCircle className="w-4 h-4 text-[#25D366]" /></span>
            <span className="text-sm text-charcoal font-medium">WhatsApp Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-charcoal/40" />
        </a>

        <button
          type="button"
          onClick={onOpenAdmin}
          className="w-full flex items-center justify-between bg-white rounded-2xl border border-charcoal/5 shadow-sm p-4 cursor-pointer hover:border-gold/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-charcoal/5 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-charcoal/60" /></span>
            <span className="text-sm text-charcoal font-medium">Admin</span>
          </div>
          <ChevronRight className="w-4 h-4 text-charcoal/40" />
        </button>
      </div>
    </main>
  );
};
