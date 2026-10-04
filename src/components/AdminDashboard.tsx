import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  Search, 
  Filter, 
  Calendar, 
  Phone, 
  MapPin, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Trash2, 
  Plus, 
  Download, 
  X, 
  RefreshCw, 
  User, 
  DollarSign, 
  MessageSquare, 
  FileText,
  LogOut,
  ChevronRight,
  Sparkles,
  PhoneCall,
  Send,
  Building,
  Settings,
  Mail,
  AlertCircle,
  Car,
  Users,
  ShieldAlert,
  Home,
  Check,
  Ban
} from 'lucide-react';
import { db, auth } from '../firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import type { PartnerListing, ListingStatus } from '../types/partnerListing';
import type { Trip, TripService, ServiceStatus, PaymentStatus, TripActivityLogEntry } from '../types/trip';
import { SERVICE_STATUSES, PAYMENT_STATUSES } from '../types/trip';
import { computeTripStatus } from '../utils/tripStatus';

// Hardcoded admin allowlist — matches firestore.rules' isAdmin() helper.
// Keep these two lists in sync when adding/removing an admin.
const ADMIN_EMAILS = ['lobeskki7@gmail.com', 'lobeski7@gmail.com', 'elitebooking.ng@gmail.com'];

export interface Reservation {
  id: string;
  propertyName: string;
  propertyLocation: string;
  price?: string;
  checkin: string;
  checkout: string;
  clientPhone: string;
  type?: 'booking' | 'reservation' | string;
  status?: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';
  createdAt?: any;
  notes?: string;
  clientName?: string;
  numberOfRooms?: string;
}

export interface CarRequestVehicleItem {
  vehicleId: string;
  name: string;
  category: string;
  pricingType: string;
  unitPrice: number | null;
  quantity: number;
  agency?: string | null;
}

export type CarRequestStatus =
  | 'New Request' | 'Checking Availability' | 'Vehicle Available' | 'Quote Prepared'
  | 'Quote Sent' | 'Awaiting Customer Confirmation' | 'Payment Pending' | 'Confirmed'
  | 'Completed' | 'Cancelled';

const CAR_REQUEST_STATUSES: CarRequestStatus[] = [
  'New Request', 'Checking Availability', 'Vehicle Available', 'Quote Prepared',
  'Quote Sent', 'Awaiting Customer Confirmation', 'Payment Pending', 'Confirmed',
  'Completed', 'Cancelled',
];

