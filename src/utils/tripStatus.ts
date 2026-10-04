import type { ServiceStatus, TripStatus, TripService } from '../types/trip';

// Single source of truth for deriving a trip's overall status from its
// services' individual statuses — called from useActiveTrip (client-side
// optimistic display) and from AdminDashboard's per-service status-change
// handler (recomputed and written to the parent trip right after any
// service status update), so the two never drift out of sync.
export function computeTripStatus(services: Pick<TripService, 'status'>[]): TripStatus {
  if (services.length === 0) return 'Building';

  const statuses: ServiceStatus[] = services.map((s) => s.status);
  if (statuses.every((s) => s === 'Completed')) return 'Completed';
  if (statuses.every((s) => s === 'Cancelled')) return 'Cancelled';

  const relevant = statuses.filter((s) => s !== 'Cancelled');
  if (
    relevant.length > 0 &&
    relevant.every((s) => s === 'Confirmed' || s === 'Completed') &&
    relevant.some((s) => s === 'Confirmed')
  ) {
    return 'Confirmed';
  }
  if (relevant.some((s) => s === 'Confirmed' || s === 'Completed')) return 'Partially Confirmed';
  if (relevant.some((s) => s !== 'Pending')) return 'Processing';
  return 'New';
}
