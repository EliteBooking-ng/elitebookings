import type { ServiceType } from '../types/trip';

// Single source of truth for "what does a request of this type need before
// it's complete" — field names match the `details` bag keys each service
// type actually writes (see AddServiceModal.tsx's buildPayload / the seed
// details built in App.tsx & AIConciergeModal.tsx for Hotel/Shortlet).
// Used by AddServiceModal's own validity check and by the natural-language
// booking assistant's extraction schema, so the two never drift apart.
export const REQUIRED_FIELDS: Record<ServiceType, string[]> = {
  Hotel: ['checkin', 'guests'],
  Shortlet: ['location', 'checkin'],
  'Airport Pickup': ['pickupLocation', 'pickupDate'],
  'Car Rental': ['pickupDate', 'pickupLocation'],
  'Private Jet': ['departure', 'destination', 'date'],
  Driver: ['dates'],
  Restaurant: ['date'],
  Yacht: ['date'],
  'Moving & Logistics': ['moveDate', 'pickupAddress'],
  Truck: ['date', 'pickupAddress'],
  Forklift: ['date', 'location'],
  Concierge: ['request'],
  Other: ['request'],
};
