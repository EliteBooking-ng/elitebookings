import type { ServiceType } from '../types/trip';

// Purely advisory — drives the Smart Follow-Up Recommendation System
// (useTripRecommendations / RecommendationToast). Never auto-books anything;
// only ever suggests one next service type for a given trigger. "Loading
// assistance" / "Additional vehicle" / "Destination assistance" (Truck's
// spec'd follow-ups) map onto real bookable types: Forklift, Car Rental,
// and Concierge respectively.
export const RECOMMENDATION_RULES: Record<ServiceType, ServiceType[]> = {
  Hotel: ['Airport Pickup', 'Car Rental', 'Driver', 'Concierge'],
  Shortlet: ['Airport Pickup', 'Car Rental', 'Driver', 'Concierge', 'Moving & Logistics'],
  'Airport Pickup': ['Hotel', 'Car Rental', 'Driver'],
  'Car Rental': ['Driver', 'Airport Pickup', 'Hotel'],
  'Private Jet': ['Airport Pickup', 'Driver', 'Hotel', 'Concierge'],
  Truck: ['Forklift', 'Car Rental', 'Concierge'],
  Forklift: ['Truck', 'Concierge'],
  'Moving & Logistics': ['Truck', 'Forklift'],
  Driver: [],
  Restaurant: [],
  Yacht: [],
  Concierge: [],
  Other: [],
};

// Returns the single next service type to suggest for whatever just
// triggered a check (a newly created/added/confirmed service, or simply
// re-opening the trip) — excluding anything already on the trip and anything
// already shown-and-decided (accepted or dismissed) for this trip before.
// One at a time, never a batch — matches the "don't overwhelm" brief better
// than surfacing multiple candidates at once.
export function getNextRecommendation(
  triggerType: ServiceType,
  existingTypes: ServiceType[],
  decidedTypes: ServiceType[]
): ServiceType | null {
  const candidates = RECOMMENDATION_RULES[triggerType] || [];
  return candidates.find((t) => !existingTypes.includes(t) && !decidedTypes.includes(t)) ?? null;
}
