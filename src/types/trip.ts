// A Trip is the primary booking object: one customer journey that multiple
// services (hotel, airport pickup, car rental, driver, etc.) attach to under
// one human-readable Trip ID, instead of each being an isolated submission.

export type ServiceType =
  | 'Hotel' | 'Shortlet' | 'Airport Pickup' | 'Car Rental' | 'Private Jet' | 'Driver'
  | 'Restaurant' | 'Yacht' | 'Moving & Logistics' | 'Truck' | 'Forklift' | 'Concierge' | 'Other';

export type ServiceStatus =
  | 'Pending' | 'Searching' | 'Provider Found' | 'Awaiting Customer Confirmation'
  | 'Confirmed' | 'Completed' | 'Cancelled';

// Orthogonal to ServiceStatus — a service can be e.g. Confirmed and still
// Payment Pending. Manually set by admin staff (no payment gateway anywhere
// in this app; every booking is coordinated by hand), mirrors how
// providerAssigned/price/commission already work.
export type PaymentStatus = 'Unpaid' | 'Payment Pending' | 'Paid';

// 'Building' is a pre-submission draft state: services can already be
// attached and written to Firestore, but the customer hasn't pressed
// "Submit Trip Request" yet, so the team isn't notified and it's excluded
// from the admin dashboard's default trip view.
export type TripStatus = 'Building' | 'New' | 'Processing' | 'Partially Confirmed' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface Trip {
  id: string;
  tripCode: string; // EB-TRIP-####
  guestId: string;  // localStorage-based owning-browser link, not an account
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  location: string; // seeded from the first (hotel/shortlet) service
  status: TripStatus;
  createdAt: any;
  updatedAt: any;
  assignedStaff?: string;
  internalNotes?: string;
}

// `details` is intentionally a flexible bag rather than one large interface
// with every possible field: the ~9 service types have genuinely disjoint
// shapes (flight number vs. cuisine preference vs. moving inventory), and
// `summary` gives the admin table one uniform column to render regardless
// of type — `details` only needs to be understood inside the service's own
// detail view.
export interface TripService {
  id: string;
  tripId: string;
  type: ServiceType;
  status: ServiceStatus;
  summary: string;
  details: Record<string, any>;
  providerAssigned?: string; // plain string, matches car_requests' existing `agency` field
  price?: number | null;
  commission?: number | null;
  paymentStatus?: PaymentStatus; // defaults to 'Unpaid' when absent
  adminNotes?: string; // internal-only — never shown to the customer
  confirmationNotes?: string; // customer-visible confirmation details / important instructions
  // Reserved seam for a future phase: real per-type availability/pricing
  // checks. Always omitted/false today — no current code path sets it.
  availabilityChecked?: boolean;
  createdAt: any;
  updatedAt: any;
}

export const SERVICE_TYPES: ServiceType[] = [
  'Hotel', 'Shortlet', 'Airport Pickup', 'Car Rental', 'Private Jet', 'Driver',
  'Restaurant', 'Yacht', 'Moving & Logistics', 'Truck', 'Forklift', 'Concierge', 'Other'
];

export const PAYMENT_STATUSES: PaymentStatus[] = ['Unpaid', 'Payment Pending', 'Paid'];

export const SERVICE_STATUSES: ServiceStatus[] = [
  'Pending', 'Searching', 'Provider Found', 'Awaiting Customer Confirmation',
  'Confirmed', 'Completed', 'Cancelled'
];

// One doc per meaningful change on a trip or its services — gives admin a
// full "view the entire activity history" audit trail.
export interface TripActivityLogEntry {
  id: string;
  tripId: string;
  serviceId?: string;
  action: string;
  actor: 'customer' | 'admin';
  detail: string;
  createdAt: any;
}
