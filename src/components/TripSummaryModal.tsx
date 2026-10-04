import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Loader2, Send, RefreshCw, MessageCircle, Phone } from 'lucide-react';
import type { ServiceType, ServiceStatus, PaymentStatus, Trip, TripService } from '../types/trip';
import { AddServiceModal } from './AddServiceModal';

interface TripSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  services: TripService[];
  addServiceToTrip: (type: ServiceType, details: Record<string, any>, summary: string) => Promise<string>;
  submitTripRequest: () => Promise<void>;
  clearActiveTrip: () => void;
  notifyTeamOfSubmission: (trip: Trip, services: TripService[]) => void;
  onTripViewed?: () => void;
}

const ALL_ADDABLE_TYPES: ServiceType[] = ['Hotel', 'Shortlet', 'Airport Pickup', 'Car Rental', 'Private Jet', 'Driver', 'Restaurant', 'Yacht', 'Moving & Logistics', 'Truck', 'Forklift', 'Other'];

// Same number used by the site's WhatsApp contact button elsewhere.
const SUPPORT_WHATSAPP_NUMBER = '2347072253857';
const SUPPORT_PHONE_DISPLAY = '+234 707 225 3857';

const SERVICE_STATUS_BADGE: Record<ServiceStatus, string> = {
  Pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  Searching: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  'Provider Found': 'bg-blue-50 text-blue-800 border-blue-200',
  'Awaiting Customer Confirmation': 'bg-blue-50 text-blue-800 border-blue-200',
  Confirmed: 'bg-green-50 text-green-800 border-green-200',
  Completed: 'bg-green-50 text-green-800 border-green-200',
  Cancelled: 'bg-red-50 text-red-800 border-red-200',
};

