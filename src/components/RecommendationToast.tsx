import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2 } from 'lucide-react';
import type { ServiceType } from '../types/trip';

interface RecommendationToastProps {
  isOpen: boolean;
  serviceType: ServiceType;
  confirmedServiceType?: ServiceType;
  onAccept: () => void;
  onDismiss: () => void;
}

// A small, dismissible slide-up card — deliberately a toast, not a full
// modal, to keep the Smart Follow-Up Recommendation System subtle rather
// than interruptive. Only ever suggests; never books or confirms anything
// itself — "Arrange X" opens AddServiceModal the same way manually clicking
// "+ Add Service" would.
export const RecommendationToast: React.FC<RecommendationToastProps> = ({ isOpen, serviceType, confirmedServiceType, onAccept, onDismiss }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 sm:bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[90] w-[92vw] sm:w-80 bg-cream border border-gold/30 rounded-2xl shadow-2xl p-4 font-sans"
        >
          <button onClick={onDismiss} className="absolute top-3 right-3 text-charcoal/40 hover:text-charcoal cursor-pointer" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>

          {confirmedServiceType && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">{confirmedServiceType} Confirmed</span>
            </div>
          )}

          <p className="text-sm text-charcoal font-medium pr-5 mb-3">
            Would you like us to arrange your {serviceType.toLowerCase()}?
          </p>

          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="flex-1 py-2.5 bg-gradient-to-r from-gold via-amber-300 to-gold text-charcoal font-bold text-[11px] uppercase tracking-wider rounded-full cursor-pointer transition-all hover:shadow-md"
            >
              Arrange {serviceType}
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2.5 bg-white border border-charcoal/15 hover:bg-charcoal/5 text-charcoal/70 font-bold text-[11px] uppercase tracking-wider rounded-full cursor-pointer transition-all"
            >
              Not Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