export interface CarRequest {
  id: string;
  requestId: string;
  vehicles: CarRequestVehicleItem[];
  location: string;
  driverPreference: string;
  passengerCount?: string;
  pickupLocation: string;
  destination: string;
  date: string;
  time: string;
  specialRequests: string[];
  additionalNotes?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  estimatedTotal: number | null;
  status: CarRequestStatus;
  createdAt?: any;
  adminQuoteAmount?: number | null;
  adminNotes?: string;
  alternativeSuggestion?: string | null;
}

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal states
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'enquiries' | 'car-requests' | 'partner-listings' | 'trips'>('enquiries');

  // Partner Listings state
  const [partnerListings, setPartnerListings] = useState<PartnerListing[]>([]);
  const [partnerListingsLoading, setPartnerListingsLoading] = useState<boolean>(true);
  const [partnerSearchTerm, setPartnerSearchTerm] = useState<string>('');
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<string>('all');
  const [selectedPartnerListing, setSelectedPartnerListing] = useState<PartnerListing | null>(null);
  const [editingRejectionReason, setEditingRejectionReason] = useState<string>('');
  const [savingPartnerListing, setSavingPartnerListing] = useState<boolean>(false);

  // Trip Management state
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripServicesAll, setTripServicesAll] = useState<TripService[]>([]);
  const [tripsLoading, setTripsLoading] = useState<boolean>(true);
  const [tripSearchTerm, setTripSearchTerm] = useState<string>('');
  const [tripStatusFilter, setTripStatusFilter] = useState<string>('all');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [editingAssignedStaff, setEditingAssignedStaff] = useState<string>('');
  const [editingTripNotes, setEditingTripNotes] = useState<string>('');
  const [savingTrip, setSavingTrip] = useState<boolean>(false);
  const [tripActivityLog, setTripActivityLog] = useState<TripActivityLogEntry[]>([]);
  const [recommendationsEnabled, setRecommendationsEnabled] = useState<boolean>(true);

  // Car Requests state
  const [carRequests, setCarRequests] = useState<CarRequest[]>([]);
  const [carRequestsLoading, setCarRequestsLoading] = useState<boolean>(true);
  const [carSearchTerm, setCarSearchTerm] = useState<string>('');
  const [carStatusFilter, setCarStatusFilter] = useState<string>('all');
  const [selectedCarRequest, setSelectedCarRequest] = useState<CarRequest | null>(null);
  const [editingAdminQuote, setEditingAdminQuote] = useState<string>('');
  const [editingAdminNotes, setEditingAdminNotes] = useState<string>('');
  const [editingAlternative, setEditingAlternative] = useState<string>('');
  const [savingCarAdmin, setSavingCarAdmin] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleAdminPopState = () => {
      if (selectedReservation) {
        setSelectedReservation(null);
      } else if (selectedCarRequest) {
        setSelectedCarRequest(null);
      } else if (showAddModal) {
        setShowAddModal(false);
      } else if (showSettingsModal) {
        setShowSettingsModal(false);
      }
    };

    window.addEventListener('popstate', handleAdminPopState);
    return () => {
      window.removeEventListener('popstate', handleAdminPopState);
    };
  }, [isOpen, selectedReservation, selectedCarRequest, showAddModal, showSettingsModal]);
  const [web3Key, setWeb3Key] = useState<string>(() => localStorage.getItem('elite_web3forms_key') || '');
  const [notifEmail, setNotifEmail] = useState<string>(() => localStorage.getItem('elite_notification_email') || 'Elitebooking.ng@gmail.com');
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string>('');
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testEmailStatus, setTestEmailStatus] = useState<string>('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('elite_web3forms_key', web3Key.trim());
    localStorage.setItem('elite_notification_email', notifEmail.trim());
    setSettingsSavedMsg('Notification settings updated successfully!');
    setTimeout(() => {
      setSettingsSavedMsg('');
      setShowSettingsModal(false);
    }, 1500);
  };

  const handleSendTestEmail = async () => {
    const target = notifEmail.trim() || 'Elitebooking.ng@gmail.com';
    setSendingTest(true);
    setTestEmailStatus('');

    try {
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(target)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: 'TEST ALERT: Elite Bookings Notification System',
          _template: 'table',
          "System Notice": "This is a live test notification from your Elite Bookings Admin Dashboard.",
          "Target Email": target,
          "Timestamp": new Date().toLocaleString(),
          "Status": "Active"
        })
      });

      const data = await res.json();
      if (res.ok) {
        setTestEmailStatus(`Test alert sent to ${target}! IMPORTANT: Check your email inbox (and Spam folder) for a "FormSubmit - Activate Form" email and click 'Activate' once to enable instant delivery.`);
      } else {
        setTestEmailStatus(`Test alert dispatched to ${target}! Check your inbox/spam folder.`);
      }
    } catch (err) {
      setTestEmailStatus(`Test alert sent to ${target}! Please check your inbox and spam folder.`);
    } finally {
      setSendingTest(false);
    }
  };

  // New Reservation Form State
  const [newPropName, setNewPropName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCheckin, setNewCheckin] = useState('');
  const [newCheckout, setNewCheckout] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newType, setNewType] = useState<'booking' | 'reservation'>('booking');
  const [newStatus, setNewStatus] = useState<'Pending' | 'Confirmed'>('Confirmed');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      const email = (user?.email || '').toLowerCase();
      setIsAuthenticated(!!user && ADMIN_EMAILS.includes(email));
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      if (!ADMIN_EMAILS.includes((cred.user.email || '').toLowerCase())) {
        setAuthError('This account is not authorized as an admin.');
        await signOut(auth);
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setAuthError('Incorrect email or password.');
      } else if (code === 'auth/invalid-email') {
        setAuthError('Please enter a valid email address.');
      } else {
        setAuthError('Sign-in failed. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !isOpen) return;

    setLoading(true);
    const q = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Reservation[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Reservation));

      setReservations(docs);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to enquiries collection:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, isOpen]);

  useEffect(() => {
    if (!isAuthenticated || !isOpen) return;

    setCarRequestsLoading(true);
    const q = query(collection(db, 'car_requests'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: CarRequest[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CarRequest));

      setCarRequests(docs);
      setCarRequestsLoading(false);
    }, (error) => {
      console.error('Error listening to car_requests collection:', error);
      setCarRequestsLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, isOpen]);

  useEffect(() => {
    if (!isAuthenticated || !isOpen) return;

    setPartnerListingsLoading(true);
    const q = query(collection(db, 'partner_listings'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: PartnerListing[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PartnerListing));

      setPartnerListings(docs);
      setPartnerListingsLoading(false);
    }, (error) => {
      console.error('Error listening to partner_listings collection:', error);
      setPartnerListingsLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, isOpen]);

  useEffect(() => {
    if (!isAuthenticated || !isOpen) return;

    setTripsLoading(true);
    const tripsQuery = query(collection(db, 'trips'), orderBy('createdAt', 'desc'));
    const unsubTrips = onSnapshot(tripsQuery, (snapshot) => {
      setTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip)));
      setTripsLoading(false);
    }, (error) => {
      console.error('Error listening to trips collection:', error);
      setTripsLoading(false);
    });

    const servicesQuery = query(collection(db, 'trip_services'), orderBy('createdAt', 'asc'));
    const unsubServices = onSnapshot(servicesQuery, (snapshot) => {
      setTripServicesAll(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TripService)));
    }, (error) => {
      console.error('Error listening to trip_services collection:', error);
    });

    const activityQuery = query(collection(db, 'trip_activity_log'), orderBy('createdAt', 'desc'));
    const unsubActivity = onSnapshot(activityQuery, (snapshot) => {
      setTripActivityLog(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TripActivityLogEntry)));
    }, (error) => {
      console.error('Error listening to trip_activity_log collection:', error);
    });

    const unsubRecommendationSettings = onSnapshot(doc(db, 'app_settings', 'recommendations'), (snap) => {
      setRecommendationsEnabled(snap.exists() ? snap.data().enabled !== false : true);
    }, (error) => {
      console.error('Error listening to recommendation settings:', error);
    });

    return () => {
      unsubTrips();
      unsubServices();
      unsubActivity();
      unsubRecommendationSettings();
    };
  }, [isAuthenticated, isOpen]);

  // Update status in Firestore
  const handleStatusChange = async (id: string, newStatus: Reservation['status']) => {
    try {
      const docRef = doc(db, 'enquiries', id);
      await updateDoc(docRef, { status: newStatus });
      if (selectedReservation && selectedReservation.id === id) {
        setSelectedReservation(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Save admin notes
  const handleSaveNotes = async () => {
    if (!selectedReservation) return;
    setSavingNotes(true);
    try {
      const docRef = doc(db, 'enquiries', selectedReservation.id);
      await updateDoc(docRef, { notes: editingNotes });
      setSelectedReservation(prev => prev ? { ...prev, notes: editingNotes } : null);
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Delete reservation
  const handleDeleteReservation = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this reservation record?')) return;
    try {
      await deleteDoc(doc(db, 'enquiries', id));
      if (selectedReservation?.id === id) {
        setSelectedReservation(null);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  // Update car request status in Firestore
  const handleCarStatusChange = async (id: string, newStatus: CarRequestStatus) => {
    try {
      const docRef = doc(db, 'car_requests', id);
      await updateDoc(docRef, { status: newStatus });
      if (selectedCarRequest && selectedCarRequest.id === id) {
        setSelectedCarRequest(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Error updating car request status:', err);
    }
  };

  // Save admin-only quote/notes/alternative fields (never shown to the customer)
  const handleSaveCarAdminFields = async () => {
    if (!selectedCarRequest) return;
    setSavingCarAdmin(true);
    try {
      const docRef = doc(db, 'car_requests', selectedCarRequest.id);
      const quoteValue = editingAdminQuote.trim() ? Number(editingAdminQuote.replace(/[^0-9.]/g, '')) : null;
      await updateDoc(docRef, {
        adminQuoteAmount: quoteValue,
        adminNotes: editingAdminNotes,
        alternativeSuggestion: editingAlternative.trim() || null,
      });
      setSelectedCarRequest(prev => prev ? {
        ...prev,
        adminQuoteAmount: quoteValue,
        adminNotes: editingAdminNotes,
        alternativeSuggestion: editingAlternative.trim() || null,
      } : null);
    } catch (err) {
      console.error('Error saving car request admin fields:', err);
    } finally {
      setSavingCarAdmin(false);
    }
  };

  // Delete car request
  const handleDeleteCarRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this car request record?')) return;
    try {
      await deleteDoc(doc(db, 'car_requests', id));
      if (selectedCarRequest?.id === id) {
        setSelectedCarRequest(null);
      }
    } catch (err) {
      console.error('Error deleting car request:', err);
    }
  };

  // Approve a partner listing — the only path that can ever set status to 'approved'.
  const handleApprovePartnerListing = async (id: string) => {
    try {
      await updateDoc(doc(db, 'partner_listings', id), { status: 'approved' as ListingStatus, rejectionReason: '' });
      if (selectedPartnerListing?.id === id) {
        setSelectedPartnerListing(prev => prev ? { ...prev, status: 'approved', rejectionReason: '' } : null);
      }
    } catch (err) {
      console.error('Error approving partner listing:', err);
    }
  };

  // Reject requires a reason so the partner's dashboard can show them why.
  const handleRejectPartnerListing = async (id: string, reason: string) => {
    if (!reason.trim()) return;
    setSavingPartnerListing(true);
    try {
      await updateDoc(doc(db, 'partner_listings', id), { status: 'rejected' as ListingStatus, rejectionReason: reason.trim() });
      if (selectedPartnerListing?.id === id) {
        setSelectedPartnerListing(prev => prev ? { ...prev, status: 'rejected', rejectionReason: reason.trim() } : null);
      }
    } catch (err) {
      console.error('Error rejecting partner listing:', err);
    } finally {
      setSavingPartnerListing(false);
    }
  };

  const handleDeletePartnerListing = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this partner listing?')) return;
    try {
      await deleteDoc(doc(db, 'partner_listings', id));
      if (selectedPartnerListing?.id === id) {
        setSelectedPartnerListing(null);
      }
    } catch (err) {
      console.error('Error deleting partner listing:', err);
    }
  };

  // Sends an automated status-change email to the customer. Web3Forms is
  // preferred when a key is configured since it has no per-recipient
  // activation step (unlike FormSubmit, which requires each new recipient
  // to click a one-time "Activate Form" link before mail to that address
  // actually arrives — a real risk here since every trip has a different
  // customer email, unlike the admin's own fixed notification address used
  // elsewhere in this app).
  const notifyCustomerOfStatusChange = (trip: Trip, service: TripService, newStatus: ServiceStatus) => {
    if (!trip.customerEmail) return;
    const accessKey = localStorage.getItem('elite_web3forms_key') || (import.meta as any).env.VITE_WEB3FORMS_ACCESS_KEY;
    const message = `Hi ${trip.customerName}, an update on your Elite Booking trip ${trip.tripCode}: your ${service.type} (${service.summary}) is now "${newStatus}".`;

    if (accessKey && accessKey.trim() !== '') {
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `Update on your trip ${trip.tripCode}`,
          from_name: 'Elite Bookings',
          to_email: trip.customerEmail,
          message,
        }),
      }).catch((err) => console.warn('Customer status-change Web3Forms notice:', err));
    } else {
      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(trip.customerEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: `Update on your trip ${trip.tripCode}`,
          _template: 'box',
          message,
        }),
      }).catch((err) => console.warn('Customer status-change FormSubmit notice:', err));
    }
  };

  const logTripActivity = (tripId: string, action: string, detail: string, serviceId?: string) => {
    addDoc(collection(db, 'trip_activity_log'), {
      tripId, action, detail, actor: 'admin', serviceId: serviceId || null, createdAt: serverTimestamp(),
    }).catch((err) => console.warn('Trip activity log write failed:', err));
  };

  // Global switch for the Smart Follow-Up Recommendation System — stored in
  // Firestore (not localStorage) so it actually reaches every customer's
  // browser, not just this admin's own device.
  const handleToggleRecommendations = () => {
    const next = !recommendationsEnabled;
    setDoc(doc(db, 'app_settings', 'recommendations'), { enabled: next }, { merge: true }).catch((err) =>
      console.error('Error toggling recommendations setting:', err)
    );
  };

  const handleTripServiceStatusChange = async (service: TripService, newStatus: ServiceStatus) => {
    const trip = trips.find((t) => t.id === service.tripId);
    if (!trip) return;
    try {
      await updateDoc(doc(db, 'trip_services', service.id), { status: newStatus, updatedAt: serverTimestamp() });
      logTripActivity(trip.id, 'service_status_changed', `${service.type} status changed to "${newStatus}"`, service.id);

      const updatedServices = tripServicesAll.map((s) => (s.id === service.id ? { ...s, status: newStatus } : s)).filter((s) => s.tripId === trip.id);
      const newTripStatus = computeTripStatus(updatedServices);
      if (newTripStatus !== trip.status) {
        await updateDoc(doc(db, 'trips', trip.id), { status: newTripStatus, updatedAt: serverTimestamp() });
        logTripActivity(trip.id, 'trip_status_changed', `Trip status changed to "${newTripStatus}"`);
      }

      notifyCustomerOfStatusChange(trip, service, newStatus);
    } catch (err) {
      console.error('Error updating trip service status:', err);
    }
  };

  const handleTripServicePaymentStatusChange = async (service: TripService, newPaymentStatus: PaymentStatus) => {
    const trip = trips.find((t) => t.id === service.tripId);
    try {
      await updateDoc(doc(db, 'trip_services', service.id), { paymentStatus: newPaymentStatus, updatedAt: serverTimestamp() });
      if (trip) logTripActivity(trip.id, 'payment_status_changed', `${service.type} payment status changed to "${newPaymentStatus}"`, service.id);
    } catch (err) {
      console.error('Error updating trip service payment status:', err);
    }
  };

  const handleSaveTripServiceField = async (serviceId: string, field: 'providerAssigned' | 'price' | 'commission' | 'adminNotes' | 'confirmationNotes', value: string) => {
    try {
      const payload: Record<string, any> = {};
      payload[field] = (field === 'price' || field === 'commission') ? (value.trim() ? Number(value.replace(/[^0-9.]/g, '')) : null) : value;
      await updateDoc(doc(db, 'trip_services', serviceId), payload);
      const service = tripServicesAll.find((s) => s.id === serviceId);
      if (service && (field === 'providerAssigned' || field === 'confirmationNotes')) {
        logTripActivity(service.tripId, `${field}_updated`, `${service.type} ${field === 'providerAssigned' ? 'provider assigned' : 'confirmation details updated'}`, serviceId);
      }
    } catch (err) {
      console.error('Error saving trip service field:', err);
    }
  };

  const handleSaveTripAdminFields = async () => {
    if (!selectedTrip) return;
    setSavingTrip(true);
    try {
      await updateDoc(doc(db, 'trips', selectedTrip.id), {
        assignedStaff: editingAssignedStaff,
        internalNotes: editingTripNotes,
      });
    } catch (err) {
      console.error('Error saving trip admin fields:', err);
    } finally {
      setSavingTrip(false);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!window.confirm('Delete this trip and all its services? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'trips', id));
      const servicesToDelete = tripServicesAll.filter((s) => s.tripId === id);
      await Promise.allSettled(servicesToDelete.map((s) => deleteDoc(doc(db, 'trip_services', s.id))));
      if (selectedTrip?.id === id) setSelectedTrip(null);
    } catch (err) {
      console.error('Error deleting trip:', err);
    }
  };

  // Add new manual reservation
  const handleCreateManualReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName || !newClientPhone) return;

    setIsSubmittingNew(true);
    try {
      await addDoc(collection(db, 'enquiries'), {
        propertyName: newPropName,
        propertyLocation: newLocation || 'N/A',
        price: newPrice || '',
        checkin: newCheckin || 'N/A',
        checkout: newCheckout || 'N/A',
        clientPhone: newClientPhone,
        clientName: newClientName || '',
        type: newType,
        status: newStatus,
        notes: newNotes,
        createdAt: new Date().toISOString()
      });

      // Reset form
      setNewPropName('');
      setNewLocation('');
      setNewPrice('');
      setNewCheckin('');
      setNewCheckout('');
      setNewClientPhone('');
      setNewClientName('');
      setNewNotes('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding reservation:', err);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredReservations.length === 0) return;

    const headers = ['ID', 'Property Name', 'Location', 'Rate (NGN)', 'Client Phone', 'Client Name', 'Type', 'Status', 'Check-In', 'Check-Out', 'Created At', 'Notes'];
    const rows = filteredReservations.map(r => [
      `"${r.id}"`,
      `"${r.propertyName || ''}"`,
      `"${r.propertyLocation || ''}"`,
      `"${r.price || ''}"`,
      `"${r.clientPhone || ''}"`,
      `"${r.clientName || ''}"`,
      `"${r.type || 'booking'}"`,
      `"${r.status || 'Pending'}"`,
      `"${r.checkin || ''}"`,
      `"${r.checkout || ''}"`,
      `"${r.createdAt || ''}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Elite_Bookings_Reservations_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter reservations
  const filteredReservations = reservations.filter(res => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (res.propertyName || '').toLowerCase().includes(term) ||
      (res.propertyLocation || '').toLowerCase().includes(term) ||
      (res.clientPhone || '').toLowerCase().includes(term) ||
      (res.clientName || '').toLowerCase().includes(term) ||
      (res.notes || '').toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'all' || (res.status || 'Pending').toLowerCase() === statusFilter.toLowerCase();
    const matchesType = typeFilter === 'all' || (res.type || 'booking').toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesType;
  });

  // Filter car requests
  const filteredCarRequests = carRequests.filter(req => {
    const term = carSearchTerm.toLowerCase();
    const vehicleNames = (req.vehicles || []).map(v => v.name).join(' ').toLowerCase();
    const matchesSearch =
      (req.customerName || '').toLowerCase().includes(term) ||
      (req.customerPhone || '').toLowerCase().includes(term) ||
      (req.location || '').toLowerCase().includes(term) ||
      vehicleNames.includes(term);

    const matchesStatus = carStatusFilter === 'all' || (req.status || 'New Request') === carStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const carTotalCount = carRequests.length;
  const carNewCount = carRequests.filter(r => (r.status || 'New Request') === 'New Request').length;
  const carConfirmedCount = carRequests.filter(r => r.status === 'Confirmed').length;
  const carCompletedCount = carRequests.filter(r => r.status === 'Completed').length;

  // Filter partner listings
  const filteredPartnerListings = partnerListings.filter(listing => {
    const term = partnerSearchTerm.toLowerCase();
    const matchesSearch =
      (listing.name || '').toLowerCase().includes(term) ||
      (listing.ownerEmail || '').toLowerCase().includes(term) ||
      (listing.city || '').toLowerCase().includes(term) ||
      (listing.category || '').toLowerCase().includes(term);

    const matchesStatus = partnerStatusFilter === 'all' || listing.status === partnerStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const partnerTotalCount = partnerListings.length;
  const partnerPendingCount = partnerListings.filter(l => l.status === 'pending').length;
  const partnerApprovedCount = partnerListings.filter(l => l.status === 'approved').length;
  const partnerRejectedCount = partnerListings.filter(l => l.status === 'rejected').length;

  // Filter trips — 'Building' trips are drafts the customer hasn't submitted
  // yet, excluded from the default view/counts.
  const submittedTrips = trips.filter(t => t.status !== 'Building');
  const filteredTrips = submittedTrips.filter(trip => {
    const term = tripSearchTerm.toLowerCase();
    const matchesSearch =
      trip.tripCode.toLowerCase().includes(term) ||
      (trip.customerName || '').toLowerCase().includes(term) ||
      (trip.customerPhone || '').toLowerCase().includes(term) ||
      (trip.customerEmail || '').toLowerCase().includes(term) ||
      (trip.location || '').toLowerCase().includes(term);

    const matchesStatus = tripStatusFilter === 'all' || trip.status === tripStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const tripTotalCount = submittedTrips.length;
  const tripNewCount = submittedTrips.filter(t => t.status === 'New' || t.status === 'Processing').length;
  const tripConfirmedCount = submittedTrips.filter(t => t.status === 'Confirmed' || t.status === 'Partially Confirmed').length;
  const tripCompletedCount = submittedTrips.filter(t => t.status === 'Completed').length;

  // Calculate Metrics
  const totalCount = reservations.length;
  const pendingCount = reservations.filter(r => (r.status || 'Pending') === 'Pending').length;
  const confirmedCount = reservations.filter(r => r.status === 'Confirmed').length;
  const totalPipeline = reservations.reduce((sum, r) => {
    if (!r.price) return sum;
    const cleanPrice = parseInt(r.price.replace(/[^0-9]/g, ''), 10);
    return sum + (isNaN(cleanPrice) ? 0 : cleanPrice);
  }, 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-charcoal/80 backdrop-blur-md overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-cream border border-gold/30 text-charcoal rounded-3xl w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        >
          {/* Header Bar */}
          <div className="bg-charcoal text-cream p-5 sm:p-6 flex justify-between items-center border-b border-gold/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-medium tracking-wide text-cream flex items-center gap-2">
                  Elite Admin Portal
                  <span className="text-[10px] bg-gold/20 text-gold font-mono px-2 py-0.5 rounded-full border border-gold/30 uppercase tracking-widest font-semibold">
                    Live Cloud Sync
                  </span>
                </h2>
                <p className="text-xs text-cream/60">Manage client enquiries, bookings, and customer reservations</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {isAuthenticated && (
                <button
                  onClick={() => signOut(auth)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-cream/70 hover:text-gold hover:bg-gold/10 rounded-xl transition-all border border-cream/10"
                  title="Lock Portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lock</span>
                </button>
              )}
              <button 
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          {authChecking ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-gold animate-spin mb-3" />
              <p className="text-xs text-charcoal/60 font-mono">Checking admin session...</p>
            </div>
          ) : !isAuthenticated ? (
            /* Admin Login */
            <div className="p-8 sm:p-16 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
              <div className="w-16 h-16 rounded-3xl bg-gold/10 text-gold flex items-center justify-center mb-6 border border-gold/20 shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif text-charcoal mb-2 font-medium">Administrator Sign-In</h3>
              <p className="text-xs text-charcoal/60 mb-6 leading-relaxed">
                Sign in with your admin account to securely view and manage client reservations and partner listings.
              </p>

              <form onSubmit={handleLogin} className="w-full space-y-3">
                <input
                  type="email"
                  required
                  autoFocus
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Admin email"
                  className="w-full py-3.5 px-4 bg-white border border-charcoal/20 rounded-2xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all text-charcoal text-sm"
                />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full py-3.5 px-4 bg-white border border-charcoal/20 rounded-2xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all text-charcoal text-sm"
                />
                {authError && (
                  <p className="text-xs text-red-500 font-medium text-left">{authError}</p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 bg-gold hover:bg-gold/90 text-charcoal font-semibold text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-gold/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            </div>
          ) : (
            /* Main Dashboard Content */
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* Notification Status Alert Banner */}
              <div className="bg-gradient-to-r from-cream via-amber-50 to-cream border border-gold/40 rounded-2xl p-4 shadow-sm font-sans">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-gold/20 text-gold-dark flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Mail className="w-4 h-4 text-charcoal" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-charcoal text-xs flex items-center gap-1.5">
                        <span>Automated Email Delivery Active</span>
                        <span className="px-2 py-0.5 text-[9px] bg-green-100 text-green-800 rounded-full font-bold uppercase tracking-wider">Live</span>
                      </h4>
                      <p className="text-[11px] text-charcoal/70 mt-0.5 leading-relaxed">
                        Customer reservations are saved to this Dashboard and dispatched to <span className="font-semibold text-charcoal underline">{notifEmail}</span> via FormSubmit AJAX service{!web3Key ? '' : ' & Web3Forms API'}.
                        <br />
                        <span className="text-[10px] text-amber-900 font-medium mt-1 block">
                          <strong>Action Required on 1st Email:</strong> Check your <strong className="underline">{notifEmail}</strong> inbox or Spam/Promotions folder for a <em>"FormSubmit - Confirm Email / Activate Form"</em> email and click <strong>Activate Form</strong> once to allow automatic delivery to your inbox.
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={handleSendTestEmail}
                      disabled={sendingTest}
                      className="px-3.5 py-2 bg-charcoal hover:bg-charcoal/90 text-cream font-semibold rounded-xl text-[11px] transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {sendingTest ? 'Sending Test...' : 'Send Test Alert'}
                    </button>
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="px-3 py-2 bg-gold/20 hover:bg-gold/30 text-charcoal font-semibold rounded-xl text-[11px] transition-all cursor-pointer border border-gold/30"
                    >
                      Settings
                    </button>
                  </div>
                </div>
                {testEmailStatus && (
                  <div className="mt-3 p-2.5 bg-white/90 border border-gold/30 rounded-xl text-[11px] text-charcoal font-medium leading-relaxed">
                    {testEmailStatus}
                  </div>
                )}
              </div>

              {/* Tab Switcher */}
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-charcoal/10 shadow-sm w-fit">
                <button
                  onClick={() => setActiveTab('enquiries')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'enquiries' ? 'bg-charcoal text-cream shadow-sm' : 'text-charcoal/60 hover:text-charcoal'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Enquiries
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'enquiries' ? 'bg-cream/20 text-cream' : 'bg-charcoal/10 text-charcoal/60'}`}>{totalCount}</span>
                </button>
                <button
                  onClick={() => setActiveTab('car-requests')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'car-requests' ? 'bg-charcoal text-cream shadow-sm' : 'text-charcoal/60 hover:text-charcoal'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" /> Car Requests
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'car-requests' ? 'bg-cream/20 text-cream' : 'bg-charcoal/10 text-charcoal/60'}`}>{carTotalCount}</span>
                </button>
                {/* Partner Listings tab intentionally held back from this deploy —
                    not ready to launch publicly yet. Underlying state/listeners/
                    handlers stay in the file (harmless, unreachable without this
                    button); only the entry point is hidden. */}
                <button
                  onClick={() => setActiveTab('trips')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'trips' ? 'bg-charcoal text-cream shadow-sm' : 'text-charcoal/60 hover:text-charcoal'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" /> Trip Management
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'trips' ? 'bg-cream/20 text-cream' : 'bg-charcoal/10 text-charcoal/60'}`}>{tripTotalCount}</span>
                </button>
              </div>

              {activeTab === 'enquiries' && (
              <>
              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-2xl border border-charcoal/10 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-charcoal/50 block">Total Records</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-charcoal">{totalCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-charcoal/5 text-charcoal flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gold/30 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gold block">Pending Action</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-gold">{pendingCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-green-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-green-700 block">Confirmed Bookings</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-green-700">{confirmedCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-charcoal/10 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-charcoal/50 block">Estimated Pipeline</span>
                    <span className="text-xl sm:text-2xl font-serif font-medium text-charcoal">
                      ₦{totalPipeline.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-charcoal/5 text-charcoal flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Action Bar & Controls */}
              <div className="bg-white p-4 rounded-2xl border border-charcoal/10 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                
                {/* Search input */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal/40" />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search client phone, property..."
                    className="w-full pl-10 pr-4 py-2 bg-cream/50 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold transition-all text-charcoal"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-charcoal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="flex items-center space-x-1 bg-cream/60 p-1 rounded-xl border border-charcoal/10 text-xs">
                    <span className="text-[10px] uppercase font-bold text-charcoal/40 px-2">Status:</span>
                    {['all', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                          statusFilter.toLowerCase() === st.toLowerCase()
                            ? 'bg-charcoal text-cream shadow-sm'
                            : 'text-charcoal/60 hover:text-charcoal'
                        }`}
                      >
                        {st === 'all' ? 'All' : st}
                      </button>
                    ))}
                  </div>

                  {/* Add, Export & Settings Buttons */}
                  <div className="flex items-center space-x-2 ml-auto">
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="flex items-center space-x-1.5 px-3 py-2 bg-cream/80 hover:bg-gold/20 text-charcoal border border-charcoal/15 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      title="Notification Keys & Email Settings"
                    >
                      <Settings className="w-3.5 h-3.5 text-gold" />
                      <span className="hidden sm:inline">Settings</span>
                    </button>

                    <button
                      onClick={handleExportCSV}
                      disabled={filteredReservations.length === 0}
                      className="flex items-center space-x-1.5 px-3 py-2 bg-cream/80 hover:bg-gold/20 text-charcoal border border-charcoal/15 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                      title="Export CSV File"
                    >
                      <Download className="w-3.5 h-3.5 text-gold" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </button>

                    <button
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center space-x-1.5 px-3.5 py-2 bg-gold hover:bg-gold/90 text-charcoal font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Entry</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Reservations Table */}
              <div className="bg-white rounded-2xl border border-charcoal/10 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-gold animate-spin mb-3" />
                    <p className="text-xs text-charcoal/60 font-mono">Syncing reservations from Firestore cloud...</p>
                  </div>
                ) : filteredReservations.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center px-4">
                    <FileText className="w-12 h-12 text-charcoal/20 mb-3" />
                    <h4 className="text-lg font-serif text-charcoal font-medium">No reservations found</h4>
                    <p className="text-xs text-charcoal/50 max-w-sm mt-1">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Try clearing your search term or active status filter.'
                        : 'No customer enquiries or bookings logged yet. New customer submissions will appear here automatically.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-charcoal text-cream uppercase tracking-wider text-[10px] font-mono border-b border-gold/20">
                          <th className="p-4 font-semibold">Client Phone</th>
                          <th className="p-4 font-semibold">Property / Service</th>
                          <th className="p-4 font-semibold">Location</th>
                          <th className="p-4 font-semibold">Timeline</th>
                          <th className="p-4 font-semibold">Price Rate</th>
                          <th className="p-4 font-semibold">Status</th>
                          <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal/10 font-sans">
                        {filteredReservations.map((res) => {
                          const status = res.status || 'Pending';
                          let statusBadgeClass = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                          if (status === 'Confirmed') statusBadgeClass = 'bg-green-50 text-green-800 border-green-200';
                          if (status === 'Cancelled') statusBadgeClass = 'bg-red-50 text-red-800 border-red-200';
                          if (status === 'Completed') statusBadgeClass = 'bg-blue-50 text-blue-800 border-blue-200';

                          return (
                            <tr 
                              key={res.id} 
                              className="hover:bg-cream/40 transition-colors group cursor-pointer"
                              onClick={() => {
                                setSelectedReservation(res);
                                setEditingNotes(res.notes || '');
                              }}
                            >
                              <td className="p-4 font-mono font-medium text-charcoal">
                                <div className="flex items-center space-x-2">
                                  <Phone className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                                  <a 
                                    href={`tel:${res.clientPhone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="hover:underline hover:text-gold"
                                  >
                                    {res.clientPhone}
                                  </a>
                                </div>
                                {res.clientName && (
                                  <span className="text-[10px] text-charcoal/50 block font-sans font-normal mt-0.5">
                                    {res.clientName}
                                  </span>
                                )}
                              </td>

                              <td className="p-4 font-medium text-charcoal max-w-xs">
                                <div className="font-serif text-sm text-charcoal truncate">{res.propertyName}</div>
                                <span className="inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-charcoal/5 text-charcoal/60 mt-1">
                                  {res.type || 'booking'}
                                </span>
                              </td>

                              <td className="p-4 text-charcoal/70 max-w-xs truncate">
                                <div className="flex items-center space-x-1 text-charcoal/60">
                                  <MapPin className="w-3 h-3 text-gold flex-shrink-0" />
                                  <span className="truncate">{res.propertyLocation}</span>
                                </div>
                              </td>

                              <td className="p-4 text-charcoal/80 text-[11px] space-y-0.5">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3 text-charcoal/40" />
                                  <span className="font-mono text-[10px]">{res.checkin || 'N/A'}</span>
                                </div>
                                {res.checkout && (
                                  <div className="text-[10px] text-charcoal/50 font-mono pl-4">
                                    to {res.checkout}
                                  </div>
                                )}
                              </td>

                              <td className="p-4 font-mono text-charcoal font-semibold">
                                {res.price ? `₦${res.price}` : 'N/A'}
                              </td>

                              <td className="p-4">
                                <select
                                  value={status}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleStatusChange(res.id, e.target.value as any)}
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${statusBadgeClass}`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Confirmed">Confirmed</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </td>

                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <a
                                    href={`https://wa.me/${res.clientPhone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="WhatsApp Client"
                                  >
                                    <Send className="w-4 h-4" />
                                  </a>
                                  
                                  <button
                                    onClick={() => handleDeleteReservation(res.id)}
                                    className="p-1.5 text-charcoal/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              </>
              )}

              {activeTab === 'car-requests' && (
              <>
              {/* Car Requests Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-2xl border border-charcoal/10 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-charcoal/50 block">Total Requests</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-charcoal">{carTotalCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-charcoal/5 text-charcoal flex items-center justify-center">
                    <Car className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gold/30 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gold block">New Requests</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-gold">{carNewCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-green-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-green-700 block">Confirmed</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-green-700">{carConfirmedCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-blue-700 block">Completed</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-blue-700">{carCompletedCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Car Requests Search & Filter */}
              <div className="bg-white p-4 rounded-2xl border border-charcoal/10 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal/40" />
                  <input
                    type="text"
                    value={carSearchTerm}
                    onChange={(e) => setCarSearchTerm(e.target.value)}
                    placeholder="Search customer, phone, vehicle..."
                    className="w-full pl-10 pr-4 py-2 bg-cream/50 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold transition-all text-charcoal"
                  />
                  {carSearchTerm && (
                    <button
                      onClick={() => setCarSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-charcoal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1 bg-cream/60 p-1 rounded-xl border border-charcoal/10 text-xs w-full md:w-auto overflow-x-auto">
                  <span className="text-[10px] uppercase font-bold text-charcoal/40 px-2 flex-shrink-0">Status:</span>
                  {['all', ...CAR_REQUEST_STATUSES].map((st) => (
                    <button
                      key={st}
                      onClick={() => setCarStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex-shrink-0 ${
                        carStatusFilter === st
                          ? 'bg-charcoal text-cream shadow-sm'
                          : 'text-charcoal/60 hover:text-charcoal'
                      }`}
                    >
                      {st === 'all' ? 'All' : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Car Requests Table */}
              <div className="bg-white rounded-2xl border border-charcoal/10 shadow-sm overflow-hidden">
                {carRequestsLoading ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-gold animate-spin mb-3" />
                    <p className="text-xs text-charcoal/60 font-mono">Syncing car requests from Firestore cloud...</p>
                  </div>
                ) : filteredCarRequests.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center px-4">
                    <Car className="w-12 h-12 text-charcoal/20 mb-3" />
                    <h4 className="text-lg font-serif text-charcoal font-medium">No car requests found</h4>
                    <p className="text-xs text-charcoal/50 max-w-sm mt-1">
                      {carSearchTerm || carStatusFilter !== 'all'
                        ? 'Try clearing your search term or active status filter.'
                        : 'No car rental requests submitted yet. New requests will appear here automatically.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-charcoal text-cream uppercase tracking-wider text-[10px] font-mono border-b border-gold/20">
                          <th className="p-4 font-semibold">Customer</th>
                          <th className="p-4 font-semibold">Vehicles</th>
                          <th className="p-4 font-semibold">Location</th>
                          <th className="p-4 font-semibold">Trip</th>
                          <th className="p-4 font-semibold">Status</th>
                          <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal/10 font-sans">
                        {filteredCarRequests.map((req) => {
                          const status = req.status || 'New Request';
                          let statusBadgeClass = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                          if (status === 'Confirmed') statusBadgeClass = 'bg-green-50 text-green-800 border-green-200';
                          if (status === 'Cancelled') statusBadgeClass = 'bg-red-50 text-red-800 border-red-200';
                          if (status === 'Completed') statusBadgeClass = 'bg-blue-50 text-blue-800 border-blue-200';

                          return (
                            <tr
                              key={req.id}
                              className="hover:bg-cream/40 transition-colors group cursor-pointer"
                              onClick={() => {
                                setSelectedCarRequest(req);
                                setEditingAdminQuote(req.adminQuoteAmount != null ? String(req.adminQuoteAmount) : '');
                                setEditingAdminNotes(req.adminNotes || '');
                                setEditingAlternative(req.alternativeSuggestion || '');
                              }}
                            >
                              <td className="p-4 font-mono font-medium text-charcoal">
                                <div className="flex items-center space-x-2">
                                  <Phone className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                                  <a
                                    href={`tel:${req.customerPhone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="hover:underline hover:text-gold"
                                  >
                                    {req.customerPhone}
                                  </a>
                                </div>
                                {req.customerName && (
                                  <span className="text-[10px] text-charcoal/50 block font-sans font-normal mt-0.5">
                                    {req.customerName}
                                  </span>
                                )}
                              </td>

                              <td className="p-4 font-medium text-charcoal max-w-xs">
                                {(req.vehicles || []).map((v) => (
                                  <div key={v.vehicleId} className="font-serif text-sm text-charcoal truncate">
                                    {v.name} <span className="text-charcoal/40 text-xs">× {v.quantity}</span>
                                    {v.agency && <span className="text-gold/70 text-[10px] ml-1">({v.agency})</span>}
                                  </div>
                                ))}
                                <span className="inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-charcoal/5 text-charcoal/60 mt-1">
                                  {req.driverPreference || 'N/A'}
                                </span>
                              </td>

                              <td className="p-4 text-charcoal/70 max-w-xs truncate">
                                <div className="flex items-center space-x-1 text-charcoal/60">
                                  <MapPin className="w-3 h-3 text-gold flex-shrink-0" />
                                  <span className="truncate">{req.location}</span>
                                </div>
                              </td>

                              <td className="p-4 text-charcoal/80 text-[11px] space-y-0.5">
                                <div className="truncate max-w-[160px]">{req.pickupLocation} &rarr; {req.destination}</div>
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3 text-charcoal/40" />
                                  <span className="font-mono text-[10px]">{req.date || 'N/A'} {req.time}</span>
                                </div>
                              </td>

                              <td className="p-4">
                                <select
                                  value={status}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleCarStatusChange(req.id, e.target.value as CarRequestStatus)}
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${statusBadgeClass}`}
                                >
                                  {CAR_REQUEST_STATUSES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </td>

                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <a
                                    href={`https://wa.me/${req.customerPhone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="WhatsApp Customer"
                                  >
                                    <Send className="w-4 h-4" />
                                  </a>

                                  <button
                                    onClick={() => handleDeleteCarRequest(req.id)}
                                    className="p-1.5 text-charcoal/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              </>
              )}

              {activeTab === 'partner-listings' && (
              <>
              {/* Partner Listings Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-2xl border border-charcoal/10 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-charcoal/50 block">Total Listings</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-charcoal">{partnerTotalCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-charcoal/5 text-charcoal flex items-center justify-center">
                    <Home className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gold/30 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gold block">Pending Review</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-gold">{partnerPendingCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-green-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-green-700 block">Approved</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-green-700">{partnerApprovedCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-red-700 block">Rejected</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-red-700">{partnerRejectedCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Partner Listings Search & Filter */}
              <div className="bg-white p-4 rounded-2xl border border-charcoal/10 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal/40" />
                  <input
                    type="text"
                    value={partnerSearchTerm}
                    onChange={(e) => setPartnerSearchTerm(e.target.value)}
                    placeholder="Search owner, listing name, city..."
                    className="w-full pl-10 pr-4 py-2 bg-cream/50 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold transition-all text-charcoal"
                  />
                  {partnerSearchTerm && (
                    <button
                      onClick={() => setPartnerSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-charcoal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1 bg-cream/60 p-1 rounded-xl border border-charcoal/10 text-xs">
                  <span className="text-[10px] uppercase font-bold text-charcoal/40 px-2">Status:</span>
                  {['all', 'pending', 'approved', 'rejected'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setPartnerStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all cursor-pointer ${
                        partnerStatusFilter === st
                          ? 'bg-charcoal text-cream shadow-sm'
                          : 'text-charcoal/60 hover:text-charcoal'
                      }`}
                    >
                      {st === 'all' ? 'All' : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Partner Listings Table */}
              <div className="bg-white rounded-2xl border border-charcoal/10 shadow-sm overflow-hidden">
                {partnerListingsLoading ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-gold animate-spin mb-3" />
                    <p className="text-xs text-charcoal/60 font-mono">Syncing partner listings from Firestore cloud...</p>
                  </div>
                ) : filteredPartnerListings.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center px-4">
                    <Home className="w-12 h-12 text-charcoal/20 mb-3" />
                    <h4 className="text-lg font-serif text-charcoal font-medium">No partner listings found</h4>
                    <p className="text-xs text-charcoal/50 max-w-sm mt-1">
                      {partnerSearchTerm || partnerStatusFilter !== 'all'
                        ? 'Try clearing your search term or active status filter.'
                        : 'No partner-submitted listings yet. New submissions from hotel, shortlet, or car owners will appear here automatically.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-charcoal text-cream uppercase tracking-wider text-[10px] font-mono border-b border-gold/20">
                          <th className="p-4 font-semibold">Owner</th>
                          <th className="p-4 font-semibold">Listing</th>
                          <th className="p-4 font-semibold">City</th>
                          <th className="p-4 font-semibold">Price</th>
                          <th className="p-4 font-semibold">Status</th>
                          <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal/10 font-sans">
                        {filteredPartnerListings.map((listing) => {
                          const status = listing.status;
                          let statusBadgeClass = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                          if (status === 'approved') statusBadgeClass = 'bg-green-50 text-green-800 border-green-200';
                          if (status === 'rejected') statusBadgeClass = 'bg-red-50 text-red-800 border-red-200';

                          return (
                            <tr
                              key={listing.id}
                              className="hover:bg-cream/40 transition-colors group cursor-pointer"
                              onClick={() => {
                                setSelectedPartnerListing(listing);
                                setEditingRejectionReason(listing.rejectionReason || '');
                              }}
                            >
                              <td className="p-4 font-mono font-medium text-charcoal max-w-[180px] truncate">
                                {listing.ownerEmail}
                              </td>

                              <td className="p-4 font-medium text-charcoal max-w-xs">
                                <div className="font-serif text-sm text-charcoal truncate">{listing.name}</div>
                                <span className="inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-charcoal/5 text-charcoal/60 mt-1">
                                  {listing.category}
                                </span>
                              </td>

                              <td className="p-4 text-charcoal/70">
                                <div className="flex items-center space-x-1 text-charcoal/60">
                                  <MapPin className="w-3 h-3 text-gold flex-shrink-0" />
                                  <span>{listing.city}</span>
                                </div>
                              </td>

                              <td className="p-4 font-mono text-charcoal font-semibold">
                                {listing.price ? `₦${listing.price}` : 'N/A'}
                              </td>

                              <td className="p-4">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border capitalize ${statusBadgeClass}`}>
                                  {status}
                                </span>
                              </td>

                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                  {status !== 'approved' && (
                                    <button
                                      onClick={() => handleApprovePartnerListing(listing.id)}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                      title="Approve Listing"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeletePartnerListing(listing.id)}
                                    className="p-1.5 text-charcoal/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Listing"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              </>
              )}

              {activeTab === 'trips' && (
              <>
              {/* Smart Follow-Up Recommendations toggle */}
              <div className="bg-white p-4 rounded-2xl border border-charcoal/10 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-charcoal/70 block">Smart Follow-Up Recommendations</span>
                  <span className="text-[11px] text-charcoal/50">Suggests a logical next service to customers (e.g. airport pickup after a hotel). Never auto-books anything.</span>
                </div>
                <button
                  onClick={handleToggleRecommendations}
                  className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors cursor-pointer ${recommendationsEnabled ? 'bg-gold' : 'bg-charcoal/20'}`}
                  aria-label="Toggle Smart Follow-Up Recommendations"
                >
                  <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${recommendationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Trip Management Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-2xl border border-charcoal/10 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-charcoal/50 block">Total Trips</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-charcoal">{tripTotalCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-charcoal/5 text-charcoal flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gold/30 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gold block">New / Processing</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-gold">{tripNewCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-green-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-green-700 block">Confirmed</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-green-700">{tripConfirmedCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-blue-700 block">Completed</span>
                    <span className="text-2xl sm:text-3xl font-serif font-medium text-blue-700">{tripCompletedCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Trip Search & Filter */}
              <div className="bg-white p-4 rounded-2xl border border-charcoal/10 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal/40" />
                  <input
                    type="text"
                    value={tripSearchTerm}
                    onChange={(e) => setTripSearchTerm(e.target.value)}
                    placeholder="Search trip code, customer, location..."
                    className="w-full pl-10 pr-4 py-2 bg-cream/50 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold transition-all text-charcoal"
                  />
                  {tripSearchTerm && (
                    <button
                      onClick={() => setTripSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-charcoal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1 bg-cream/60 p-1 rounded-xl border border-charcoal/10 text-xs">
                  <span className="text-[10px] uppercase font-bold text-charcoal/40 px-2">Status:</span>
                  {['all', 'New', 'Processing', 'Partially Confirmed', 'Confirmed', 'Completed', 'Cancelled'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setTripStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        tripStatusFilter === st
                          ? 'bg-charcoal text-cream shadow-sm'
                          : 'text-charcoal/60 hover:text-charcoal'
                      }`}
                    >
                      {st === 'all' ? 'All' : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trips Table */}
              <div className="bg-white rounded-2xl border border-charcoal/10 shadow-sm overflow-hidden">
                {tripsLoading ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-gold animate-spin mb-3" />
                    <p className="text-xs text-charcoal/60 font-mono">Syncing trips from Firestore cloud...</p>
                  </div>
                ) : filteredTrips.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center px-4">
                    <MapPin className="w-12 h-12 text-charcoal/20 mb-3" />
                    <h4 className="text-lg font-serif text-charcoal font-medium">No trips found</h4>
                    <p className="text-xs text-charcoal/50 max-w-sm mt-1">
                      {tripSearchTerm || tripStatusFilter !== 'all'
                        ? 'Try clearing your search term or active status filter.'
                        : 'No submitted trips yet. New trip requests will appear here automatically.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-charcoal text-cream uppercase tracking-wider text-[10px] font-mono border-b border-gold/20">
                          <th className="p-4 font-semibold">Trip</th>
                          <th className="p-4 font-semibold">Customer</th>
                          <th className="p-4 font-semibold">Location</th>
                          <th className="p-4 font-semibold">Services</th>
                          <th className="p-4 font-semibold">Status</th>
                          <th className="p-4 font-semibold">Staff</th>
                          <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal/10 font-sans">
                        {filteredTrips.map((trip) => {
                          const tripServiceCount = tripServicesAll.filter((s) => s.tripId === trip.id).length;
                          let statusBadgeClass = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                          if (trip.status === 'Confirmed' || trip.status === 'Completed') statusBadgeClass = 'bg-green-50 text-green-800 border-green-200';
                          if (trip.status === 'Partially Confirmed') statusBadgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
                          if (trip.status === 'Cancelled') statusBadgeClass = 'bg-red-50 text-red-800 border-red-200';

                          return (
                            <tr
                              key={trip.id}
                              className="hover:bg-cream/40 transition-colors group cursor-pointer"
                              onClick={() => {
                                setSelectedTrip(trip);
                                setEditingAssignedStaff(trip.assignedStaff || '');
                                setEditingTripNotes(trip.internalNotes || '');
                              }}
                            >
                              <td className="p-4 font-mono font-medium text-charcoal">{trip.tripCode}</td>
                              <td className="p-4 text-charcoal">
                                <div className="font-serif text-sm">{trip.customerName}</div>
                                <a href={`tel:${trip.customerPhone}`} onClick={(e) => e.stopPropagation()} className="text-[10px] text-charcoal/50 hover:text-gold block">{trip.customerPhone}</a>
                                <span className="text-[10px] text-charcoal/50 truncate block max-w-[160px]">{trip.customerEmail}</span>
                              </td>
                              <td className="p-4 text-charcoal/70">
                                <div className="flex items-center space-x-1 text-charcoal/60">
                                  <MapPin className="w-3 h-3 text-gold flex-shrink-0" />
                                  <span className="truncate">{trip.location}</span>
                                </div>
                              </td>
                              <td className="p-4 text-charcoal font-semibold">{tripServiceCount}</td>
                              <td className="p-4">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusBadgeClass}`}>
                                  {trip.status}
                                </span>
                              </td>
                              <td className="p-4 text-charcoal/70">{trip.assignedStaff || '—'}</td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <a
                                    href={`https://wa.me/${trip.customerPhone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="WhatsApp Customer"
                                  >
                                    <Send className="w-4 h-4" />
                                  </a>
                                  <button
                                    onClick={() => handleDeleteTrip(trip.id)}
                                    className="p-1.5 text-charcoal/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Trip"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              </>
              )}
            </div>
          )}

          {/* Details Drawer / Modal */}
          {selectedReservation && (
            <div className="fixed inset-0 z-[110] bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gold/30 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-charcoal"
              >
                <div className="bg-charcoal text-cream p-5 flex justify-between items-center border-b border-gold/20">
                  <h3 className="font-serif text-lg font-medium text-gold">Reservation Overview</h3>
                  <button onClick={() => setSelectedReservation(null)} className="text-cream/60 hover:text-cream">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
                  <div className="bg-cream/40 p-4 rounded-2xl border border-charcoal/10 space-y-2">
                    <h4 className="text-base font-serif text-charcoal font-medium">{selectedReservation.propertyName}</h4>
                    <p className="text-charcoal/60 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                      {selectedReservation.propertyLocation}
                    </p>
                    {selectedReservation.price && (
                      <p className="text-sm font-mono font-bold text-gold">Rate: ₦{selectedReservation.price}</p>
                    )}
                    {selectedReservation.numberOfRooms && (
                      <p className="text-xs font-mono font-bold text-charcoal/80 flex items-center gap-1.5 pt-1 border-t border-charcoal/10">
                        <span className="text-[10px] uppercase font-bold text-gold">Rooms Needed:</span> {selectedReservation.numberOfRooms}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-charcoal/10">
                      <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Client Phone</span>
                      <a href={`tel:${selectedReservation.clientPhone}`} className="font-mono text-sm font-semibold text-charcoal hover:text-gold">
                        {selectedReservation.clientPhone}
                      </a>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-charcoal/10">
                      <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Status</span>
                      <span className="font-bold uppercase tracking-wider text-xs text-gold">
                        {selectedReservation.status || 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-charcoal/10 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-charcoal/40 block">Booking Timeline</span>
                    <div className="flex justify-between items-center font-mono text-[11px] text-charcoal">
                      <span>Check-In: {selectedReservation.checkin}</span>
                    </div>
                    {selectedReservation.checkout && (
                      <div className="flex justify-between items-center font-mono text-[11px] text-charcoal">
                        <span>Check-Out: {selectedReservation.checkout}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes input */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">
                      Internal Admin Notes
                    </label>
                    <textarea 
                      rows={3}
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Add private notes (e.g., Payment received via transfer, upgraded room)..."
                      className="w-full p-3 bg-cream/30 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold text-charcoal"
                    />
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="mt-2 w-full py-2 bg-charcoal hover:bg-charcoal/90 text-cream font-semibold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      {savingNotes ? 'Saving Notes...' : 'Save Notes'}
                    </button>
                  </div>

                  {/* WhatsApp Direct */}
                  <a
                    href={`https://wa.me/${selectedReservation.clientPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Open WhatsApp Chat with Client</span>
                  </a>
                </div>
              </motion.div>
            </div>
          )}

          {/* Car Request Details Drawer / Modal */}
          {selectedCarRequest && (
            <div className="fixed inset-0 z-[110] bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gold/30 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-charcoal"
              >
                <div className="bg-charcoal text-cream p-5 flex justify-between items-center border-b border-gold/20">
                  <h3 className="font-serif text-lg font-medium text-gold">Car Request — {selectedCarRequest.requestId}</h3>
                  <button onClick={() => setSelectedCarRequest(null)} className="text-cream/60 hover:text-cream">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
                  <div className="bg-cream/40 p-4 rounded-2xl border border-charcoal/10 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-gold block mb-1">Vehicle Request</span>
                    {(selectedCarRequest.vehicles || []).map((v) => (
                      <div key={v.vehicleId} className="flex justify-between items-center font-mono text-[11px] text-charcoal">
                        <span className="font-serif text-sm text-charcoal">
                          {v.name}
                          {v.agency && <span className="text-gold/70 text-[10px] block font-sans">Agency: {v.agency}</span>}
                        </span>
                        <span>Qty: {v.quantity}</span>
                      </div>
                    ))}
                    {selectedCarRequest.estimatedTotal != null ? (
                      <p className="text-sm font-mono font-bold text-gold pt-1.5 border-t border-charcoal/10">
                        Estimated Starting Price: ₦{selectedCarRequest.estimatedTotal.toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-[11px] text-charcoal/50 pt-1.5 border-t border-charcoal/10">Final price to be confirmed.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-charcoal/10">
                      <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Customer</span>
                      <span className="font-semibold text-charcoal block">{selectedCarRequest.customerName}</span>
                      <a href={`tel:${selectedCarRequest.customerPhone}`} className="block font-mono text-charcoal/70 hover:text-gold">{selectedCarRequest.customerPhone}</a>
                      {selectedCarRequest.customerEmail && (
                        <a href={`mailto:${selectedCarRequest.customerEmail}`} className="block font-mono text-charcoal/70 hover:text-gold truncate">{selectedCarRequest.customerEmail}</a>
                      )}
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-charcoal/10">
                      <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Status</span>
                      <select
                        value={selectedCarRequest.status || 'New Request'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleCarStatusChange(selectedCarRequest.id, e.target.value as CarRequestStatus)}
                        className="w-full font-bold uppercase tracking-wider text-[10px] text-gold bg-transparent outline-none cursor-pointer"
                      >
                        {CAR_REQUEST_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-charcoal/10 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Trip Details</span>
                    <div className="flex justify-between font-mono text-[11px] text-charcoal"><span className="text-charcoal/50">Location</span><span>{selectedCarRequest.location}</span></div>
                    <div className="flex justify-between font-mono text-[11px] text-charcoal gap-4"><span className="text-charcoal/50 flex-shrink-0">Pickup</span><span className="text-right">{selectedCarRequest.pickupLocation}</span></div>
                    <div className="flex justify-between font-mono text-[11px] text-charcoal gap-4"><span className="text-charcoal/50 flex-shrink-0">Destination</span><span className="text-right">{selectedCarRequest.destination}</span></div>
                    <div className="flex justify-between font-mono text-[11px] text-charcoal"><span className="text-charcoal/50">Date / Time</span><span>{selectedCarRequest.date} {selectedCarRequest.time}</span></div>
                    <div className="flex justify-between font-mono text-[11px] text-charcoal"><span className="text-charcoal/50">Driver</span><span>{selectedCarRequest.driverPreference}</span></div>
                    {selectedCarRequest.passengerCount && (
                      <div className="flex justify-between font-mono text-[11px] text-charcoal"><span className="text-charcoal/50">Passengers</span><span>{selectedCarRequest.passengerCount}</span></div>
                    )}
                    {selectedCarRequest.specialRequests && selectedCarRequest.specialRequests.length > 0 && (
                      <div className="flex justify-between font-mono text-[11px] text-charcoal gap-4"><span className="text-charcoal/50 flex-shrink-0">Special Requests</span><span className="text-right">{selectedCarRequest.specialRequests.join(', ')}</span></div>
                    )}
                    {selectedCarRequest.additionalNotes && (
                      <div className="pt-1.5 border-t border-charcoal/10">
                        <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Customer Notes</span>
                        <p className="text-charcoal/70">{selectedCarRequest.additionalNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* Admin-only fields — never exposed to the customer */}
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
                    <span className="text-[10px] uppercase font-bold text-amber-900 flex items-center gap-1.5">
                      <Lock className="w-3 h-3" /> Admin Only — Not Visible to Customer
                    </span>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Quote Amount (₦)</label>
                      <input
                        type="text"
                        placeholder="e.g. 450000"
                        value={editingAdminQuote}
                        onChange={(e) => setEditingAdminQuote(e.target.value)}
                        className="w-full p-2.5 bg-white border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Suggested Alternative Vehicle</label>
                      <input
                        type="text"
                        placeholder="e.g. BMW 5 Series — 2 cars (if requested vehicle is unavailable)"
                        value={editingAlternative}
                        onChange={(e) => setEditingAlternative(e.target.value)}
                        className="w-full p-2.5 bg-white border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Internal Notes (partner, cost, markup, etc.)</label>
                      <textarea
                        rows={3}
                        placeholder="Partner/supplier, cost price, markup, availability notes..."
                        value={editingAdminNotes}
                        onChange={(e) => setEditingAdminNotes(e.target.value)}
                        className="w-full p-2.5 bg-white border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                    <button
                      onClick={handleSaveCarAdminFields}
                      disabled={savingCarAdmin}
                      className="w-full py-2 bg-charcoal hover:bg-charcoal/90 text-cream font-semibold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      {savingCarAdmin ? 'Saving...' : 'Save Admin Details'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`https://wa.me/${selectedCarRequest.customerPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-3 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`mailto:${selectedCarRequest.customerEmail}?subject=${encodeURIComponent(`Your Elite Booking car request ${selectedCarRequest.requestId}`)}`}
                      className="py-3 bg-charcoal hover:bg-charcoal/90 text-cream font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Partner Listing Details Drawer / Modal */}
          {selectedPartnerListing && (
            <div className="fixed inset-0 z-[110] bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gold/30 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-charcoal"
              >
                <div className="bg-charcoal text-cream p-5 flex justify-between items-center border-b border-gold/20">
                  <h3 className="font-serif text-lg font-medium text-gold">{selectedPartnerListing.name}</h3>
                  <button onClick={() => setSelectedPartnerListing(null)} className="text-cream/60 hover:text-cream">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
                  <div className="bg-cream/40 p-4 rounded-2xl border border-charcoal/10 space-y-2">
                    <span className="inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-charcoal/10 text-charcoal/70">
                      {selectedPartnerListing.category}
                    </span>
                    <p className="text-charcoal/60 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                      {selectedPartnerListing.location}, {selectedPartnerListing.city}
                    </p>
                    <p className="text-sm font-mono font-bold text-gold">Rate: ₦{selectedPartnerListing.price}</p>
                    <p className="text-charcoal/70">{selectedPartnerListing.description}</p>
                  </div>

                  {selectedPartnerListing.images && selectedPartnerListing.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedPartnerListing.images.slice(0, 6).map((url, i) => (
                        <img key={i} src={url} alt="" referrerPolicy="no-referrer" className="w-full h-16 object-cover rounded-lg border border-charcoal/10" />
                      ))}
                    </div>
                  )}

                  {selectedPartnerListing.category === 'Car Rental' && (
                    <div className="bg-white p-3.5 rounded-xl border border-charcoal/10 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Vehicle Details</span>
                      <div className="flex justify-between font-mono text-[11px] text-charcoal"><span className="text-charcoal/50">Type</span><span>{selectedPartnerListing.vehicleType || 'N/A'}</span></div>
                      <div className="flex justify-between font-mono text-[11px] text-charcoal"><span className="text-charcoal/50">Seats</span><span>{selectedPartnerListing.seats ?? 'N/A'}</span></div>
                      <div className="flex justify-between font-mono text-[11px] text-charcoal"><span className="text-charcoal/50">Transmission</span><span>{selectedPartnerListing.transmission || 'N/A'}</span></div>
                      <div className="flex justify-between font-mono text-[11px] text-charcoal"><span className="text-charcoal/50">Driver Options</span><span>{(selectedPartnerListing.driverOptions || []).join(', ') || 'N/A'}</span></div>
                    </div>
                  )}

                  {selectedPartnerListing.category === 'Hotel' && selectedPartnerListing.tiers && selectedPartnerListing.tiers.length > 0 && (
                    <div className="bg-white p-3.5 rounded-xl border border-charcoal/10 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Room Tiers</span>
                      {selectedPartnerListing.tiers.map((t, i) => (
                        <div key={i} className="flex justify-between font-mono text-[11px] text-charcoal"><span className="text-charcoal/50">{t.name}</span><span>₦{t.price}</span></div>
                      ))}
                    </div>
                  )}

                  {selectedPartnerListing.category === 'Shortlet' && (
                    <div className="bg-white p-3.5 rounded-xl border border-charcoal/10 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Shortlet Details</span>
                      {selectedPartnerListing.cautionFee && (
                        <div className="flex justify-between font-mono text-[11px] text-charcoal"><span className="text-charcoal/50">Caution Fee</span><span>₦{selectedPartnerListing.cautionFee}</span></div>
                      )}
                      {selectedPartnerListing.features && selectedPartnerListing.features.length > 0 && (
                        <div className="flex justify-between font-mono text-[11px] text-charcoal gap-4"><span className="text-charcoal/50 flex-shrink-0">Features</span><span className="text-right">{selectedPartnerListing.features.join(', ')}</span></div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-charcoal/10">
                      <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Owner</span>
                      <a href={`mailto:${selectedPartnerListing.ownerEmail}`} className="font-mono text-xs font-semibold text-charcoal hover:text-gold truncate block">
                        {selectedPartnerListing.ownerEmail}
                      </a>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-charcoal/10">
                      <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Status</span>
                      <span className="font-bold uppercase tracking-wider text-xs text-gold capitalize">
                        {selectedPartnerListing.status}
                      </span>
                    </div>
                  </div>

                  {/* Admin-only: rejection reason */}
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
                    <span className="text-[10px] uppercase font-bold text-amber-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3" /> Admin Review
                    </span>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Rejection Reason (shown to partner)</label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Photos are unclear, price seems inconsistent with the area, please resubmit with more detail..."
                        value={editingRejectionReason}
                        onChange={(e) => setEditingRejectionReason(e.target.value)}
                        className="w-full p-2.5 bg-white border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleApprovePartnerListing(selectedPartnerListing.id)}
                        disabled={selectedPartnerListing.status === 'approved'}
                        className="py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectPartnerListing(selectedPartnerListing.id, editingRejectionReason)}
                        disabled={savingPartnerListing || !editingRejectionReason.trim()}
                        className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Ban className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Trip Details Drawer / Modal */}
          {selectedTrip && (
            <div className="fixed inset-0 z-[110] bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gold/30 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl text-charcoal"
              >
                <div className="bg-charcoal text-cream p-5 flex justify-between items-center border-b border-gold/20">
                  <h3 className="font-serif text-lg font-medium text-gold">Trip {selectedTrip.tripCode}</h3>
                  <button onClick={() => setSelectedTrip(null)} className="text-cream/60 hover:text-cream">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-cream/40 p-3 rounded-xl border border-charcoal/10">
                      <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Customer</span>
                      <span className="font-semibold text-charcoal block">{selectedTrip.customerName}</span>
                      <a href={`tel:${selectedTrip.customerPhone}`} className="block font-mono text-charcoal/70 hover:text-gold">{selectedTrip.customerPhone}</a>
                      <a href={`mailto:${selectedTrip.customerEmail}`} className="block font-mono text-charcoal/70 hover:text-gold truncate">{selectedTrip.customerEmail}</a>
                    </div>
                    <div className="bg-cream/40 p-3 rounded-xl border border-charcoal/10">
                      <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-1">Location / Status</span>
                      <span className="flex items-center gap-1 text-charcoal font-semibold"><MapPin className="w-3 h-3 text-gold" /> {selectedTrip.location}</span>
                      <span className="font-bold uppercase tracking-wider text-[10px] text-gold block mt-1">{selectedTrip.status}</span>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
                    <span className="text-[10px] uppercase font-bold text-amber-900 flex items-center gap-1.5">
                      <Lock className="w-3 h-3" /> Admin Only
                    </span>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Assigned Staff</label>
                      <input
                        type="text"
                        placeholder="e.g. Amaka"
                        value={editingAssignedStaff}
                        onChange={(e) => setEditingAssignedStaff(e.target.value)}
                        className="w-full p-2.5 bg-white border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Internal Notes</label>
                      <textarea
                        rows={2}
                        value={editingTripNotes}
                        onChange={(e) => setEditingTripNotes(e.target.value)}
                        className="w-full p-2.5 bg-white border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                    <button
                      onClick={handleSaveTripAdminFields}
                      disabled={savingTrip}
                      className="w-full py-2 bg-charcoal hover:bg-charcoal/90 text-cream font-semibold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      {savingTrip ? 'Saving...' : 'Save'}
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-2">Services on this Trip</span>
                    <div className="space-y-3">
                      {tripServicesAll.filter((s) => s.tripId === selectedTrip.id).map((service) => (
                        <div key={service.id} className="bg-white border border-charcoal/10 rounded-2xl p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-charcoal/5 text-charcoal/60 mb-1">{service.type}</span>
                              <p className="text-charcoal font-medium">{service.summary}</p>
                            </div>
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              <select
                                value={service.status}
                                onChange={(e) => handleTripServiceStatusChange(service, e.target.value as ServiceStatus)}
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border cursor-pointer focus:outline-none bg-cream/60 border-charcoal/15"
                              >
                                {SERVICE_STATUSES.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              <select
                                value={service.paymentStatus || 'Unpaid'}
                                onChange={(e) => handleTripServicePaymentStatusChange(service, e.target.value as PaymentStatus)}
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border cursor-pointer focus:outline-none bg-cream/60 border-charcoal/15"
                              >
                                {PAYMENT_STATUSES.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              defaultValue={service.providerAssigned || ''}
                              placeholder="Provider assigned"
                              onBlur={(e) => handleSaveTripServiceField(service.id, 'providerAssigned', e.target.value)}
                              className="p-2 bg-cream/40 border border-charcoal/15 rounded-lg text-[11px] focus:outline-none focus:border-gold"
                            />
                            <input
                              type="text"
                              defaultValue={service.price != null ? String(service.price) : ''}
                              placeholder="Price (₦)"
                              onBlur={(e) => handleSaveTripServiceField(service.id, 'price', e.target.value)}
                              className="p-2 bg-cream/40 border border-charcoal/15 rounded-lg text-[11px] focus:outline-none focus:border-gold"
                            />
                            <input
                              type="text"
                              defaultValue={service.commission != null ? String(service.commission) : ''}
                              placeholder="Commission (₦)"
                              onBlur={(e) => handleSaveTripServiceField(service.id, 'commission', e.target.value)}
                              className="p-2 bg-cream/40 border border-charcoal/15 rounded-lg text-[11px] focus:outline-none focus:border-gold"
                            />
                          </div>
                          <textarea
                            rows={1}
                            defaultValue={service.adminNotes || ''}
                            placeholder="Admin notes for this service (internal only)..."
                            onBlur={(e) => handleSaveTripServiceField(service.id, 'adminNotes', e.target.value)}
                            className="w-full p-2 bg-cream/40 border border-charcoal/15 rounded-lg text-[11px] focus:outline-none focus:border-gold"
                          />
                          <textarea
                            rows={1}
                            defaultValue={service.confirmationNotes || ''}
                            placeholder="Confirmation details / instructions (visible to customer)..."
                            onBlur={(e) => handleSaveTripServiceField(service.id, 'confirmationNotes', e.target.value)}
                            className="w-full p-2 bg-gold/10 border border-gold/25 rounded-lg text-[11px] focus:outline-none focus:border-gold"
                          />

                          {Object.keys(service.details || {}).length > 0 && (
                            <div className="pt-2 border-t border-charcoal/10 grid grid-cols-2 gap-x-3 gap-y-1">
                              {Object.entries(service.details).map(([key, value]) => (
                                value ? (
                                  <div key={key} className="flex justify-between gap-2 text-[10px] text-charcoal/60">
                                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                    <span className="text-charcoal/80 font-medium text-right truncate">{String(value)}</span>
                                  </div>
                                ) : null
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-charcoal/40 block mb-2">Activity History</span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto bg-cream/30 rounded-xl p-3 border border-charcoal/10">
                      {tripActivityLog.filter((a) => a.tripId === selectedTrip.id).length === 0 ? (
                        <p className="text-charcoal/40 text-[11px] py-2 text-center">No activity recorded yet.</p>
                      ) : (
                        tripActivityLog.filter((a) => a.tripId === selectedTrip.id).map((entry) => (
                          <div key={entry.id} className="flex items-start justify-between gap-2 text-[11px] border-b border-charcoal/5 last:border-0 pb-1.5 last:pb-0">
                            <span className="text-charcoal/70">{entry.detail}</span>
                            <span className="text-charcoal/35 flex-shrink-0 font-mono">
                              {entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleString() : ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* New Reservation Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-[110] bg-charcoal/70 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-gold/30 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-charcoal"
              >
                <div className="bg-charcoal text-cream p-5 flex justify-between items-center border-b border-gold/20">
                  <h3 className="font-serif text-lg font-medium text-gold">Create Direct Reservation</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-cream/60 hover:text-cream">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateManualReservation} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">
                      Property Name *
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Echelon Heights Hotel or Private Shortlet"
                      value={newPropName}
                      onChange={(e) => setNewPropName(e.target.value)}
                      className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Location</label>
                      <input 
                        type="text"
                        placeholder="e.g. Port Harcourt, Rivers State"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Price Rate (NGN)</label>
                      <input 
                        type="text"
                        placeholder="e.g. 150,000"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Client Phone *</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. 08012345678"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Client Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Dr. Chukwuma"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Check-In Timeline</label>
                      <input 
                        type="text"
                        placeholder="e.g. Friday, August 15, 2026"
                        value={newCheckin}
                        onChange={(e) => setNewCheckin(e.target.value)}
                        className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Check-Out Timeline</label>
                      <input 
                        type="text"
                        placeholder="e.g. Monday, August 18, 2026"
                        value={newCheckout}
                        onChange={(e) => setNewCheckout(e.target.value)}
                        className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Type</label>
                      <select 
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as any)}
                        className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      >
                        <option value="booking">Direct Booking</option>
                        <option value="reservation">Availability Enquiry</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Initial Status</label>
                      <select 
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as any)}
                        className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-charcoal/60 block mb-1">Notes</label>
                    <textarea 
                      rows={2}
                      placeholder="Optional details or payment notes..."
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingNew}
                    className="w-full py-3.5 bg-gold hover:bg-gold/90 text-charcoal font-semibold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-gold/20 transition-all cursor-pointer"
                  >
                    {isSubmittingNew ? 'Saving to Database...' : 'Save Manual Reservation'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}

          {/* Notification Settings Modal */}
          {showSettingsModal && (
            <div className="fixed inset-0 z-[110] bg-charcoal/70 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-gold/30 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-charcoal"
              >
                <div className="bg-charcoal text-cream p-5 flex justify-between items-center border-b border-gold/20">
                  <div className="flex items-center space-x-2 text-gold font-serif text-lg font-medium">
                    <Settings className="w-5 h-5" />
                    <span>Notification & API Keys</span>
                  </div>
                  <button onClick={() => setShowSettingsModal(false)} className="text-cream/60 hover:text-cream">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveSettings} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-charcoal/70 block mb-1">
                      Notification Target Email
                    </label>
                    <input 
                      type="email"
                      required
                      placeholder="e.g. Elitebooking.ng@gmail.com"
                      value={notifEmail}
                      onChange={(e) => setNotifEmail(e.target.value)}
                      className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold"
                    />
                    <p className="text-[10px] text-charcoal/50 mt-1">
                      All reservation and booking enquiry alerts will be sent directly to this address.
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-charcoal/70 block mb-1">
                      Web3Forms Access Key (Optional Backup)
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. 5bf5f7f4-124b-4835-bd5c-2041285cbda4"
                      value={web3Key}
                      onChange={(e) => setWeb3Key(e.target.value)}
                      className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs font-mono focus:outline-none focus:border-gold"
                    />
                    <p className="text-[10px] text-charcoal/50 mt-1">
                      FormSubmit sends emails automatically. You can optionally add a Web3Forms key from <a href="https://web3forms.com" target="_blank" rel="noreferrer" className="text-gold underline font-semibold">web3forms.com</a> as a dual backup.
                    </p>
                  </div>

                  {testEmailStatus && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-950 font-medium leading-relaxed">
                      {testEmailStatus}
                    </div>
                  )}

                  {settingsSavedMsg && (
                    <p className="text-xs text-green-700 font-medium bg-green-50 border border-green-200 p-2.5 rounded-xl text-center">
                      {settingsSavedMsg}
                    </p>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={sendingTest}
                      className="w-full py-2.5 bg-charcoal hover:bg-charcoal/90 text-cream font-semibold text-xs rounded-xl shadow transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <Mail className="w-4 h-4 text-gold" />
                      <span>{sendingTest ? 'Dispatching Test Email...' : 'Send Test Alert Email Now'}</span>
                    </button>

                    <button
                      type="submit"
                      className="w-full py-3 bg-gold hover:bg-gold/90 text-charcoal font-semibold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-gold/20 transition-all cursor-pointer"
                    >
                      Save Notification Settings
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
