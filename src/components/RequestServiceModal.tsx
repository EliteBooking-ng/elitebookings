import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, CheckCircle2, MapPin } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import type { ServiceType } from '../types/trip';
import { generateRequestId } from '../utils/generateRequestId';

interface RequestServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Pre-set when the entry point already knows the category (e.g. a hotel
  // empty-state) — still shown and editable, just pre-selected.
  defaultCategory?: ServiceType;
  prefillText?: string;
  prefillLocation?: string;
  // Which entry point opened this — written to the record for later tuning
  // (which surfaces actually convert), not shown to the customer.
  source: string;
}

// Car Rental, Moving & Logistics, and Private Jet already have their own
// full request wizards (CarRequestModal/MovingRequestModal/PrivateJetRequestModal)
// — this universal fallback covers everything else.
const REQUESTABLE_CATEGORIES: ServiceType[] = [
  'Hotel', 'Shortlet', 'Airport Pickup', 'Driver', 'Restaurant', 'Yacht', 'Truck', 'Forklift', 'Concierge', 'Other',
];

// Guided tap-to-choose options per category, replacing a blank "describe
// what you need" box as the primary input — a customer shouldn't have to
// think of what to type when a short list of likely answers covers most
// cases. 'Other' has none (genuinely open-ended); free text stays available
// everywhere as a fallback for anything these don't cover.
const CATEGORY_TYPE_OPTIONS: Partial<Record<ServiceType, string[]>> = {
  Hotel: ['Luxury Hotel', 'Budget Hotel', 'Boutique Hotel', 'Any Suitable Option'],
  Shortlet: ['Luxury Apartment', 'Budget Apartment', 'Serviced Shortlet', 'Any Suitable Option'],
  'Airport Pickup': ['Standard Pickup', 'VIP / Executive', 'Group Pickup', 'Any Suitable Option'],
  Driver: ['Full-Day Driver', 'Airport Run', 'Hourly / As-Needed', 'Any Suitable Option'],
  Restaurant: ['Fine Dining', 'Casual Dining', 'Private Chef / Event', 'Any Suitable Option'],
  Yacht: ['Day Charter', 'Sunset Cruise', 'Private Event', 'Any Suitable Option'],
  Truck: ['Small Truck / Pickup', 'Medium Truck', 'Large Truck', 'Any Suitable Option'],
  Forklift: ['Small Capacity', 'Medium Capacity', 'Heavy-Duty', 'Any Suitable Option'],
  Concierge: ['Errands / Shopping', 'Event Planning', 'Personal Assistant', 'Any Suitable Option'],
};

const CATEGORY_HEADING: Record<ServiceType, string> = {
  Hotel: "Can't Find Your Hotel?",
  Shortlet: "Can't Find Your Shortlet?",
  'Airport Pickup': 'Need an Airport Pickup?',
  'Car Rental': 'Looking for a Vehicle?',
  'Private Jet': 'Looking for a Charter?',
  Driver: 'Looking for a Driver?',
  Restaurant: 'Looking for a Restaurant?',
  Yacht: 'Looking for a Yacht Experience?',
  'Moving & Logistics': 'Planning a Move?',
  Truck: 'Need a Truck?',
  Forklift: 'Need a Forklift?',
  Concierge: 'Need Concierge Assistance?',
  Other: 'Looking for Something Specific?',
};

const CATEGORY_CTA_LABEL: Record<ServiceType, string> = {
  Hotel: 'Find a Hotel for Me',
  Shortlet: 'Find a Shortlet for Me',
  'Airport Pickup': 'Arrange My Pickup',
  'Car Rental': 'Find a Vehicle for Me',
  'Private Jet': 'Request a Charter',
  Driver: 'Find a Driver for Me',
  Restaurant: 'Find a Restaurant for Me',
  Yacht: 'Find a Yacht for Me',
  'Moving & Logistics': 'Request a Move',
  Truck: 'Find a Truck for Me',
  Forklift: 'Find a Forklift for Me',
  Concierge: 'Request Concierge Assistance',
  Other: 'Submit Request',
};

const CATEGORY_LOCATION_PLACEHOLDER: Partial<Record<ServiceType, string>> = {
  Hotel: 'e.g. Benin City, Edo State',
  Shortlet: 'e.g. Benin City, Edo State',
  'Airport Pickup': 'e.g. Enugu Airport',
  Driver: 'e.g. Enugu',
  Restaurant: 'e.g. Enugu',
  Yacht: 'e.g. Lagos',
  Truck: 'e.g. Enugu',
  Forklift: 'e.g. Enugu',
};

