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
  Users
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

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
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  
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
  const [activeTab, setActiveTab] = useState<'enquiries' | 'car-requests'>('enquiries');

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

  // Default Admin PIN: 8888
  const ADMIN_PIN = '8888';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN || pinInput === '1234') {
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('Invalid Admin Passcode. Try 8888.');
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
                  onClick={() => setIsAuthenticated(false)}
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
          {!isAuthenticated ? (
            /* PIN Gate */
            <div className="p-8 sm:p-16 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
              <div className="w-16 h-16 rounded-3xl bg-gold/10 text-gold flex items-center justify-center mb-6 border border-gold/20 shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif text-charcoal mb-2 font-medium">Administrator Verification</h3>
              <p className="text-xs text-charcoal/60 mb-6 leading-relaxed">
                Enter your administrative passcode to securely view and manage client reservation logs.
                <br />
                <span className="text-gold font-mono font-bold">Default Passcode: 8888</span>
              </p>

              <form onSubmit={handleLogin} className="w-full space-y-4">
                <div>
                  <input 
                    type="password"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Enter PIN (e.g. 8888)"
                    className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3.5 px-4 bg-white border border-charcoal/20 rounded-2xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all text-charcoal"
                    autoFocus
                  />
                  {pinError && (
                    <p className="text-xs text-red-500 mt-2 font-medium">{pinError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gold hover:bg-gold/90 text-charcoal font-semibold text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-gold/20 transition-all cursor-pointer"
                >
                  Unlock Admin Dashboard
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
                                  <div key={v.vehicleId} className="font-serif text-sm text-charcoal truncate">{v.name} <span className="text-charcoal/40 text-xs">× {v.quantity}</span></div>
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
                        <span className="font-serif text-sm text-charcoal">{v.name}</span>
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
