import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Truck, X, ChevronLeft, ChevronRight, CheckCircle2, Loader2,
  Circle, MapPin
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface MovingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 'summary' | 'submitted';
type YesNo = '' | 'Yes' | 'No';

const MOVE_TYPES = ['House / Apartment', 'Office', 'Shop / Business', 'Household Items', 'Furniture', 'Other'];

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const STATUS_STAGES = ['New', 'Reviewing', 'Vehicle Sourcing', 'Quote Sent', 'Confirmed', 'Completed'];

function generateRequestId(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `EB-MOVE-${digits}`;
}

export function MovingRequestModal({ isOpen, onClose }: MovingRequestModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId, setRequestId] = useState('');

  // Step 1 — What's moving
  const [moveTypes, setMoveTypes] = useState<string[]>([]);

  // Step 2 — Pickup Location
  const [pickupState, setPickupState] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');

  // Step 3 — Drop-off Location
  const [dropoffState, setDropoffState] = useState('');
  const [dropoffCity, setDropoffCity] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');

  // Step 4 — Moving Details
  const [movingDate, setMovingDate] = useState('');
  const [movingTime, setMovingTime] = useState('');
  const [roomsItems, setRoomsItems] = useState('');
  const [pickupFloor, setPickupFloor] = useState('');
  const [dropoffFloor, setDropoffFloor] = useState('');
  const [elevatorAvailable, setElevatorAvailable] = useState<YesNo>('');
  const [heavyItems, setHeavyItems] = useState<YesNo>('');
  const [loadingAssistance, setLoadingAssistance] = useState<YesNo>('');
  const [unloadingAssistance, setUnloadingAssistance] = useState<YesNo>('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Step 5 — Customer Details
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setMoveTypes([]);
      setPickupState('');
      setPickupCity('');
      setPickupAddress('');
      setDropoffState('');
      setDropoffCity('');
      setDropoffAddress('');
      setMovingDate('');
      setMovingTime('');
      setRoomsItems('');
      setPickupFloor('');
      setDropoffFloor('');
      setElevatorAvailable('');
      setHeavyItems('');
      setLoadingAssistance('');
      setUnloadingAssistance('');
      setAdditionalNotes('');
      setFullName('');
      setPhone('');
      setEmail('');
      setRequestId('');
    }, 300);
  };

  const toggleMoveType = (label: string) => {
    setMoveTypes((prev) =>
      prev.includes(label) ? prev.filter((r) => r !== label) : [...prev, label]
    );
  };

  const step1Valid = moveTypes.length > 0;
  const step2Valid = pickupState.length > 0 && pickupCity.trim().length > 0 && pickupAddress.trim().length > 0;
  const step3Valid = dropoffState.length > 0 && dropoffCity.trim().length > 0 && dropoffAddress.trim().length > 0;
  const step4Valid = movingDate.length > 0 && movingTime.length > 0 && roomsItems.trim().length > 0 &&
    elevatorAvailable !== '' && heavyItems !== '' && loadingAssistance !== '' && unloadingAssistance !== '';
  const step5Valid = fullName.trim().length > 0 && phone.trim().length > 0;

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
      customerName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      moveTypes,
      pickupState,
      pickupCity: pickupCity.trim(),
      pickupAddress: pickupAddress.trim(),
      dropoffState,
      dropoffCity: dropoffCity.trim(),
      dropoffAddress: dropoffAddress.trim(),
      movingDate,
      movingTime,
      roomsItems: roomsItems.trim(),
      pickupFloor: pickupFloor.trim(),
      dropoffFloor: dropoffFloor.trim(),
      elevatorAvailable,
      heavyItems,
      loadingAssistance,
      unloadingAssistance,
      additionalNotes: additionalNotes.trim(),
      status: 'New',
      createdAt: new Date().toISOString(),
      source: 'Moving & Relocation Request Form',
    };

    const summaryText = `New Moving & Relocation Request (${newId})\n\nMoving: ${moveTypes.join(', ')}\nPickup: ${pickupAddress.trim()}, ${pickupCity.trim()}, ${pickupState}\nDrop-off: ${dropoffAddress.trim()}, ${dropoffCity.trim()}, ${dropoffState}\nDate: ${formatDateTime(movingDate, movingTime)}\nRooms/Items: ${roomsItems.trim()}\nFloor (Pickup): ${pickupFloor.trim() || 'N/A'}\nFloor (Drop-off): ${dropoffFloor.trim() || 'N/A'}\nElevator Available: ${elevatorAvailable}\nHeavy/Large Items: ${heavyItems}\nLoading Assistance: ${loadingAssistance}\nUnloading Assistance: ${unloadingAssistance}\nNotes: ${additionalNotes.trim() || 'None'}\n\nContact Name: ${fullName.trim()}\nContact Phone: ${phone.trim()}${email.trim() ? `\nContact Email: ${email.trim()}` : ''}`;

    const firestoreSave = addDoc(collection(db, 'moving_requests'), requestDetails).catch((err) => {
      console.warn('Firestore moving request save notice:', err);
    });

    const accessKey = localStorage.getItem('elite_web3forms_key') || (import.meta as any).env.VITE_WEB3FORMS_ACCESS_KEY;
    const targetEmail = localStorage.getItem('elite_notification_email') || 'Elitebooking.ng@gmail.com';

    const emailPromises: Promise<any>[] = [
      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: `Elite Moving Request ${newId}: ${pickupCity.trim()} to ${dropoffCity.trim()}`,
          _template: 'table',
          'Request ID': newId,
          'Moving': moveTypes.join(', '),
          'Pickup': `${pickupAddress.trim()}, ${pickupCity.trim()}, ${pickupState}`,
          'Drop-off': `${dropoffAddress.trim()}, ${dropoffCity.trim()}, ${dropoffState}`,
          'Moving Date': formatDateTime(movingDate, movingTime),
          'Rooms/Items': roomsItems.trim(),
          'Floor (Pickup)': pickupFloor.trim() || 'N/A',
          'Floor (Drop-off)': dropoffFloor.trim() || 'N/A',
          'Elevator Available': elevatorAvailable,
          'Heavy/Large Items': heavyItems,
          'Loading Assistance': loadingAssistance,
          'Unloading Assistance': unloadingAssistance,
          'Notes': additionalNotes.trim() || 'None',
          'Contact Name': fullName.trim(),
          'Contact Phone': phone.trim(),
          'Contact Email': email.trim() || 'Not provided',
          'Full Message': summaryText,
        }),
      }).catch((err) => console.warn('FormSubmit moving request notice:', err)),
    ];

    if (accessKey && accessKey.trim() !== '') {
      emailPromises.push(
        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: accessKey,
            subject: `Elite Moving Request ${newId}: ${pickupCity.trim()} to ${dropoffCity.trim()}`,
            from_name: 'Elite Bookings Moving & Relocation',
            to_email: targetEmail,
            message: summaryText,
            phone: phone.trim(),
          }),
        }).catch((err) => console.warn('Web3Forms moving request notice:', err))
      );
    }

    await Promise.allSettled([firestoreSave, ...emailPromises]);

    setRequestId(newId);
    setIsSubmitting(false);
    setStep('submitted');
  };

  const whatsappFallbackHref = `https://wa.me/2347072253857?text=${encodeURIComponent(
    `Hello Elite Booking! 🚚\n\nI just submitted a moving request (${requestId}):\n- Moving: ${moveTypes.join(', ')}\n- Pickup: ${pickupCity.trim()}, ${pickupState}\n- Drop-off: ${dropoffCity.trim()}, ${dropoffState}\n- Date: ${formatDateTime(movingDate, movingTime)}\n\nName: ${fullName.trim()}\nPhone: ${phone.trim()}`
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
                <Truck className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 text-[10px] uppercase tracking-[0.35em] font-bold">Moving &amp; Relocation</span>
              </div>
              <p className="text-white/40 text-[11px] mb-6">
                Tell us what you're moving, and we'll arrange the right vehicle for your move.
              </p>

              {(step === 1 || step === 2 || step === 3 || step === 4 || step === 5) && (
                <>
                  <h3 className="font-serif text-2xl text-white font-light mb-1">Request a Move</h3>
                  <p className="text-white/40 text-xs mb-6">Step {step} of 5</p>
                  <div className="flex gap-1.5 mb-8">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div
                        key={s}
                        className={`h-[3px] flex-1 rounded-full transition-colors ${s <= step ? 'bg-blue-500' : 'bg-white/10'}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* STEP 1 — What are you moving */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">
                      What Are You Moving? <span className="normal-case text-white/30 font-normal">(select all that apply)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {MOVE_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleMoveType(type)}
                          className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            moveTypes.includes(type)
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

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

              {/* STEP 2 — Pickup Location */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Pickup State</label>
                    <select
                      value={pickupState}
                      onChange={(e) => setPickupState(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                    >
                      <option value="" disabled>Select state</option>
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Pickup City</label>
                    <input
                      type="text"
                      placeholder="e.g. Ikeja, Wuse, GRA"
                      value={pickupCity}
                      onChange={(e) => setPickupCity(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Full Pickup Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="House number, street, landmark"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                      />
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

              {/* STEP 3 — Drop-off Location */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Drop-off State</label>
                    <select
                      value={dropoffState}
                      onChange={(e) => setDropoffState(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                    >
                      <option value="" disabled>Select state</option>
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Drop-off City</label>
                    <input
                      type="text"
                      placeholder="e.g. Ikeja, Wuse, GRA"
                      value={dropoffCity}
                      onChange={(e) => setDropoffCity(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Full Destination Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="House number, street, landmark"
                        value={dropoffAddress}
                        onChange={(e) => setDropoffAddress(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
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
                      onClick={() => setStep(4)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 — Moving Details */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Moving Date</label>
                      <input
                        type="date"
                        value={movingDate}
                        onChange={(e) => setMovingDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Preferred Time</label>
                      <input
                        type="time"
                        value={movingTime}
                        onChange={(e) => setMovingTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Number of Rooms / Items</label>
                    <input
                      type="text"
                      placeholder="e.g. 3-bedroom apartment, or list key items"
                      value={roomsItems}
                      onChange={(e) => setRoomsItems(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Floor at Pickup <span className="normal-case text-white/30 font-normal">(optional)</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Ground Floor"
                        value={pickupFloor}
                        onChange={(e) => setPickupFloor(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Floor at Destination <span className="normal-case text-white/30 font-normal">(optional)</span></label>
                      <input
                        type="text"
                        placeholder="e.g. 2nd Floor"
                        value={dropoffFloor}
                        onChange={(e) => setDropoffFloor(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Elevator Available?</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Yes', 'No'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setElevatorAvailable(v)}
                            className={`py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                              elevatorAvailable === v
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Heavy / Large Items?</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Yes', 'No'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setHeavyItems(v)}
                            className={`py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                              heavyItems === v
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Loading Assistance?</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Yes', 'No'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setLoadingAssistance(v)}
                            className={`py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                              loadingAssistance === v
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Unloading Assistance?</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Yes', 'No'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setUnloadingAssistance(v)}
                            className={`py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                              unloadingAssistance === v
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Additional Information <span className="normal-case text-white/30 font-normal">(optional)</span></label>
                    <textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      rows={3}
                      placeholder="Describe special items — beds, wardrobes, refrigerators, washing machines, sofas, tables, office equipment, etc."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

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
                      disabled={!step4Valid}
                      onClick={() => setStep(5)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5 — Customer Details */}
              {step === 5 && (
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
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Email Address <span className="normal-case text-white/30 font-normal">(optional)</span></label>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 py-3.5 px-5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      type="button"
                      disabled={!step5Valid}
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
                  <h3 className="font-serif text-2xl text-white font-light mb-1">Your Move Request</h3>
                  <p className="text-white/40 text-xs mb-6">Please review before submitting.</p>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3.5 mb-6">
                    {[
                      ['Moving', moveTypes.join(', ')],
                      ['Pickup', `${pickupAddress.trim()}, ${pickupCity.trim()}, ${pickupState}`],
                      ['Drop-off', `${dropoffAddress.trim()}, ${dropoffCity.trim()}, ${dropoffState}`],
                      ['Date', formatDateTime(movingDate, movingTime)],
                      ['Rooms / Items', roomsItems.trim()],
                      ...(pickupFloor.trim() ? [['Floor (Pickup)', pickupFloor.trim()]] : []),
                      ...(dropoffFloor.trim() ? [['Floor (Destination)', dropoffFloor.trim()]] : []),
                      ['Elevator Available', elevatorAvailable],
                      ['Heavy / Large Items', heavyItems],
                      ['Loading Assistance', loadingAssistance],
                      ['Unloading Assistance', unloadingAssistance],
                      ...(additionalNotes.trim() ? [['Notes', additionalNotes.trim()]] : []),
                      ['Contact', `${fullName.trim()} · ${phone.trim()}${email.trim() ? ` · ${email.trim()}` : ''}`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between items-start gap-4 text-sm">
                        <span className="text-white/40 text-[10px] uppercase tracking-[0.15em] font-bold pt-0.5 flex-shrink-0">{label}</span>
                        <span className="text-white text-right font-medium">{value}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-white/30 text-[11px] leading-relaxed mb-6">
                    Vehicle availability and final pricing depend on your locations, moving date and item details, and will be confirmed by our team.
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(5)}
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
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Move Request</>}
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
                    Thank you. Elite Booking is checking the availability of the appropriate moving vehicle and moving assistance for your request. Our team will contact you with the available option and quotation.
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
