import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../firebase';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import type { ServiceType, Trip, TripService } from '../types/trip';
import type { RecommendationTrigger, TripRecommendation } from '../types/tripRecommendation';
import { getNextRecommendation } from '../utils/tripRecommendations';

export interface ActiveRecommendation {
  recommendationId: string;
  serviceType: ServiceType;
  triggerType: RecommendationTrigger;
  confirmedServiceType?: ServiceType; // set only for 'service_confirmed', drives the "{X} confirmed ✓" line
}

export interface UseTripRecommendationsResult {
  active: ActiveRecommendation | null;
  accept: () => void;
  dismiss: () => void;
  markServiceCreated: (serviceId: string) => void;
  notifyTripViewed: () => void;
}

// Browser-only, same pattern as useActiveTrip — no customer accounts, so
// recommendations are tracked per trip, not per account.
export function useTripRecommendations(trip: Trip | null, services: TripService[], guestId: string): UseTripRecommendationsResult {
  const [enabled, setEnabled] = useState(true);
  const [recommendations, setRecommendations] = useState<TripRecommendation[]>([]);
  const [active, setActive] = useState<ActiveRecommendation | null>(null);

  const prevServiceIdsRef = useRef<Set<string>>(new Set());
  const prevStatusRef = useRef<Map<string, string>>(new Map());
  const hasRunGeneralCheckForTripRef = useRef<Set<string>>(new Set());

  // Global settings doc — Firestore so the admin's toggle actually reaches
  // every customer's browser (a localStorage flag would only ever apply to
  // whichever device set it, the exact bug this app shipped with once before).
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'recommendations'), (snap) => {
      setEnabled(snap.exists() ? snap.data().enabled !== false : true);
    }, (error) => {
      console.warn('Error reading recommendations settings, defaulting to enabled:', error);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!trip) {
      setRecommendations([]);
      return;
    }
    const q = query(collection(db, 'trip_recommendations'), where('tripId', '==', trip.id));
    const unsub = onSnapshot(q, (snapshot) => {
      setRecommendations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TripRecommendation)));
    }, (error) => {
      console.warn('Error listening to trip_recommendations:', error);
    });
    return unsub;
  }, [trip?.id]);

  const decidedTypes = recommendations.filter((r) => r.accepted || r.dismissed).map((r) => r.serviceType);
  const existingTypes = services.map((s) => s.type);

  const showRecommendation = useCallback(async (triggerType: RecommendationTrigger, forType: ServiceType) => {
    if (!trip || !enabled || active) return;
    const next = getNextRecommendation(forType, existingTypes, decidedTypes);
    if (!next) return;
    try {
      const docRef = await addDoc(collection(db, 'trip_recommendations'), {
        tripId: trip.id,
        guestId,
        recommendationType: triggerType,
        serviceType: next,
        shownAt: serverTimestamp(),
        accepted: false,
        dismissed: false,
        createdServiceId: null,
      });
      setActive({
        recommendationId: docRef.id,
        serviceType: next,
        triggerType,
        confirmedServiceType: triggerType === 'service_confirmed' ? forType : undefined,
      });
    } catch (err) {
      console.warn('Error writing trip recommendation:', err);
    }
  }, [trip, enabled, active, existingTypes, decidedTypes, guestId]);

  // Reactive triggers: a service was just added, or just flipped to Confirmed.
  useEffect(() => {
    if (!trip || services.length === 0) {
      prevServiceIdsRef.current = new Set();
      prevStatusRef.current = new Map();
      return;
    }

    const prevIds = prevServiceIdsRef.current;
    const newlyAdded = services.find((s) => !prevIds.has(s.id));
    const newlyConfirmed = services.find((s) => prevStatusRef.current.get(s.id) && prevStatusRef.current.get(s.id) !== 'Confirmed' && s.status === 'Confirmed');

    prevServiceIdsRef.current = new Set(services.map((s) => s.id));
    prevStatusRef.current = new Map(services.map((s) => [s.id, s.status]));

    if (newlyConfirmed) {
      showRecommendation('service_confirmed', newlyConfirmed.type);
    } else if (newlyAdded && prevIds.size > 0) {
      // prevIds.size > 0 skips the very first render (handled by the general
      // trip_created/trip_viewed check below instead, so it isn't double-fired).
      showRecommendation('service_added', newlyAdded.type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, trip?.id]);

  const runGeneralCheck = useCallback((triggerType: RecommendationTrigger) => {
    if (!trip || active || existingTypes.length === 0) return;
    for (const type of existingTypes) {
      const next = getNextRecommendation(type, existingTypes, decidedTypes);
      if (next) {
        showRecommendation(triggerType, type);
        return;
      }
    }
  }, [trip, active, existingTypes, decidedTypes, showRecommendation]);

  // trip_created: the very first time a given trip is seen with its seed
  // service — tracked per trip id so starting a brand-new trip later in the
  // same session (after "Create New Trip") still gets its own initial check.
  useEffect(() => {
    if (!trip || hasRunGeneralCheckForTripRef.current.has(trip.id)) return;
    hasRunGeneralCheckForTripRef.current.add(trip.id);
    runGeneralCheck('trip_created');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id]);

  const notifyTripViewed = useCallback(() => {
    runGeneralCheck('trip_viewed');
  }, [runGeneralCheck]);

  const accept = useCallback(() => {
    if (!active) return;
    updateDoc(doc(db, 'trip_recommendations', active.recommendationId), { accepted: true }).catch((err) =>
      console.warn('Error marking recommendation accepted:', err)
    );
    // AddServiceModal (opened by the caller for active.serviceType) is what
    // actually creates the service — markServiceCreated links it back once it does.
  }, [active]);

  const markServiceCreated = useCallback((serviceId: string) => {
    if (!active) return;
    updateDoc(doc(db, 'trip_recommendations', active.recommendationId), { createdServiceId: serviceId }).catch((err) =>
      console.warn('Error linking created service to recommendation:', err)
    );
    setActive(null);
  }, [active]);

  const dismiss = useCallback(() => {
    if (!active) return;
    updateDoc(doc(db, 'trip_recommendations', active.recommendationId), { dismissed: true }).catch((err) =>
      console.warn('Error dismissing recommendation:', err)
    );
    setActive(null);
  }, [active]);

  return { active, accept, dismiss, markServiceCreated, notifyTripViewed };
}