const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  Unpaid: 'bg-charcoal/5 text-charcoal/50 border-charcoal/10',
  'Payment Pending': 'bg-orange-50 text-orange-800 border-orange-200',
  Paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export const TripSummaryModal: React.FC<TripSummaryModalProps> = ({
  isOpen, onClose, trip, services, addServiceToTrip, submitTripRequest, clearActiveTrip, notifyTeamOfSubmission, onTripViewed,
}) => {
  const [addingType, setAddingType] = useState<ServiceType | null>(null);
  const [conciergeText, setConciergeText] = useState('');
  const [submittingConcierge, setSubmittingConcierge] = useState(false);

  useEffect(() => {
    if (isOpen) onTripViewed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const [submittingTrip, setSubmittingTrip] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const existingTypes = services.map((s) => s.type);
  const remaining = ALL_ADDABLE_TYPES.filter((t) => !existingTypes.includes(t));

  const seedService = services.find((s) => s.type === 'Hotel' || s.type === 'Shortlet');
  const tripDates = seedService ? (seedService.details.checkin || seedService.details.checkinDate) : undefined;
  const tripDatesEnd = seedService ? (seedService.details.checkout || seedService.details.checkoutDate) : undefined;
  const tripGuests = seedService ? seedService.details.guests || seedService.details.numberOfRooms : undefined;

  const handleConciergeSubmit = async () => {
    if (!conciergeText.trim()) return;
    setSubmittingConcierge(true);
    try {
      await addServiceToTrip('Concierge', { request: conciergeText.trim() }, `Concierge — ${conciergeText.trim().slice(0, 60)}${conciergeText.length > 60 ? '…' : ''}`);
      setConciergeText('');
    } catch (err) {
      console.error('Error submitting concierge request:', err);
    } finally {
      setSubmittingConcierge(false);
    }
  };

  const handleSubmitTrip = async () => {
    setSubmittingTrip(true);
    try {
      await submitTripRequest();
      notifyTeamOfSubmission(trip, services);
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting trip request:', err);
    } finally {
      setSubmittingTrip(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-charcoal/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-cream border border-gold/30 text-charcoal rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        >
          <div className="bg-charcoal text-cream p-5 sm:p-6 flex justify-between items-center border-b border-gold/20 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-serif font-medium tracking-wide text-cream">Your Trip</h2>
                <span className="text-[10px] bg-gold/20 text-gold font-mono px-2 py-0.5 rounded-full border border-gold/30 uppercase tracking-widest font-semibold">
                  {trip.tripCode}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-cream/60 mt-1">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {trip.location}</span>
                {tripDates && <span>📅 {tripDates}{tripDatesEnd ? ` – ${tripDatesEnd}` : ''}</span>}
                {tripGuests && <span>👥 {tripGuests}</span>}
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition-all cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {submitted && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800">
                Your trip request has been submitted — our team is now coordinating everything. You can keep adding services any time before it's fully confirmed.
              </div>
            )}

            <div className="space-y-3">
              {services.length === 0 ? (
                <p className="text-sm text-charcoal/50 text-center py-6">No services on this trip yet.</p>
              ) : (
                services.map((service) => (
                  <div key={service.id} className="bg-white border border-charcoal/10 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-charcoal/5 text-charcoal/60">
                            {service.type}
                          </span>
                          <span className="text-[9px] text-charcoal/35 font-mono uppercase tracking-wider">
                            Ref: {service.id.slice(0, 8)}
                          </span>
                        </div>
                        <p className="text-sm text-charcoal font-medium">{service.summary}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${SERVICE_STATUS_BADGE[service.status]}`}>
                          {service.status}
                        </span>
                        {service.paymentStatus && service.paymentStatus !== 'Unpaid' && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${PAYMENT_STATUS_BADGE[service.paymentStatus]}`}>
                            {service.paymentStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {service.providerAssigned && (
                      <p className="text-xs text-charcoal/60 mt-2">
                        <span className="font-semibold text-charcoal/80">Provider:</span> {service.providerAssigned}
                      </p>
                    )}

                    {service.confirmationNotes && (
                      <div className="mt-2.5 bg-gold/10 border border-gold/25 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-charcoal/60 mb-1">Confirmation Details</p>
                        <p className="text-xs text-charcoal/80 whitespace-pre-wrap">{service.confirmationNotes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {remaining.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-charcoal/50 mb-2">Add another service</p>
                <div className="flex flex-wrap gap-2">
                  {remaining.map((type) => (
                    <button
                      key={type}
                      onClick={() => setAddingType(type)}
                      className="text-[11px] bg-charcoal/5 hover:bg-gold/15 text-charcoal/70 hover:text-charcoal px-3 py-1.5 rounded-full border border-charcoal/10 transition-colors cursor-pointer"
                    >
                      + {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-charcoal/10 rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-wider font-bold text-charcoal/50 mb-2">Need Anything Else?</p>
              <p className="text-xs text-charcoal/60 mb-2.5">Tell Elite Booking what you need and we'll help arrange it.</p>
              <textarea
                rows={2}
                value={conciergeText}
                onChange={(e) => setConciergeText(e.target.value)}
                placeholder='e.g. "Can you arrange flowers in my hotel room?"'
                className="w-full p-3 bg-cream/40 border border-charcoal/15 rounded-xl text-xs focus:outline-none focus:border-gold text-charcoal"
              />
              <button
                onClick={handleConciergeSubmit}
                disabled={!conciergeText.trim() || submittingConcierge}
                className="mt-2 w-full py-2 bg-charcoal hover:bg-charcoal/90 text-gold font-semibold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submittingConcierge ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Talk to Concierge'}
              </button>
            </div>

            <div className="bg-charcoal/[0.03] border border-charcoal/10 rounded-2xl p-4 flex items-center justify-between gap-3">
              <p className="text-xs text-charcoal/60">Need help with your trip?</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I need help with my trip ${trip.tripCode}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <a
                  href={`tel:+${SUPPORT_WHATSAPP_NUMBER}`}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-full bg-charcoal/5 text-charcoal/70 border border-charcoal/10 hover:bg-charcoal/10 transition-colors cursor-pointer"
                  title={SUPPORT_PHONE_DISPLAY}
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t border-charcoal/10 flex-shrink-0 space-y-2">
            {trip.status === 'Building' && !submitted && (
              <button
                onClick={handleSubmitTrip}
                disabled={submittingTrip || services.length === 0}
                className="w-full py-3.5 bg-gradient-to-r from-gold via-amber-300 to-gold text-charcoal font-bold uppercase tracking-wider text-xs rounded-full shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingTrip ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Submit Trip Request</>}
              </button>
            )}
            <button
              onClick={clearActiveTrip}
              className="w-full py-2.5 bg-white border border-charcoal/15 hover:bg-charcoal/5 text-charcoal text-xs font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Create New Trip
            </button>
          </div>
        </motion.div>
      </div>

      <AddServiceModal
        isOpen={!!addingType}
        onClose={() => setAddingType(null)}
        serviceType={addingType}
        onAdd={addServiceToTrip}
      />
    </AnimatePresence>
  );
};
