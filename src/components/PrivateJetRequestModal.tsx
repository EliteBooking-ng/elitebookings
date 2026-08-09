import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plane, X, ChevronLeft, ChevronRight, Check, CheckCircle2, Loader2,
  Circle, MapPin, Calendar, Clock, Users
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface PrivateJetRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRequirement?: string | null;
}

type Step = 1 | 2 | 3 | 'summary' | 'submitted';

const DEPARTURE_PRESETS = ['Lagos', 'Abuja', 'Port Harcourt', 'Other'] as const;
const AIRCRAFT_OPTIONS = ['No preference', 'Light Jet', 'Midsize Jet', 'Heavy Jet'] as const;
const SPECIAL_REQUIREMENTS = ['Empty Leg Charter', 'Co-Share Charter', 'Catering', 'Extra Luggage', 'Ground Transportation', 'VIP Airport Assistance', 'Other'];

const DESTINATION_SUGGESTIONS = [
  'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Enugu', 'Calabar', 'Owerri', 'Benin City', 'Uyo', 'Kaduna',
  'Accra, Ghana', 'Dubai, UAE', 'London, United Kingdom', 'Paris, France', 'Johannesburg, South Africa',
  'Houston, USA', 'New York, USA'
];

const STATUS_STAGES = [
  'Request Received',
  'Searching Available Aircraft',
  'Aircraft Options',
  'Quote',
  'Confirmation',
  'Payment',
  'Booking Confirmed',
];

function generateRequestId(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `EB-JET-${digits}`;
}

