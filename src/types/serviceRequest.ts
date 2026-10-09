import type { ServiceType } from './trip';

// Trip-independent — the universal "Request a Service" fallback, for when a
// customer can't find what they need. Same flat pattern as car_requests /
// moving_requests / jet_requests (not the Trip/trip_services relational
// pair, which always requires a parent Trip to exist first).
export interface ServiceRequest {
  id: string;
  requestId: string; // EB-REQ-####
  category: ServiceType;
  // The tapped option (e.g. "Luxury Hotel", "Full-Day Driver") — guided
  // choice is the primary input now; `description` holds that plus any
  // optional free-text the customer added on top of it.
  preferredType?: string;
  description: string;
  location?: string;
  preferredDate?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  source: string; // which entry point this came from, e.g. 'Homepage', 'Hotels Empty Search', 'AI Concierge'
  status: 'New' | 'Searching' | 'Found Match' | 'Closed';
  adminNotes?: string;
  createdAt: any;
}

export const SERVICE_REQUEST_STATUSES: ServiceRequest['status'][] = ['New', 'Searching', 'Found Match', 'Closed'];
