import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import type { ServiceType } from '../types/trip';
import { REQUIRED_FIELDS } from '../utils/serviceRequiredFields';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceType: ServiceType | null;
  onAdd: (type: ServiceType, details: Record<string, any>, summary: string) => Promise<string>;
}

const inputClass = 'w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors';
const labelClass = 'block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2';
const pillClass = (active: boolean) =>
  `px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
    active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
  }`;

const VEHICLE_CATEGORIES = ['Sedan', 'SUV', 'Luxury', 'Van', 'Bus', 'Pickup'];

export const AddServiceModal: React.FC<AddServiceModalProps> = ({ isOpen, onClose, serviceType, onAdd }) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Airport Pickup
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [bags, setBags] = useState('1');
  const [vehiclePref, setVehiclePref] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Car Rental
  const [vehicleCategory, setVehicleCategory] = useState('Sedan');
  const [carPickupDate, setCarPickupDate] = useState('');
  const [carReturnDate, setCarReturnDate] = useState('');
  const [carPickupLocation, setCarPickupLocation] = useState('');
  const [carPickupTime, setCarPickupTime] = useState('');
  const [driverPref, setDriverPref] = useState<'Self Drive' | 'With Driver'>('With Driver');
  const [vehicleCount, setVehicleCount] = useState('1');
  const [carRequirements, setCarRequirements] = useState('');

  // Private Jet
  const [jetDeparture, setJetDeparture] = useState('');
  const [jetDestination, setJetDestination] = useState('');
  const [jetDate, setJetDate] = useState('');
  const [jetPassengers, setJetPassengers] = useState('1');
  const [jetAircraftPref, setJetAircraftPref] = useState('No preference');
  const [jetRequirements, setJetRequirements] = useState('');

  // Driver
  const [driverDates, setDriverDates] = useState('');
  const [driverHours, setDriverHours] = useState('');
  const [driverLocation, setDriverLocation] = useState('');
  const [driverRequirements, setDriverRequirements] = useState('');

  // Restaurant / Dining
  const [restaurantDate, setRestaurantDate] = useState('');
  const [restaurantTime, setRestaurantTime] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [cuisine, setCuisine] = useState('');
  const [occasion, setOccasion] = useState('');

  // Shortlet (as add-on)
  const [shortletLocation, setShortletLocation] = useState('');
  const [shortletCheckin, setShortletCheckin] = useState('');
  const [shortletCheckout, setShortletCheckout] = useState('');
  const [shortletGuests, setShortletGuests] = useState('2');

  // Yacht / Experiences
  const [yachtDate, setYachtDate] = useState('');
  const [yachtDuration, setYachtDuration] = useState('');
  const [yachtGuests, setYachtGuests] = useState('2');
  const [yachtOccasion, setYachtOccasion] = useState('');

  // Moving & Logistics
  const [moveDate, setMoveDate] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [moveVolume, setMoveVolume] = useState('');

  // Truck
  const [truckDate, setTruckDate] = useState('');
  const [truckPickupAddress, setTruckPickupAddress] = useState('');
  const [truckDropoffAddress, setTruckDropoffAddress] = useState('');
  const [truckLoadDescription, setTruckLoadDescription] = useState('');

  // Forklift
  const [forkliftDate, setForkliftDate] = useState('');
  const [forkliftLocation, setForkliftLocation] = useState('');
  const [forkliftLoadWeight, setForkliftLoadWeight] = useState('');
  const [forkliftRequirements, setForkliftRequirements] = useState('');

  // Concierge / Other
  const [freeText, setFreeText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setPickupLocation(''); setPickupDate(''); setPickupTime(''); setPassengers('1'); setBags('1'); setVehiclePref(''); setSpecialInstructions('');
      setVehicleCategory('Sedan'); setCarPickupDate(''); setCarReturnDate(''); setCarPickupLocation(''); setCarPickupTime(''); setDriverPref('With Driver'); setVehicleCount('1'); setCarRequirements('');
      setJetDeparture(''); setJetDestination(''); setJetDate(''); setJetPassengers('1'); setJetAircraftPref('No preference'); setJetRequirements('');
      setDriverDates(''); setDriverHours(''); setDriverLocation(''); setDriverRequirements('');
      setRestaurantDate(''); setRestaurantTime(''); setPartySize('2'); setCuisine(''); setOccasion('');
      setShortletLocation(''); setShortletCheckin(''); setShortletCheckout(''); setShortletGuests('2');
      setYachtDate(''); setYachtDuration(''); setYachtGuests('2'); setYachtOccasion('');
      setMoveDate(''); setPickupAddress(''); setDropoffAddress(''); setMoveVolume('');
      setTruckDate(''); setTruckPickupAddress(''); setTruckDropoffAddress(''); setTruckLoadDescription('');
      setForkliftDate(''); setForkliftLocation(''); setForkliftLoadWeight(''); setForkliftRequirements('');
      setFreeText('');
    }
  }, [isOpen, serviceType]);

  if (!isOpen || !serviceType) return null;

  const buildPayload = (): { details: Record<string, any>; summary: string } => {
    switch (serviceType) {
      case 'Airport Pickup':
        return {
          details: { pickupLocation, pickupDate, pickupTime, passengers, bags, vehiclePref, specialInstructions },
          summary: `Airport Pickup — ${pickupLocation || 'Location TBC'}, ${pickupDate || 'date TBC'}${pickupTime ? ` ${pickupTime}` : ''}`,
        };
      case 'Car Rental':
        return {
          details: { vehicleCategory, pickupDate: carPickupDate, returnDate: carReturnDate, pickupLocation: carPickupLocation, pickupTime: carPickupTime, driverPreference: driverPref, vehicleCount, requirements: carRequirements },
          summary: `${vehicleCategory} × ${vehicleCount} (${driverPref}) — ${carPickupDate || 'date TBC'}`,
        };
      case 'Private Jet':
        return {
          details: { departure: jetDeparture, destination: jetDestination, date: jetDate, passengers: jetPassengers, aircraftPreference: jetAircraftPref, requirements: jetRequirements },
          summary: `Private Jet — ${jetDeparture || 'departure TBC'} → ${jetDestination || 'destination TBC'}, ${jetDate || 'date TBC'}`,
        };
      case 'Driver':
        return {
          details: { dates: driverDates, hoursPerDay: driverHours, location: driverLocation, requirements: driverRequirements },
          summary: `Driver — ${driverDates || 'dates TBC'}${driverLocation ? `, ${driverLocation}` : ''}`,
        };
      case 'Restaurant':
        return {
          details: { date: restaurantDate, time: restaurantTime, partySize, cuisine, occasion },
          summary: `Restaurant — ${restaurantDate || 'date TBC'}${restaurantTime ? ` ${restaurantTime}` : ''}, party of ${partySize}`,
        };
      case 'Shortlet':
        return {
          details: { location: shortletLocation, checkin: shortletCheckin, checkout: shortletCheckout, guests: shortletGuests },
          summary: `Shortlet — ${shortletLocation || 'location TBC'}, ${shortletCheckin || 'dates TBC'}`,
        };
      case 'Yacht':
        return {
          details: { date: yachtDate, duration: yachtDuration, guests: yachtGuests, occasion: yachtOccasion },
          summary: `Yacht/Experience — ${yachtDate || 'date TBC'}, ${yachtGuests} guests`,
        };
      case 'Moving & Logistics':
        return {
          details: { moveDate, pickupAddress, dropoffAddress, volume: moveVolume },
          summary: `Moving & Logistics — ${pickupAddress || 'pickup TBC'} → ${dropoffAddress || 'destination TBC'}`,
        };
      case 'Truck':
        return {
          details: { date: truckDate, pickupAddress: truckPickupAddress, dropoffAddress: truckDropoffAddress, loadDescription: truckLoadDescription },
          summary: `Truck — ${truckPickupAddress || 'pickup TBC'} → ${truckDropoffAddress || 'destination TBC'}, ${truckDate || 'date TBC'}`,
        };
      case 'Forklift':
        return {
          details: { date: forkliftDate, location: forkliftLocation, loadWeight: forkliftLoadWeight, requirements: forkliftRequirements },
          summary: `Forklift — ${forkliftLocation || 'location TBC'}, ${forkliftDate || 'date TBC'}`,
        };
      case 'Concierge':
        return { details: { request: freeText }, summary: `Concierge — ${freeText.slice(0, 60)}${freeText.length > 60 ? '…' : ''}` };
      case 'Other':
      default:
        return { details: { request: freeText }, summary: `Other Request — ${freeText.slice(0, 60)}${freeText.length > 60 ? '…' : ''}` };
    }
  };

  const isValid = (() => {
    const { details: liveDetails } = buildPayload();
    return REQUIRED_FIELDS[serviceType].every((key) => !!String((liveDetails as any)[key] ?? '').trim());
  })();

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { details, summary } = buildPayload();
      await onAdd(serviceType, details, summary);
      setSubmitted(true);
    } catch (err) {
      console.error('Error adding service to trip:', err);
    } finally {
      setSubmitting(false);
    }
  };

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
                  <span className="text-blue-400 text-[10px] uppercase tracking-[0.35em] font-bold">Add to My Trip</span>
                </div>
                <h3 className="font-serif text-2xl text-white font-light mb-6">{serviceType}</h3>

                <div className="space-y-4">
                  {serviceType === 'Airport Pickup' && (
                    <>
                      <div><label className={labelClass}>Pickup Location</label><input type="text" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} placeholder="e.g. Lagos Airport (MMIA)" className={inputClass} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Pickup Date</label><input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className={inputClass} /></div>
                        <div><label className={labelClass}>Pickup Time</label><input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className={inputClass} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Passengers</label><input type="number" min={1} value={passengers} onChange={(e) => setPassengers(e.target.value)} className={inputClass} /></div>
                        <div><label className={labelClass}>Bags</label><input type="number" min={0} value={bags} onChange={(e) => setBags(e.target.value)} className={inputClass} /></div>
                      </div>
                      <div><label className={labelClass}>Vehicle Preference (optional)</label><input type="text" value={vehiclePref} onChange={(e) => setVehiclePref(e.target.value)} placeholder="e.g. SUV" className={inputClass} /></div>
                      <div><label className={labelClass}>Special Instructions (optional)</label><textarea rows={2} value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} className={inputClass} /></div>
                    </>
                  )}

                  {serviceType === 'Car Rental' && (
                    <>
                      <div>
                        <label className={labelClass}>Vehicle Category</label>
                        <div className="flex flex-wrap gap-2">
                          {VEHICLE_CATEGORIES.map((c) => (
                            <button key={c} type="button" onClick={() => setVehicleCategory(c)} className={pillClass(vehicleCategory === c)}>{c}</button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Pickup Date</label><input type="date" value={carPickupDate} onChange={(e) => setCarPickupDate(e.target.value)} className={inputClass} /></div>
                        <div><label className={labelClass}>Return Date</label><input type="date" value={carReturnDate} onChange={(e) => setCarReturnDate(e.target.value)} className={inputClass} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Pickup Location</label><input type="text" value={carPickupLocation} onChange={(e) => setCarPickupLocation(e.target.value)} className={inputClass} /></div>
                        <div><label className={labelClass}>Pickup Time</label><input type="time" value={carPickupTime} onChange={(e) => setCarPickupTime(e.target.value)} className={inputClass} /></div>
                      </div>
                      <div>
                        <label className={labelClass}>Driver Preference</label>
                        <div className="flex gap-2">
                          {(['With Driver', 'Self Drive'] as const).map((o) => (
                            <button key={o} type="button" onClick={() => setDriverPref(o)} className={pillClass(driverPref === o)}>{o}</button>
                          ))}
                        </div>
                      </div>
                      <div><label className={labelClass}>Number of Vehicles</label><input type="number" min={1} value={vehicleCount} onChange={(e) => setVehicleCount(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Special Requirements (optional)</label><textarea rows={2} value={carRequirements} onChange={(e) => setCarRequirements(e.target.value)} className={inputClass} /></div>
                    </>
                  )}

                  {serviceType === 'Private Jet' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Departure City</label><input type="text" value={jetDeparture} onChange={(e) => setJetDeparture(e.target.value)} placeholder="e.g. Lagos" className={inputClass} /></div>
                        <div><label className={labelClass}>Destination</label><input type="text" value={jetDestination} onChange={(e) => setJetDestination(e.target.value)} placeholder="e.g. Abuja" className={inputClass} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Date</label><input type="date" value={jetDate} onChange={(e) => setJetDate(e.target.value)} className={inputClass} /></div>
                        <div><label className={labelClass}>Passengers</label><input type="number" min={1} value={jetPassengers} onChange={(e) => setJetPassengers(e.target.value)} className={inputClass} /></div>
                      </div>
                      <div>
                        <label className={labelClass}>Aircraft Preference</label>
                        <div className="flex flex-wrap gap-2">
                          {['No preference', 'Light Jet', 'Midsize Jet', 'Heavy Jet'].map((o) => (
                            <button key={o} type="button" onClick={() => setJetAircraftPref(o)} className={pillClass(jetAircraftPref === o)}>{o}</button>
                          ))}
                        </div>
                      </div>
                      <div><label className={labelClass}>Special Requirements (optional)</label><textarea rows={2} value={jetRequirements} onChange={(e) => setJetRequirements(e.target.value)} className={inputClass} /></div>
                    </>
                  )}

                  {serviceType === 'Driver' && (
                    <>
                      <div><label className={labelClass}>Dates Needed</label><input type="text" value={driverDates} onChange={(e) => setDriverDates(e.target.value)} placeholder="e.g. Sept 10-13" className={inputClass} /></div>
                      <div><label className={labelClass}>Hours per Day</label><input type="text" value={driverHours} onChange={(e) => setDriverHours(e.target.value)} placeholder="e.g. 8am - 8pm" className={inputClass} /></div>
                      <div><label className={labelClass}>Primary Location</label><input type="text" value={driverLocation} onChange={(e) => setDriverLocation(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Special Requirements (optional)</label><textarea rows={2} value={driverRequirements} onChange={(e) => setDriverRequirements(e.target.value)} className={inputClass} /></div>
                    </>
                  )}

                  {serviceType === 'Restaurant' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Date</label><input type="date" value={restaurantDate} onChange={(e) => setRestaurantDate(e.target.value)} className={inputClass} /></div>
                        <div><label className={labelClass}>Time</label><input type="time" value={restaurantTime} onChange={(e) => setRestaurantTime(e.target.value)} className={inputClass} /></div>
                      </div>
                      <div><label className={labelClass}>Party Size</label><input type="number" min={1} value={partySize} onChange={(e) => setPartySize(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Cuisine Preference (optional)</label><input type="text" value={cuisine} onChange={(e) => setCuisine(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Occasion (optional)</label><input type="text" value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="e.g. Anniversary" className={inputClass} /></div>
                    </>
                  )}

                  {serviceType === 'Shortlet' && (
                    <>
                      <div><label className={labelClass}>Location</label><input type="text" value={shortletLocation} onChange={(e) => setShortletLocation(e.target.value)} className={inputClass} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Check-in</label><input type="date" value={shortletCheckin} onChange={(e) => setShortletCheckin(e.target.value)} className={inputClass} /></div>
                        <div><label className={labelClass}>Check-out</label><input type="date" value={shortletCheckout} onChange={(e) => setShortletCheckout(e.target.value)} className={inputClass} /></div>
                      </div>
                      <div><label className={labelClass}>Guests</label><input type="number" min={1} value={shortletGuests} onChange={(e) => setShortletGuests(e.target.value)} className={inputClass} /></div>
                    </>
                  )}

                  {serviceType === 'Yacht' && (
                    <>
                      <div><label className={labelClass}>Date</label><input type="date" value={yachtDate} onChange={(e) => setYachtDate(e.target.value)} className={inputClass} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Duration</label><input type="text" value={yachtDuration} onChange={(e) => setYachtDuration(e.target.value)} placeholder="e.g. 4 hours" className={inputClass} /></div>
                        <div><label className={labelClass}>Guests</label><input type="number" min={1} value={yachtGuests} onChange={(e) => setYachtGuests(e.target.value)} className={inputClass} /></div>
                      </div>
                      <div><label className={labelClass}>Occasion (optional)</label><input type="text" value={yachtOccasion} onChange={(e) => setYachtOccasion(e.target.value)} className={inputClass} /></div>
                    </>
                  )}

                  {serviceType === 'Moving & Logistics' && (
                    <>
                      <div><label className={labelClass}>Move Date</label><input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Pickup Address</label><input type="text" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Drop-off Address</label><input type="text" value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Approximate Volume / Items (optional)</label><textarea rows={2} value={moveVolume} onChange={(e) => setMoveVolume(e.target.value)} placeholder="e.g. 2-bedroom apartment, no large furniture" className={inputClass} /></div>
                    </>
                  )}

                  {serviceType === 'Truck' && (
                    <>
                      <div><label className={labelClass}>Date</label><input type="date" value={truckDate} onChange={(e) => setTruckDate(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Pickup Address</label><input type="text" value={truckPickupAddress} onChange={(e) => setTruckPickupAddress(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Drop-off Address</label><input type="text" value={truckDropoffAddress} onChange={(e) => setTruckDropoffAddress(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Load Description (optional)</label><textarea rows={2} value={truckLoadDescription} onChange={(e) => setTruckLoadDescription(e.target.value)} placeholder="e.g. Building materials, approx. 3 tons" className={inputClass} /></div>
                    </>
                  )}

                  {serviceType === 'Forklift' && (
                    <>
                      <div><label className={labelClass}>Date</label><input type="date" value={forkliftDate} onChange={(e) => setForkliftDate(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Site Location</label><input type="text" value={forkliftLocation} onChange={(e) => setForkliftLocation(e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Load Weight Estimate (optional)</label><input type="text" value={forkliftLoadWeight} onChange={(e) => setForkliftLoadWeight(e.target.value)} placeholder="e.g. 2 tons" className={inputClass} /></div>
                      <div><label className={labelClass}>Special Requirements (optional)</label><textarea rows={2} value={forkliftRequirements} onChange={(e) => setForkliftRequirements(e.target.value)} className={inputClass} /></div>
                    </>
                  )}

                  {(serviceType === 'Concierge' || serviceType === 'Other') && (
                    <div>
                      <label className={labelClass}>{serviceType === 'Concierge' ? "Tell us what you need" : 'Describe your request'}</label>
                      <textarea
                        rows={4}
                        value={freeText}
                        onChange={(e) => setFreeText(e.target.value)}
                        placeholder={serviceType === 'Concierge' ? 'e.g. "I need a restaurant reservation for Friday night."' : 'Tell us what you need and we\'ll help arrange it.'}
                        className={inputClass}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!isValid || submitting}
                    onClick={handleSubmit}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Add ${serviceType} to My Trip`}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="font-serif text-xl text-white font-light">Added to Your Trip</h3>
                <p className="text-white/40 text-xs mt-1 mb-6">{serviceType} is now part of your trip — awaiting confirmation.</p>
                <button type="button" onClick={onClose} className="w-full py-3.5 bg-white/5 border border-white/10 text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-xl cursor-pointer">
                  Back to My Trip
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