export function PrivateJetRequestModal({ isOpen, onClose, defaultRequirement = null }: PrivateJetRequestModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId, setRequestId] = useState('');

  // Step 1 — Trip Details
  const [departurePreset, setDeparturePreset] = useState<typeof DEPARTURE_PRESETS[number]>('Lagos');
  const [departureOther, setDepartureOther] = useState('');
  const [destination, setDestination] = useState('');
  const [tripType, setTripType] = useState<'One-way' | 'Round Trip'>('One-way');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');

  // Step 2 — Travel Details
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [aircraftPreference, setAircraftPreference] = useState<typeof AIRCRAFT_OPTIONS[number]>('No preference');

  // Step 3 — Additional Requests + contact (needed to actually reach the customer back)
  const [specialRequirements, setSpecialRequirements] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const departureLabel = departurePreset === 'Other' ? departureOther.trim() : departurePreset;
  const isEmptyLeg = defaultRequirement === 'Empty Leg Charter';
  const isCoShare = defaultRequirement === 'Co-Share Charter';

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setDeparturePreset('Lagos');
      setDepartureOther('');
      setDestination('');
      setTripType('One-way');
      setReturnDate('');
      setReturnTime('');
      setDepartureDate('');
      setDepartureTime('');
      setPassengers('1');
      setAircraftPreference('No preference');
      setSpecialRequirements([]);
      setAdditionalNotes('');
      setContactName('');
      setContactPhone('');
      setRequestId('');
    }, 300);
  };

  const toggleRequirement = (label: string) => {
    setSpecialRequirements((prev) =>
      prev.includes(label) ? prev.filter((r) => r !== label) : [...prev, label]
    );
  };

  useEffect(() => {
    if (isOpen && defaultRequirement) {
      setSpecialRequirements((prev) => (prev.includes(defaultRequirement) ? prev : [...prev, defaultRequirement]));
    }
  }, [isOpen, defaultRequirement]);

  const step1Valid = departureLabel.length > 0 && destination.trim().length > 0 && (tripType === 'One-way' || (returnDate && returnTime));
  const step2Valid = departureDate.length > 0 && departureTime.length > 0 && Number(passengers) > 0;
  const step3Valid = contactName.trim().length > 0 && contactPhone.trim().length > 0;

  const formatDateTime = (date: string, time: string) => {
    if (!date) return 'Flexible';
    const d = new Date(`${date}T${time || '00:00'}`);
    const dateLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!time) return dateLabel;
    const timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateLabel} — ${timeLabel}`;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const newId = generateRequestId();

    const requestDetails = {
      requestId: newId,
      departure: departureLabel,
      destination: destination.trim(),
      tripType,
      departureDate,
      departureTime,
      ...(tripType === 'Round Trip' ? { returnDate, returnTime } : {}),
      passengers,
      aircraftPreference,
      specialRequirements,
      additionalNotes: additionalNotes.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      status: 'Request Received',
      createdAt: new Date().toISOString(),
      source: 'Private Aviation Request Form',
    };

    const summaryText = `New Private Jet Request (${newId})\n\nFrom: ${departureLabel}\nTo: ${destination.trim()}\nTrip: ${tripType}\nDeparture: ${formatDateTime(departureDate, departureTime)}${tripType === 'Round Trip' ? `\nReturn: ${formatDateTime(returnDate, returnTime)}` : ''}\nPassengers: ${passengers}\nAircraft Preference: ${aircraftPreference}\nSpecial Requests: ${specialRequirements.length > 0 ? specialRequirements.join(', ') : 'None'}\nNotes: ${additionalNotes.trim() || 'None'}\n\nContact Name: ${contactName.trim()}\nContact Phone: ${contactPhone.trim()}`;

    const firestoreSave = addDoc(collection(db, 'jet_requests'), requestDetails).catch((err) => {
      console.warn('Firestore jet request save notice:', err);
    });

    const accessKey = localStorage.getItem('elite_web3forms_key') || (import.meta as any).env.VITE_WEB3FORMS_ACCESS_KEY;
    const targetEmail = localStorage.getItem('elite_notification_email') || 'Elitebooking.ng@gmail.com';

    const emailPromises: Promise<any>[] = [
      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: `Elite Aviation Request ${newId}: ${departureLabel} to ${destination.trim()}`,
          _template: 'table',
          'Request ID': newId,
          'From': departureLabel,
          'To': destination.trim(),
          'Trip Type': tripType,
          'Departure': formatDateTime(departureDate, departureTime),
          ...(tripType === 'Round Trip' ? { 'Return': formatDateTime(returnDate, returnTime) } : {}),
          'Passengers': passengers,
          'Aircraft Preference': aircraftPreference,
          'Special Requests': specialRequirements.length > 0 ? specialRequirements.join(', ') : 'None',
          'Notes': additionalNotes.trim() || 'None',
          'Contact Name': contactName.trim(),
          'Contact Phone': contactPhone.trim(),
          'Full Message': summaryText,
        }),
      }).catch((err) => console.warn('FormSubmit jet request notice:', err)),
    ];

    if (accessKey && accessKey.trim() !== '') {
      emailPromises.push(
        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: accessKey,
            subject: `Elite Aviation Request ${newId}: ${departureLabel} to ${destination.trim()}`,
            from_name: 'Elite Bookings Private Aviation',
            to_email: targetEmail,
            message: summaryText,
            phone: contactPhone.trim(),
          }),
        }).catch((err) => console.warn('Web3Forms jet request notice:', err))
      );
    }

    await Promise.allSettled([firestoreSave, ...emailPromises]);

    setRequestId(newId);
    setIsSubmitting(false);
    setStep('submitted');
  };

  const whatsappFallbackHref = `https://wa.me/2347072253857?text=${encodeURIComponent(
    `Hello Elite Aviation! ✈️\n\nI just submitted a private jet request (${requestId}):\n- From: ${departureLabel}\n- To: ${destination.trim()}\n- Departure: ${formatDateTime(departureDate, departureTime)}\n- Passengers: ${passengers}\n\nName: ${contactName.trim()}\nPhone: ${contactPhone.trim()}`
  )}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl z-10 max-h-[92vh] overflow-y-auto"
          >
            <button
              onClick={resetAndClose}
              className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors cursor-pointer z-20"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-1">
                <Plane className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 text-[10px] uppercase tracking-[0.35em] font-bold">Private Aviation</span>
              </div>
              <p className="text-white/40 text-[11px] mb-6">
                {isEmptyLeg ? (
                  <>Empty leg rates are reduced from our standard <span className="text-white/70 font-semibold">$4,850/hour</span> charter rate · exact pricing confirmed per route</>
                ) : isCoShare ? (
                  <>Co-share seats are priced per passenger, well below a full charter · exact rate confirmed per route and group</>
                ) : (
                  <>Local trips from <span className="text-white/70 font-semibold">$4,850/hour</span> · final pricing confirmed per request</>
                )}
              </p>

              {(step === 1 || step === 2 || step === 3) && (
                <>
                  <h3 className="font-serif text-2xl text-white font-light mb-1">
                    {isEmptyLeg ? 'Enquire About Empty Leg Availability' : isCoShare ? 'Enquire About Co-Share Availability' : 'Request a Private Jet Quote'}
                  </h3>
                  <p className="text-white/40 text-xs mb-6">Step {step} of 3</p>
                  <div className="flex gap-1.5 mb-8">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`h-[3px] flex-1 rounded-full transition-colors ${s <= step ? 'bg-blue-500' : 'bg-white/10'}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* STEP 1 — Trip Details */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Departure Location</label>
                    <div className="grid grid-cols-2 gap-2">
                      {DEPARTURE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDeparturePreset(preset)}
                          className={`py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            departurePreset === preset
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    {departurePreset === 'Other' && (
                      <input
                        type="text"
                        placeholder="Enter departure city or airport"
                        value={departureOther}
                        onChange={(e) => setDepartureOther(e.target.value)}
                        className="mt-2.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Destination</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                      <input
                        type="text"
                        list="jet-destination-suggestions"
                        placeholder="Search city or airport"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                      />
                      <datalist id="jet-destination-suggestions">
                        {DESTINATION_SUGGESTIONS.map((d) => (
                          <option key={d} value={d} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Trip Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['One-way', 'Round Trip'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTripType(t)}
                          className={`py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            tripType === t
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tripType === 'Round Trip' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Return Date</label>
                        <input
                          type="date"
                          value={returnDate}
                          onChange={(e) => setReturnDate(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Return Time</label>
                        <input
                          type="time"
                          value={returnTime}
                          onChange={(e) => setReturnTime(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!step1Valid}
                    onClick={() => setStep(2)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* STEP 2 — Travel Details */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Departure Date</label>
                      <input
                        type="date"
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Preferred Time</label>
                      <input
                        type="time"
                        value={departureTime}
                        onChange={(e) => setDepartureTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Number of Passengers</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={passengers}
                        onChange={(e) => setPassengers(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Aircraft Preference <span className="normal-case text-white/30 font-normal">(optional)</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      {AIRCRAFT_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAircraftPreference(opt)}
                          className={`py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            aircraftPreference === opt
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 py-3.5 px-5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      type="button"
                      disabled={!step2Valid}
                      onClick={() => setStep(3)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — Additional Requests */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Special Requirements <span className="normal-case text-white/30 font-normal">(optional)</span></label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIAL_REQUIREMENTS.map((req) => (
                        <button
                          key={req}
                          type="button"
                          onClick={() => toggleRequirement(req)}
                          className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                            specialRequirements.includes(req)
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                          }`}
                        >
                          {req}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Anything Else We Should Know?</label>
                    <textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      rows={3}
                      placeholder="Optional — tell us more about your trip"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5 mt-4">Your Contact Details</label>
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        required
                        placeholder="Full Name"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                      />
                      <input
                        type="tel"
                        required
                        placeholder="Phone Number"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 py-3.5 px-5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      type="button"
                      disabled={!step3Valid}
                      onClick={() => setStep('summary')}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      Review Request <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* SUMMARY */}
              {step === 'summary' && (
                <div>
                  <h3 className="font-serif text-2xl text-white font-light mb-1">Your Private Jet Request</h3>
                  <p className="text-white/40 text-xs mb-6">Please review before submitting.</p>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3.5 mb-6">
                    {[
                      ['From', departureLabel],
                      ['To', destination.trim()],
                      ['Trip', tripType],
                      ['Departure', formatDateTime(departureDate, departureTime)],
                      ...(tripType === 'Round Trip' ? [['Return', formatDateTime(returnDate, returnTime)]] : []),
                      ['Passengers', passengers],
                      ['Aircraft', aircraftPreference],
                      ['Special Requests', specialRequirements.length > 0 ? specialRequirements.join(', ') : 'None'],
                      ...(additionalNotes.trim() ? [['Notes', additionalNotes.trim()]] : []),
                      ['Contact', `${contactName.trim()} · ${contactPhone.trim()}`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between items-start gap-4 text-sm">
                        <span className="text-white/40 text-[10px] uppercase tracking-[0.15em] font-bold pt-0.5 flex-shrink-0">{label}</span>
                        <span className="text-white text-right font-medium">{value}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-white/30 text-[11px] leading-relaxed mb-6">
                    Aircraft availability and final pricing depend on your route, aircraft, date and passenger count, and will be confirmed by our team.
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 py-3.5 px-5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSubmit}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Jet Request</>}
                    </button>
                  </div>
                </div>
              )}

              {/* SUBMITTED */}
              {step === 'submitted' && (
                <div className="text-center py-2">
                  <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-7 h-7 text-blue-400" />
                  </div>
                  <h3 className="font-serif text-2xl text-white font-light mb-2">Request Received</h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-1 max-w-sm mx-auto">
                    Your private aviation request has been received. Elite Booking will check aircraft availability and source the best available option for your trip.
                  </p>
                  <p className="text-blue-400 text-xs font-bold tracking-[0.15em] uppercase mt-4 mb-8">
                    Request ID: {requestId}
                  </p>

                  <div className="text-left bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
                    {STATUS_STAGES.map((stage, idx) => {
                      const isActive = idx === 0;
                      return (
                        <div key={stage} className={`flex items-center gap-3 ${idx < STATUS_STAGES.length - 1 ? 'mb-4' : ''}`}>
                          {isActive ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-white/20 flex-shrink-0" />
                          )}
                          <span className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-white/30'}`}>
                            {stage}{isActive ? ' ✓' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2.5">
                    <a
                      href={whatsappFallbackHref}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer"
                    >
                      Message Us On WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={resetAndClose}
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
      )}
    </AnimatePresence>
  );
}
