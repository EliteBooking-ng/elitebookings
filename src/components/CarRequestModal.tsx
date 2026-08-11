import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Car, X, ChevronLeft, ChevronRight, CheckCircle2, Loader2,
  Circle, Minus, Plus
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import {
  getVehiclesByLocation, getVehicleById, getTierPrice, isTierPriceCalculable,
  type Vehicle, type PriceTier
} from '../data/cars';

interface CarRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  location: string;
}

type Step = 1 | 2 | 3 | 4 | 'summary' | 'submitted';
type TripType = 'Within Port Harcourt' | 'Inter-State';

interface LineItem {
  vehicleId: string;
  name: string;
  category: string;
  quantity: number;
}

const MAX_QUANTITY = 20;
const SPECIAL_REQUESTS = [
  'Airport pickup', 'Multiple pickup locations', 'Wedding/event transportation',
  'VIP transportation', 'Child seat', 'Extra luggage', 'Other',
];
const STATUS_STAGES = ['Request Received', 'Checking Availability', 'Quote', 'Confirmation', 'Payment', 'Booking Confirmed'];

function generateRequestId(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `EB-CAR-${digits}`;
}

export function CarRequestModal({ isOpen, onClose, vehicle, location }: CarRequestModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId, setRequestId] = useState('');

  // Step 1 — Vehicle Request
  const [items, setItems] = useState<LineItem[]>([]);
  const [addVehicleId, setAddVehicleId] = useState('');
  const [driverPreference, setDriverPreference] = useState<'With Driver' | 'Self Drive' | ''>('');
  const [passengerCount, setPassengerCount] = useState('');

  // Step 2 — Trip Details
  const [tripType, setTripType] = useState<TripType>('Within Port Harcourt');
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  // Step 3 — Special Requirements
  const [specialRequests, setSpecialRequests] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Step 4 — Customer Details
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (isOpen && vehicle && items.length === 0) {
      setItems([{
        vehicleId: vehicle.id,
        name: vehicle.name,
        category: vehicle.category,
        quantity: 1,
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, vehicle]);

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setItems([]);
      setAddVehicleId('');
      setDriverPreference('');
      setPassengerCount('');
      setTripType('Within Port Harcourt');
      setPickupLocation('');
      setDestination('');
      setTripDate('');
      setPickupTime('');
      setSpecialRequests([]);
      setAdditionalNotes('');
      setFullName('');
      setPhone('');
      setEmail('');
      setRequestId('');
    }, 300);
  };

  const availableToAdd = getVehiclesByLocation(location).filter((v) => !items.some((i) => i.vehicleId === v.id));

  const handleAddVehicle = () => {
    const v = availableToAdd.find((v) => v.id === addVehicleId);
    if (!v) return;
    setItems((prev) => [...prev, {
      vehicleId: v.id, name: v.name, category: v.category, quantity: 1,
    }]);
    setAddVehicleId('');
  };

  const handleRemoveItem = (vehicleId: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.vehicleId !== vehicleId) : prev));
  };

  const updateQuantity = (vehicleId: string, delta: number) => {
    setItems((prev) => prev.map((i) => (
      i.vehicleId === vehicleId ? { ...i, quantity: Math.min(MAX_QUANTITY, Math.max(1, i.quantity + delta)) } : i
    )));
  };

  const toggleSpecialRequest = (label: string) => {
    setSpecialRequests((prev) => (prev.includes(label) ? prev.filter((r) => r !== label) : [...prev, label]));
  };

  const tier: PriceTier = tripType === 'Inter-State' ? 'interState' : 'starting';
  const canCalculate = items.length > 0 && items.every((i) => {
    const v = getVehicleById(i.vehicleId);
    return v != null && isTierPriceCalculable(v, tier);
  });
  const estimateLines = canCalculate ? items.map((i) => {
    const v = getVehicleById(i.vehicleId)!;
    return { label: `${i.name} × ${i.quantity}`, amount: (getTierPrice(v, tier) as number) * i.quantity };
  }) : [];
  const estimateTotal = estimateLines.reduce((sum, l) => sum + l.amount, 0);

  const step1Valid = items.length > 0 && driverPreference !== '' && (driverPreference !== 'With Driver' || passengerCount.trim().length > 0);
  const step2Valid = pickupLocation.trim().length > 0 && destination.trim().length > 0 && tripDate.length > 0 && pickupTime.length > 0;
  const step4Valid = fullName.trim().length > 0 && phone.trim().length > 0 && email.trim().length > 0;

  const formatDateTime = (date: string, time: string) => {
    if (!date) return 'Flexible';
    const d = new Date(`${date}T${time || '00:00'}`);
    const dateLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!time) return dateLabel;
    const timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateLabel} — ${timeLabel}`;
  };

  const vehiclesSummaryText = items.map((i) => `${i.name} × ${i.quantity}`).join(', ');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const newId = generateRequestId();

    // Snapshot each line item's resolved pricingType/unitPrice for the selected trip
    // type at submission time — a historical record of what was actually quoted,
    // not a live reference that could drift if the fleet's prices change later.
    const vehicleSnapshots = items.map((i) => {
      const v = getVehicleById(i.vehicleId);
      return {
        vehicleId: i.vehicleId,
        name: i.name,
        category: i.category,
        pricingType: v?.pricingType ?? 'custom-quote',
        unitPrice: v ? getTierPrice(v, tier) : null,
        quantity: i.quantity,
        agency: v?.agency ?? null,
      };
    });

    const requestDetails = {
      requestId: newId,
      vehicles: vehicleSnapshots,
      location,
      tripType,
      driverPreference,
      passengerCount: passengerCount.trim(),
      pickupLocation: pickupLocation.trim(),
      destination: destination.trim(),
      date: tripDate,
      time: pickupTime,
      specialRequests,
      additionalNotes: additionalNotes.trim(),
      customerName: fullName.trim(),
      customerPhone: phone.trim(),
      customerEmail: email.trim(),
      estimatedTotal: canCalculate ? estimateTotal : null,
      status: 'New Request',
      createdAt: new Date().toISOString(),
      source: 'Car Rental Request Form',
      adminQuoteAmount: null,
      adminNotes: '',
      alternativeSuggestion: null,
    };

    const summaryText = `New Car Rental Request (${newId})\n\nVehicles: ${vehiclesSummaryText}\nLocation: ${location}\nTrip Type: ${tripType}\nDriver Preference: ${driverPreference}${passengerCount.trim() ? `\nPassengers: ${passengerCount.trim()}` : ''}\nPickup: ${pickupLocation.trim()}\nDestination: ${destination.trim()}\nDate: ${formatDateTime(tripDate, pickupTime)}\nSpecial Requests: ${specialRequests.length > 0 ? specialRequests.join(', ') : 'None'}\nNotes: ${additionalNotes.trim() || 'None'}\nEstimated Price: ${canCalculate ? `₦${estimateTotal.toLocaleString('en-NG')} (starting estimate)` : 'To be confirmed by Elite Booking'}\n\nContact Name: ${fullName.trim()}\nContact Phone: ${phone.trim()}\nContact Email: ${email.trim()}`;

    const firestoreSave = addDoc(collection(db, 'car_requests'), requestDetails).catch((err) => {
      console.warn('Firestore car request save notice:', err);
    });

    const accessKey = localStorage.getItem('elite_web3forms_key') || (import.meta as any).env.VITE_WEB3FORMS_ACCESS_KEY;
    const targetEmail = localStorage.getItem('elite_notification_email') || 'Elitebooking.ng@gmail.com';

    const emailPromises: Promise<any>[] = [
      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: `Elite Car Rental Request ${newId}: ${vehiclesSummaryText}`,
          _template: 'table',
          'Request ID': newId,
          'Vehicles': vehiclesSummaryText,
          'Location': location,
          'Trip Type': tripType,
          'Driver Preference': driverPreference,
          'Passengers': passengerCount.trim() || 'N/A',
          'Pickup': pickupLocation.trim(),
          'Destination': destination.trim(),
          'Date': formatDateTime(tripDate, pickupTime),
          'Special Requests': specialRequests.length > 0 ? specialRequests.join(', ') : 'None',
          'Notes': additionalNotes.trim() || 'None',
          'Estimated Price': canCalculate ? `₦${estimateTotal.toLocaleString('en-NG')} (starting estimate)` : 'To be confirmed',
          'Contact Name': fullName.trim(),
          'Contact Phone': phone.trim(),
          'Contact Email': email.trim(),
          'Full Message': summaryText,
        }),
      }).catch((err) => console.warn('FormSubmit car request notice:', err)),
    ];

    if (accessKey && accessKey.trim() !== '') {
      emailPromises.push(
        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: accessKey,
            subject: `Elite Car Rental Request ${newId}: ${vehiclesSummaryText}`,
            from_name: 'Elite Bookings Car Rentals',
            to_email: targetEmail,
            message: summaryText,
            phone: phone.trim(),
          }),
        }).catch((err) => console.warn('Web3Forms car request notice:', err))
      );
    }

    await Promise.allSettled([firestoreSave, ...emailPromises]);

    setRequestId(newId);
    setIsSubmitting(false);
    setStep('submitted');
  };

  const whatsappFallbackHref = `https://wa.me/2347072253857?text=${encodeURIComponent(
    `Hello Elite Booking! 🚗\n\nI just submitted a car rental request (${requestId}):\n- Vehicles: ${vehiclesSummaryText}\n- Location: ${location}\n- Pickup: ${pickupLocation.trim()}\n- Date: ${formatDateTime(tripDate, pickupTime)}\n\nName: ${fullName.trim()}\nPhone: ${phone.trim()}`
  )}`;

  const pillClass = (active: boolean) =>
    `py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
      active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
    }`;

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
                <Car className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 text-[10px] uppercase tracking-[0.35em] font-bold">Car Rentals</span>
              </div>
              <p className="text-white/40 text-[11px] mb-6">
                Availability and final pricing are confirmed by Elite Booking after your request.
              </p>

              {(step === 1 || step === 2 || step === 3 || step === 4) && (
                <>
                  <h3 className="font-serif text-2xl text-white font-light mb-1">Request This Car</h3>
                  <p className="text-white/40 text-xs mb-6">Step {step} of 4</p>
                  <div className="flex gap-1.5 mb-8">
                    {[1, 2, 3, 4].map((s) => (
                      <div key={s} className={`h-[3px] flex-1 rounded-full transition-colors ${s <= step ? 'bg-blue-500' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </>
              )}

              {/* STEP 1 — Vehicle Request */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Vehicle Request</label>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.vehicleId} className="bg-white/5 border border-white/10 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-white text-sm font-semibold">{item.name}</p>
                              <p className="text-white/40 text-[10px] uppercase tracking-[0.15em]">{item.category}</p>
                            </div>
                            {items.length > 1 && (
                              <button type="button" onClick={() => handleRemoveItem(item.vehicleId)} className="text-white/30 hover:text-red-400 transition-colors cursor-pointer" aria-label={`Remove ${item.name}`}>
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">Number of Cars</span>
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => updateQuantity(item.vehicleId, -1)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer">
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center text-white font-semibold">{item.quantity}</span>
                              <button type="button" onClick={() => updateQuantity(item.vehicleId, 1)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {availableToAdd.length > 0 && (
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">+ Add Another Vehicle</label>
                      <div className="flex gap-2">
                        <select
                          value={addVehicleId}
                          onChange={(e) => setAddVehicleId(e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                        >
                          <option value="">Select a vehicle</option>
                          {availableToAdd.map((v) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!addVehicleId}
                          onClick={handleAddVehicle}
                          className="bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white px-5 rounded-xl text-xs uppercase tracking-[0.15em] font-bold cursor-pointer transition-all"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Driver Preference</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['With Driver', 'Self Drive'] as const).map((d) => (
                        <button key={d} type="button" onClick={() => setDriverPreference(d)} className={pillClass(driverPreference === d)}>{d}</button>
                      ))}
                    </div>
                  </div>

                  {driverPreference === 'With Driver' && (
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Number of Passengers</label>
                      <input
                        type="text"
                        placeholder="Total passengers travelling"
                        value={passengerCount}
                        onChange={(e) => setPassengerCount(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                      />
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

              {/* STEP 2 — Trip Details */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Trip Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Within Port Harcourt', 'Inter-State'] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setTripType(t)} className={pillClass(tripType === t)}>{t}</button>
                      ))}
                    </div>
                    <p className="text-white/30 text-[11px] mt-2">Inter-State applies to trips that cross Rivers State lines.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Pickup Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Port Harcourt International Airport"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Destination</label>
                    <input
                      type="text"
                      placeholder="e.g. Hotel, event venue, office"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Date</label>
                      <input
                        type="date"
                        value={tripDate}
                        onChange={(e) => setTripDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Pickup Time</label>
                      <input
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 py-3.5 px-5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer">
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

              {/* STEP 3 — Special Requirements */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Special Requests <span className="normal-case text-white/30 font-normal">(optional)</span></label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIAL_REQUESTS.map((req) => (
                        <button
                          key={req}
                          type="button"
                          onClick={() => toggleSpecialRequest(req)}
                          className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                            specialRequests.includes(req)
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
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Anything Else We Should Know? <span className="normal-case text-white/30 font-normal">(optional)</span></label>
                    <textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      rows={3}
                      placeholder="Optional — tell us more about your trip"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(2)} className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 py-3.5 px-5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button type="button" onClick={() => setStep(4)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer">
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 — Customer Details */}
              {step === 4 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(3)} className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 py-3.5 px-5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      type="button"
                      disabled={!step4Valid}
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
                  <h3 className="font-serif text-2xl text-white font-light mb-1">Review Your Request</h3>
                  <p className="text-white/40 text-xs mb-6">Please review before submitting.</p>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3.5 mb-6">
                    {items.map((item) => (
                      <div key={item.vehicleId} className="flex justify-between items-start gap-4 text-sm">
                        <span className="text-white/40 text-[10px] uppercase tracking-[0.15em] font-bold pt-0.5 flex-shrink-0">Vehicle</span>
                        <span className="text-white text-right font-medium">{item.name} — Qty: {item.quantity}</span>
                      </div>
                    ))}
                    {[
                      ['Location', location],
                      ['Trip Type', tripType],
                      ['Driver', driverPreference],
                      ...(passengerCount.trim() ? [['Passengers', passengerCount.trim()]] : []),
                      ['Pickup', pickupLocation.trim()],
                      ['Destination', destination.trim()],
                      ['Date', formatDateTime(tripDate, pickupTime)],
                      ['Special Requests', specialRequests.length > 0 ? specialRequests.join(', ') : 'None'],
                      ...(additionalNotes.trim() ? [['Notes', additionalNotes.trim()]] : []),
                      ['Contact', `${fullName.trim()} · ${phone.trim()} · ${email.trim()}`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between items-start gap-4 text-sm">
                        <span className="text-white/40 text-[10px] uppercase tracking-[0.15em] font-bold pt-0.5 flex-shrink-0">{label}</span>
                        <span className="text-white text-right font-medium">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
                    {canCalculate ? (
                      <>
                        {estimateLines.map((line) => (
                          <div key={line.label} className="flex justify-between text-white/60 text-xs mb-2">
                            <span>{line.label}</span>
                            <span>₦{line.amount.toLocaleString('en-NG')}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-3 border-t border-white/10">
                          <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">Estimated Starting Price</span>
                          <span className="text-white font-serif text-lg font-semibold">₦{estimateTotal.toLocaleString('en-NG')}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-white/60 text-sm text-center py-1">Final price will be confirmed by Elite Booking.</p>
                    )}
                  </div>

                  <p className="text-white/30 text-[11px] leading-relaxed mb-6">
                    Vehicle availability and final pricing depend on your vehicles, location, date and requirements, and will be confirmed by our team.
                  </p>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(4)} className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 py-3.5 px-5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSubmit}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Car Request</>}
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
                    Your vehicle request has been received. Elite Booking will confirm vehicle availability and final pricing.
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
