import React from 'react';
import { motion } from 'motion/react';
import { Crown, Search, Sparkles, Sun, Moon } from 'lucide-react';
import type { Trip } from '../types/trip';

interface AppHeaderProps {
  onLogoClick: () => void;
  activeTrip: Trip | null;
  onOpenTrip: () => void;
  onStartTrip: () => void;
  onOpenSearch: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Replaces the old plain-text "Elite Bookings" nav. Also fixes a real
// pre-existing bug: the old nav's "My Trip" button actually opened Discovery
// Assistant chat, not the real trip summary — this pill's label and action
// always agree now, since it only ever does one of the two depending on
// whether a trip actually exists.
export const AppHeader: React.FC<AppHeaderProps> = ({ onLogoClick, activeTrip, onOpenTrip, onStartTrip, onOpenSearch, theme, toggleTheme }) => {
  return (
    <nav className="px-4 py-4 sm:px-8 sm:py-6 flex justify-between items-center z-50 max-w-7xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onLogoClick}
        className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
      >
        <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-gold" />
        <div className="leading-tight">
          <div className="text-sm sm:text-xl font-serif tracking-[0.15em] sm:tracking-[0.2em] uppercase font-light text-charcoal">
            Elite Bookings
          </div>
          <div className="text-[8px] sm:text-[9px] uppercase tracking-[0.25em] text-charcoal/40 font-semibold">
            Luxury &middot; Comfort &middot; Everywhere
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center space-x-2.5 sm:space-x-4"
      >
        <button
          onClick={onOpenSearch}
          aria-label="Search"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-charcoal/15 flex items-center justify-center text-charcoal hover:border-gold hover:text-gold transition-colors cursor-pointer flex-shrink-0"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-charcoal/15 flex items-center justify-center text-charcoal hover:border-gold hover:text-gold transition-colors cursor-pointer flex-shrink-0"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {activeTrip ? (
          <button
            onClick={onOpenTrip}
            className="flex items-center space-x-2 bg-gradient-to-r from-gold via-amber-300 to-gold text-charcoal px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-full border border-gold/60 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer font-bold tracking-wider text-[10px] sm:text-xs uppercase whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-charcoal fill-charcoal/20 flex-shrink-0" />
            <span className="font-extrabold">My Trip &middot; {activeTrip.tripCode}</span>
          </button>
        ) : (
          <button
            onClick={onStartTrip}
            className="flex items-center space-x-2 bg-charcoal/5 border border-charcoal/15 text-charcoal px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-full transition-all duration-300 hover:border-gold hover:text-gold cursor-pointer font-bold tracking-wider text-[10px] sm:text-xs uppercase whitespace-nowrap"
          >
            <span className="font-extrabold">Start a Trip</span>
          </button>
        )}
      </motion.div>
    </nav>
  );
};
