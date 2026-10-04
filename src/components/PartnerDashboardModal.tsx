import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Pencil, Trash2, LogOut, RefreshCw, Home, MapPin, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import type { PartnerListing } from '../types/partnerListing';
import { PartnerListingFormModal } from './PartnerListingFormModal';

interface PartnerDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  email: string;
}

export const PartnerDashboardModal: React.FC<PartnerDashboardModalProps> = ({ isOpen, onClose, uid, email }) => {
  const [listings, setListings] = useState<PartnerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingListing, setEditingListing] = useState<PartnerListing | null>(null);

  useEffect(() => {
    if (!isOpen || !uid) return;
    setLoading(true);
    const q = query(collection(db, 'partner_listings'), where('ownerUid', '==', uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setListings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PartnerListing)));
      setLoading(false);
    }, (error) => {
      console.error('Error listening to partner listings:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isOpen, uid]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'partner_listings', id));
    } catch (err) {
      console.error('Error deleting listing:', err);
    }
  };

  const openNewListing = () => {
    setEditingListing(null);
    setShowFormModal(true);
  };

  const openEditListing = (listing: PartnerListing) => {
    setEditingListing(listing);
    setShowFormModal(true);
  };

  if (!isOpen) return null;

  const statusBadgeClass = (status: PartnerListing['status']) => {
    if (status === 'approved') return 'bg-green-50 text-green-800 border-green-200';
    if (status === 'rejected') return 'bg-red-50 text-red-800 border-red-200';
    return 'bg-yellow-50 text-yellow-800 border-yellow-200';
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-charcoal/80 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="bg-cream border border-gold/30 text-charcoal rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans"
          >
            <div className="bg-charcoal text-cream p-5 sm:p-6 flex justify-between items-center border-b border-gold/20 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-serif font-medium tracking-wide text-cream">My Listings</h2>
                  <p className="text-xs text-cream/60">{email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => { signOut(auth); onClose(); }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-cream/70 hover:text-gold hover:bg-gold/10 rounded-xl transition-all border border-cream/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition-all cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <button
                onClick={openNewListing}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gold hover:bg-gold/90 text-charcoal font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add New Listing
              </button>

              {loading ? (
                <div className="py-16 text-center flex flex-col items-center justify-center">
                  <RefreshCw className="w-7 h-7 text-gold animate-spin mb-3" />
                  <p className="text-xs text-charcoal/60 font-mono">Loading your listings...</p>
                </div>
              ) : listings.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center px-4">
                  <Home className="w-12 h-12 text-charcoal/20 mb-3" />
                  <h4 className="text-lg font-serif text-charcoal font-medium">No listings yet</h4>
                  <p className="text-xs text-charcoal/50 max-w-sm mt-1">Add your first hotel, shortlet, or car listing above — it'll be reviewed by our team before going live.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {listings.map((listing) => (
                    <div key={listing.id} className="bg-white border border-charcoal/10 rounded-2xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-charcoal/5 text-charcoal/60 mb-1">
                            {listing.category}
                          </span>
                          <h4 className="font-serif text-sm text-charcoal font-semibold leading-tight">{listing.name}</h4>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border capitalize flex-shrink-0 ${statusBadgeClass(listing.status)}`}>
                          {listing.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-charcoal/50">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{listing.location}, {listing.city}</span>
                      </div>
                      <div className="text-gold font-bold text-sm">₦{listing.price}</div>

                      {listing.status === 'rejected' && listing.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] text-red-700">{listing.rejectionReason}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => openEditListing(listing)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-charcoal/5 hover:bg-charcoal/10 text-charcoal text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" /> {listing.status === 'rejected' ? 'Edit & Resubmit' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDelete(listing.id)}
                          className="p-2 bg-charcoal/5 hover:bg-red-50 text-charcoal/50 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      <PartnerListingFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        editingListing={editingListing}
        ownerUid={uid}
        ownerEmail={email}
      />
    </>
  );
};
