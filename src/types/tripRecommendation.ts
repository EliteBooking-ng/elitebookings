import type { ServiceType } from './trip';

// Tracks every follow-up suggestion shown to a customer, so the same
// trip+serviceType combo is never recommended twice once it's been decided
// (accepted or dismissed) — and so the data is available later to see which
// recommendations actually convert.
export type RecommendationTrigger = 'trip_created' | 'service_added' | 'service_confirmed' | 'trip_viewed';

export interface TripRecommendation {
  id: string;
  tripId: string;
  guestId: string; // this app has no customer accounts — guestId is the existing browser-only identity already on Trip
  recommendationType: RecommendationTrigger;
  serviceType: ServiceType;
  shownAt: any;
  accepted: boolean;
  dismissed: boolean;
  createdServiceId?: string | null;
}
