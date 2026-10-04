import React, { useState } from 'react';
import { PlaneTakeoff, Car, Plane, UserRound, UtensilsCrossed, Home, Anchor, Truck, Boxes, Construction, Building2, Sparkles, MessageCircleQuestion } from 'lucide-react';
import type { ServiceType, Trip, TripService } from '../types/trip';
import { AddServiceModal } from './AddServiceModal';

interface CompleteYourTripPanelProps {
  trip: Trip;
  services: TripService[];
  addServiceToTrip: (type: ServiceType, details: Record<string, any>, summary: string) => Promise<string>;
  onViewTrip: () => void;
}

// Shared icon-per-ServiceType map — reused by the natural-language Booking
// Assistant's "trip so far" strip so there's one place defining what each
// service type looks like, not a second hand-maintained copy.
export const SERVICE_ICONS: Partial<Record<ServiceType, React.ComponentType<{ className?: string }>>> = {
  Hotel: Building2,
  'Airport Pickup': PlaneTakeoff,
  'Car Rental': Car,
  'Private Jet': Plane,
  Driver: UserRound,
  Restaurant: UtensilsCrossed,
  Shortlet: Home,
  Yacht: Anchor,
  'Moving & Logistics': Boxes,
  Truck: Truck,
  Forklift: Construction,
  Concierge: Sparkles,
  Other: MessageCircleQuestion,
};

const ALL_ADDABLE_TYPES: ServiceType[] = ['Airport Pickup', 'Car Rental', 'Private Jet', 'Driver', 'Restaurant', 'Shortlet', 'Yacht', 'Moving & Logistics', 'Truck', 'Forklift', 'Concierge', 'Other'];

// Shown right where the WhatsApp/"thank you" confirmation appears today,
// immediately after a seed (Hotel/Shortlet) booking succeeds — the full set
// of addable services is shown right away so the customer can pick whatever
// else they need in one place, rather than a curated subset behind a toggle.
export const CompleteYourTripPanel: React.FC<CompleteYourTripPanelProps> = ({ trip, services, addServiceToTrip, onViewTrip }) => {
  const [addingType, setAddingType] = useState<ServiceType | null>(null);

  const existingTypes = services.map((s) => s.type);
  const remaining = ALL_ADDABLE_TYPES.filter((t) => !existingTypes.includes(t));

  if (remaining.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-charcoal/10">
      <h4 className="font-serif text-lg text-charcoal font-medium">Complete Your Trip</h4>
      <p className="text-xs text-charcoal/60 mt-1 mb-4">
        Your request has been received. Would you like us to arrange anything else for your stay?
      </p>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {remaining.map((type) => {
          const Icon = SERVICE_ICONS[type] || Sparkles;
          return (
            <button
              key={type}
              onClick={() => setAddingType(type)}
              className="flex items-center gap-2.5 bg-white hover:bg-gold/10 border border-charcoal/10 hover:border-gold/30 rounded-2xl p-3 text-left transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-charcoal truncate">{type}</div>
                <div className="text-[10px] text-gold font-bold uppercase tracking-wider">+ Add to Trip</div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onViewTrip}
        className="w-full py-2.5 bg-charcoal hover:bg-charcoal/90 text-gold font-semibold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
      >
        View My Trip — {trip.tripCode}
      </button>

      <AddServiceModal
        isOpen={!!addingType}
        onClose={() => setAddingType(null)}
        serviceType={addingType}
        onAdd={addServiceToTrip}
      />
    </div>
  );
};