export const RequestServiceModal: React.FC<RequestServiceModalProps> = ({
  isOpen, onClose, defaultCategory, prefillText, prefillLocation, source,
}) => {
  const [category, setCategory] = useState<ServiceType>(defaultCategory || 'Other');
  const [preferredType, setPreferredType] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [location, setLocation] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory || 'Other');
      setPreferredType('');
      setAdditionalDetails(prefillText || '');
      setLocation(prefillLocation || '');
      setPreferredDate('');
      setName('');
      setPhone('');
      setEmail('');
      setSubmitted(false);
      setRequestId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const typeOptions = CATEGORY_TYPE_OPTIONS[category] || [];
  const isValid = (!!preferredType || !!additionalDetails.trim()) && !!name.trim() && !!phone.trim();

  const description = [preferredType, additionalDetails.trim()].filter(Boolean).join(' — ');

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    const newId = generateRequestId('REQ');

    const requestDetails = {
      requestId: newId,
      category,
      preferredType: preferredType || null,
      description,
      location: location.trim(),
      preferredDate,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerEmail: email.trim(),
      source,
      status: 'New',
      createdAt: new Date().toISOString(),
    };

    const firestoreSave = addDoc(collection(db, 'service_requests'), requestDetails).catch((err) => {
      console.warn('Firestore service request save notice:', err);
    });

    const notifyText = `New Service Request (${newId})\n\nCategory: ${category}\nLooking for: ${description}${location.trim() ? `\nLocation: ${location.trim()}` : ''}${preferredDate ? `\nPreferred Date: ${preferredDate}` : ''}\nSource: ${source}\n\nContact Name: ${name.trim()}\nContact Phone: ${phone.trim()}${email.trim() ? `\nContact Email: ${email.trim()}` : ''}`;

    const notifyPromise = fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: `Elite Booking Service Request ${newId}: ${category}`, text: notifyText }),
    }).catch((err) => console.warn('Notification send notice:', err));

    await Promise.allSettled([firestoreSave, notifyPromise]);

    setRequestId(newId);
    setSubmitting(false);
    setSubmitted(true);
  };

  const whatsappHref = `https://wa.me/2347072253857?text=${encodeURIComponent(
    `Hello Elite Booking! 👋\n\nI just submitted a service request (${requestId}):\n- Category: ${category}\n- Looking for: ${description}${location.trim() ? `\n- Location: ${location.trim()}` : ''}\n\nName: ${name.trim()}\nPhone: ${phone.trim()}`
  )}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl z-10 max-h-[92vh] overflow-y-auto"
        >
          <button onClick={onClose} className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors cursor-pointer z-20" aria-label="Close">
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-8">
            {!submitted ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gold text-[10px] uppercase tracking-[0.35em] font-bold">Request a Service</span>
                </div>
                <h3 className="font-serif text-2xl text-white font-light mb-1">{CATEGORY_HEADING[category]}</h3>
                <p className="text-white/40 text-xs mb-6">
                  Tell us what you're looking for — Elite Booking will help you find the right option, even if it's not listed on our website.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {REQUESTABLE_CATEGORIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { setCategory(c); setPreferredType(''); }}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            category === c ? 'bg-gold border-gold text-charcoal' : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> Where do you need this?
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={CATEGORY_LOCATION_PLACEHOLDER[category] || 'e.g. Enugu, Enugu State'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/50 transition-colors"
                    />
                  </div>

                  {typeOptions.length > 0 && (
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">What type of {category.toLowerCase()} are you after?</label>
                      <div className="grid grid-cols-2 gap-2">
                        {typeOptions.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setPreferredType(t)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border text-center ${
                              preferredType === t ? 'bg-gold border-gold text-charcoal' : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">
                      {typeOptions.length > 0 ? 'Anything else to add? (optional)' : 'Describe what you need'}
                    </label>
                    <textarea
                      rows={typeOptions.length > 0 ? 2 : 3}
                      value={additionalDetails}
                      onChange={(e) => setAdditionalDetails(e.target.value)}
                      placeholder={typeOptions.length > 0 ? 'e.g. specific area, budget, number of guests...' : 'Tell us what you need and we\'ll help arrange it'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/50 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Preferred Date (optional)</label>
                    <input
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold/50 transition-colors [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/50 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone Number"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Email (optional)</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold/50 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!isValid || submitting}
                    onClick={handleSubmit}
                    className="w-full py-3.5 bg-gradient-to-r from-gold via-amber-300 to-gold text-charcoal font-bold text-xs uppercase tracking-[0.2em] rounded-full shadow-lg transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : CATEGORY_CTA_LABEL[category]}
                  </button>
                  <p className="text-white/30 text-[11px] text-center">
                    Our team will check available options and contact you with suitable matches.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-7 h-7 text-gold" />
                </div>
                <h3 className="font-serif text-2xl text-white font-light mb-2">Request Received</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-1 max-w-sm mx-auto">
                  Thank you. Our team will source this through our partner network and follow up with available options shortly.
                </p>
                <p className="text-gold text-xs font-bold tracking-[0.15em] uppercase mt-4 mb-8">
                  Request ID: {requestId}
                </p>

                <div className="space-y-2.5">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer"
                  >
                    Message Us On WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
