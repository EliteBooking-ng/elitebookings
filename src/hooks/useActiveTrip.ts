import { useCallback, useEffect, useState } from 'react';
import { db } from '../firebase';
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import type { ServiceType, Trip, TripService } from '../types/trip';
import { generateRequestId } from '../utils/generateRequestId';
import { computeTripStatus } from '../utils/tripStatus';

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

export interface UseActiveTripResult {
  trip: Trip | null;
  services: TripService[];
  derivedStatus: ReturnType<typeof computeTripStatus>;
  loading: boolean;
  createTrip: (seedType: ServiceType, seedDetails: Record<string, any>, seedSummary: string, customer: CustomerInfo, location: string) => Promise<{ id: string; tripCode: string }>;
  addServiceToTrip: (type: ServiceType, details: Record<string, any>, summary: string) => Promise<string>;
  submitTripRequest: () => Promise<void>;
  clearActiveTrip: () => void;
}

// Browser-only trip persistence — no customer accounts. Mirrors the existing
// (previously unused) `guestId` localStorage pattern in App.tsx: this browser
// IS the customer, identified by whatever it remembers in localStorage.
export function useActiveTrip(guestId: string): UseActiveTripResult {
  const [activeTripId, setActiveTripIdState] = useState<string | null>(() => localStorage.getItem('activeTripId'));
  const [trip, setTrip] = useState<Trip | null>(null);
  const [services, setServices] = useState<TripService[]>([]);
  const [loading, setLoading] = useState(false);

  const setActiveTripId = (id: string | null) => {
    if (id) localStorage.setItem('activeTripId', id);
    else localStorage.removeItem('activeTripId');
    setActiveTripIdState(id);
  };

  const logActivity = (tripId: string, action: string, detail: string, serviceId?: string) => {
    addDoc(collection(db, 'trip_activity_log'), {
      tripId, action, detail, actor: 'customer', serviceId: serviceId || null, createdAt: serverTimestamp(),
    }).catch((err) => console.warn('Trip activity log write failed:', err));
  };

  useEffect(() => {
    if (!activeTripId) {
      setTrip(null);
      setServices([]);
      return;
    }
    setLoading(true);

    const unsubTrip = onSnapshot(doc(db, 'trips', activeTripId), (snap) => {
      if (!snap.exists()) {
        setTrip(null);
        return;
      }
      setTrip({ id: snap.id, ...snap.data() } as Trip);
    }, (error) => {
      console.error('Error listening to active trip:', error);
    });

    const servicesQuery = query(collection(db, 'trip_services'), where('tripId', '==', activeTripId), orderBy('createdAt', 'asc'));
    const unsubServices = onSnapshot(servicesQuery, (snapshot) => {
      setServices(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TripService)));
      setLoading(false);
    }, (error) => {
      console.error('Error listening to trip services:', error);
      setLoading(false);
    });

    return () => {
      unsubTrip();
      unsubServices();
    };
  }, [activeTripId]);

  const createTrip = useCallback(async (
    seedType: ServiceType,
    seedDetails: Record<string, any>,
    seedSummary: string,
    customer: CustomerInfo,
    location: string
  ): Promise<{ id: string; tripCode: string }> => {
    const tripCode = generateRequestId('TRIP');
    const tripDoc = await addDoc(collection(db, 'trips'), {
      tripCode,
      guestId,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      location,
      status: 'Building',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'trip_services'), {
      tripId: tripDoc.id,
      type: seedType,
      status: 'Pending',
      summary: seedSummary,
      details: seedDetails,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setActiveTripId(tripDoc.id);
    logActivity(tripDoc.id, 'trip_created', `Trip created, seeded with ${seedType}: ${seedSummary}`);
    return { id: tripDoc.id, tripCode };
  }, [guestId]);

  const addServiceToTrip = useCallback(async (type: ServiceType, details: Record<string, any>, summary: string): Promise<string> => {
    if (!activeTripId) return '';
    const serviceDoc = await addDoc(collection(db, 'trip_services'), {
      tripId: activeTripId,
      type,
      status: 'Pending',
      summary,
      details,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'trips', activeTripId), { updatedAt: serverTimestamp() });
    logActivity(activeTripId, 'service_added', `${type} added to trip: ${summary}`);
    return serviceDoc.id;
  }, [activeTripId]);

  // Finalizes the trip — no service data is written here (that already
  // happened when each was added); this only flips the trip out of its
  // pre-submission draft state so the team gets notified. Notification
  // sending itself is handled by the caller (it needs trip+services data
  // already in scope in the component calling this).
  const submitTripRequest = useCallback(async () => {
    if (!activeTripId) return;
    await updateDoc(doc(db, 'trips', activeTripId), { status: 'New', updatedAt: serverTimestamp() });
    logActivity(activeTripId, 'trip_submitted', 'Trip request submitted by customer');
  }, [activeTripId]);

  const clearActiveTrip = useCallback(() => {
    setActiveTripId(null);
  }, []);

  return {
    trip,
    services,
    derivedStatus: computeTripStatus(services),
    loading,
    createTrip,
    addServiceToTrip,
    submitTripRequest,
    clearActiveTrip,
  };
}
