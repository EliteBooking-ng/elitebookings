import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TripAttachPromptProps {
  isOpen: boolean;
  tripCode: string;
  tripLocation: string;
  onAddToExisting: () => void;
  onStartNew: () => void;
}

// Shown when a customer starts a new top-level booking (hotel/concierge)
// while a trip is already active in this browser — asks once instead of
// silently always-attaching the new booking to the existing trip.
export const TripAttachPrompt: React.FC<TripAttachPromptProps> = ({ isOpen, tripCode, tripLocation, onAddToExisting, onStartNew }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-charcoal/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-cream border border-gold/30 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-charcoal font-sans"
        >
          <h3 className="font-serif text-lg font-medium mb-2">Add to Your Existing Trip?</h3>
          <p className="text-sm text-charcoal/60 mb-5">
            You already have trip <span className="font-semibold text-charcoal">{tripCode}</span> to {tripLocation} in progress. Add this booking to it, or start a new trip?
          </p>
          <div className="space-y-2">
            <button
              onClick={onAddToExisting}
              className="w-full py-3 bg-gradient-to-r from-gold via-amber-300 to-gold text-charcoal font-bold text-xs uppercase tracking-wider rounded-full cursor-pointer transition-all"
            >
              Add to Existing Trip
            </button>
            <button
              onClick={onStartNew}
              className="w-full py-3 bg-white border border-charcoal/15 hover:bg-charcoal/5 text-charcoal font-bold text-xs uppercase tracking-wider rounded-full cursor-pointer transition-all"
            >
              Start a New Trip
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
