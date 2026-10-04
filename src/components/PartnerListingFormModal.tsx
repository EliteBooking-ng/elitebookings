import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, CheckCircle2, Loader2, Home } from 'lucide-react';
import { db } from '../firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  LISTING_CATEGORIES, LISTING_CITIES,
  type PartnerListing, type ListingCategory, type ListingCity
} from '../types/partnerListing';

interface PartnerListingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingListing: PartnerListing | null; // null = creating a new listing
  ownerUid: string;
  ownerEmail: string;
}

type Step = 1 | 2 | 3 | 'summary' | 'submitted';

const inputClass = 'w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors';
const labelClass = 'block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2';
const pillClass = (active: boolean) =>
  `px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
    active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
  }`;

export const PartnerListingFormModal: React.FC<PartnerListingFormModalProps> = ({ isOpen, onClose, editingListing, ownerUid, ownerEmail }) => {
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [category, setCategory] = useState<ListingCategory>('Hotel');
  const [city, setCity] = useState<ListingCity>('Lagos');
  const [location, setLocation] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imagesText, setImagesText] = useState('');

  // Hotel-only
  const [tiers, setTiers] = useState<{ name: string; price: string }[]>([]);
  const [note, setNote] = useState('');

  // Shortlet-only
  const [cautionFee, setCautionFee] = useState('');
  const [featuresText, setFeaturesText] = useState('');

  // Car Rental-only
  const [vehicleType, setVehicleType] = useState<'Sedan' | 'SUV' | 'Luxury' | 'Van' | 'Bus' | 'Pickup'>('Sedan');
  const [transmission, setTransmission] = useState<'Automatic' | 'Manual'>('Automatic');
  const [seats, setSeats] = useState('4');
  const [airConditioning, setAirConditioning] = useState(true);
  const [driverOptions, setDriverOptions] = useState<('With Driver' | 'Self Drive')[]>(['With Driver']);
  const [pricingType, setPricingType] = useState<'day' | 'trip' | 'custom-quote'>('day');

  useEffect(() => {
    if (!isOpen) return;
    if (editingListing) {
      setCategory(editingListing.category);
      setCity(editingListing.city);
      setLocation(editingListing.location);
      setName(editingListing.name);
      setDescription(editingListing.description);
      setPrice(editingListing.price);
      setImagesText((editingListing.images || []).join('\n'));
      setTiers(editingListing.tiers || []);
      setNote(editingListing.note || '');
      setCautionFee(editingListing.cautionFee || '');
      setFeaturesText((editingListing.features || []).join(', '));
      setVehicleType(editingListing.vehicleType || 'Sedan');
      setTransmission(editingListing.transmission || 'Automatic');
      setSeats(editingListing.seats != null ? String(editingListing.seats) : '4');
      setAirConditioning(editingListing.airConditioning ?? true);
      setDriverOptions(editingListing.driverOptions || ['With Driver']);
      setPricingType(editingListing.pricingType || 'day');
    } else {
      setCategory('Hotel');
      setCity('Lagos');
      setLocation('');
      setName('');
      setDescription('');
      setPrice('');
      setImagesText('');
      setTiers([]);
      setNote('');
      setCautionFee('');
      setFeaturesText('');
      setVehicleType('Sedan');
      setTransmission('Automatic');
      setSeats('4');
      setAirConditioning(true);
      setDriverOptions(['With Driver']);
      setPricingType('day');
    }
    setStep(1);
  }, [isOpen, editingListing]);

  const resetAndClose = () => {
    setTimeout(() => setStep(1), 300);
    onClose();
  };

  const toggleDriverOption = (opt: 'With Driver' | 'Self Drive') => {
    setDriverOptions((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  };

  const addTier = () => setTiers((prev) => [...prev, { name: '', price: '' }]);
  const updateTier = (i: number, field: 'name' | 'price', value: string) =>
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i));

  const step1Valid = !!location.trim();
  const step2Valid = !!name.trim() && !!description.trim();
  const step3Valid = !!price.trim() && imagesText.trim().split('\n').filter((l) => l.trim()).length > 0;

  const buildPayload = () => {
    const images = imagesText.split('\n').map((l) => l.trim()).filter(Boolean);
    const base = {
      ownerUid,
      ownerEmail,
      category,
      name: name.trim(),
      location: location.trim(),
      city,
      description: description.trim(),
      images,
      price: price.trim(),
      updatedAt: serverTimestamp()
    };
    if (category === 'Hotel') {
      return { ...base, tiers: tiers.filter((t) => t.name.trim() && t.price.trim()), note: note.trim() || undefined };
    }
    if (category === 'Shortlet') {
      return { ...base, cautionFee: cautionFee.trim() || undefined, features: featuresText.split(',').map((f) => f.trim()).filter(Boolean) };
    }
    return {
      ...base,
      vehicleType,
      transmission,
      seats: parseInt(seats, 10) || undefined,
      airConditioning,
      driverOptions,
      pricingType
    };
  };

  const notifyAdminOfSubmission = () => {
    const targetEmail = localStorage.getItem('elite_notification_email') || 'Elitebooking.ng@gmail.com';
    fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: `New Partner Listing Pending Review: ${name}`,
        _template: 'table',
        'Category': category,
        'Listing Name': name,
        'City': city,
        'Owner Email': ownerEmail,
        'Price': price,
        'Source': 'Partner Self-Service Listing'
      })
    }).catch((err) => console.warn('Partner listing admin-notification email failed:', err));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      if (editingListing) {
        // Resubmitting a rejected listing moves it back to pending for re-review;
        // an approved or already-pending listing keeps its current status —
        // matches firestore.rules, which forbids a partner from setting status
        // to 'approved' and only allows the rejected->pending transition.
        const statusUpdate = editingListing.status === 'rejected' ? { status: 'pending', rejectionReason: '' } : {};
        await updateDoc(doc(db, 'partner_listings', editingListing.id), { ...payload, ...statusUpdate });
        if (statusUpdate.status === 'pending') notifyAdminOfSubmission();
      } else {
        await addDoc(collection(db, 'partner_listings'), {
          ...payload,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        notifyAdminOfSubmission();
      }
      setStep('submitted');
    } catch (err) {
      console.error('Error saving partner listing:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
              <Home className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-[10px] uppercase tracking-[0.35em] font-bold">
                {editingListing ? 'Edit Listing' : 'New Listing'}
              </span>
            </div>
            <p className="text-white/40 text-[11px] mb-6">
              {editingListing?.status === 'approved'
                ? 'Changes save immediately — no re-review needed.'
                : 'New listings are reviewed by our team before going live.'}
            </p>

            {(step === 1 || step === 2 || step === 3) && (
              <>
                <h3 className="font-serif text-2xl text-white font-light mb-1">
                  {editingListing ? 'Edit Your Listing' : 'List Your Property'}
                </h3>
                <p className="text-white/40 text-xs mb-6">Step {step} of 3</p>
                <div className="flex gap-1.5 mb-8">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className={`h-[3px] flex-1 rounded-full transition-colors ${s <= step ? 'bg-blue-500' : 'bg-white/10'}`} />
                  ))}
                </div>
              </>
            )}

            {/* STEP 1 — Category + Location */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Category</label>
                  <div className="flex flex-wrap gap-2">
                    {LISTING_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        disabled={!!editingListing}
                        onClick={() => setCategory(cat)}
                        className={`${pillClass(category === cat)} ${editingListing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>City</label>
                  <div className="flex flex-wrap gap-2">
                    {LISTING_CITIES.map((c) => (
                      <button key={c} type="button" onClick={() => setCity(c)} className={pillClass(city === c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Full Address / Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. 12 Admiralty Way, Lekki Phase 1"
                    className={inputClass}
                  />
                </div>

                <button
                  type="button"
                  disabled={!step1Valid}
                  onClick={() => setStep(2)}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 2 — Category-specific details */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Listing Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={category === 'Car Rental' ? 'e.g. Toyota Camry 2022' : 'e.g. Sunrise Suites'}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What makes this place/vehicle worth booking?"
                    className={inputClass}
                  />
                </div>

                {category === 'Hotel' && (
                  <>
                    <div>
                      <label className={labelClass}>Room Tiers (optional)</label>
                      <div className="space-y-2">
                        {tiers.map((t, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="text" value={t.name} onChange={(e) => updateTier(i, 'name', e.target.value)} placeholder="Tier name (e.g. Deluxe)" className={inputClass} />
                            <input type="text" value={t.price} onChange={(e) => updateTier(i, 'price', e.target.value)} placeholder="Price" className={inputClass} />
                            <button type="button" onClick={() => removeTier(i)} className="w-10 h-10 flex-shrink-0 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-red-400 flex items-center justify-center cursor-pointer">
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={addTier} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 cursor-pointer">
                          <Plus className="w-3.5 h-3.5" /> Add a room tier
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Note (optional)</label>
                      <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else guests should know" className={inputClass} />
                    </div>
                  </>
                )}

                {category === 'Shortlet' && (
                  <>
                    <div>
                      <label className={labelClass}>Caution Fee (optional)</label>
                      <input type="text" value={cautionFee} onChange={(e) => setCautionFee(e.target.value)} placeholder="e.g. 50,000" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Features (comma-separated)</label>
                      <input type="text" value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} placeholder="e.g. Pool, WiFi, 24/7 Power" className={inputClass} />
                    </div>
                  </>
                )}

                {category === 'Car Rental' && (
                  <>
                    <div>
                      <label className={labelClass}>Vehicle Type</label>
                      <div className="flex flex-wrap gap-2">
                        {(['Sedan', 'SUV', 'Luxury', 'Van', 'Bus', 'Pickup'] as const).map((t) => (
                          <button key={t} type="button" onClick={() => setVehicleType(t)} className={pillClass(vehicleType === t)}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Transmission</label>
                        <div className="flex gap-2">
                          {(['Automatic', 'Manual'] as const).map((t) => (
                            <button key={t} type="button" onClick={() => setTransmission(t)} className={pillClass(transmission === t)}>{t}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Seats</label>
                        <input type="number" min={1} max={60} value={seats} onChange={(e) => setSeats(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Driver Options</label>
                      <div className="flex gap-2">
                        {(['With Driver', 'Self Drive'] as const).map((o) => (
                          <button key={o} type="button" onClick={() => toggleDriverOption(o)} className={pillClass(driverOptions.includes(o))}>{o}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className={labelClass + ' mb-0'}>Air Conditioning</label>
                      <button type="button" onClick={() => setAirConditioning((v) => !v)} className={pillClass(airConditioning)}>
                        {airConditioning ? 'Yes' : 'No'}
                      </button>
                    </div>
                    <div>
                      <label className={labelClass}>Pricing Type</label>
                      <div className="flex gap-2">
                        {(['day', 'trip', 'custom-quote'] as const).map((p) => (
                          <button key={p} type="button" onClick={() => setPricingType(p)} className={pillClass(pricingType === p)}>
                            {p === 'day' ? 'Per Day' : p === 'trip' ? 'Per Trip' : 'Custom Quote'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-xl cursor-pointer">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!step2Valid}
                    onClick={() => setStep(3)}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Photos + Price */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Photo URLs (one per line)</label>
                  <textarea
                    rows={4}
                    value={imagesText}
                    onChange={(e) => setImagesText(e.target.value)}
                    placeholder={'https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg'}
                    className={inputClass}
                  />
                  <p className="text-white/30 text-[10px] mt-1.5">
                    Paste direct links to photos you already have hosted elsewhere — no upload needed. The link must point straight at the image file (e.g. ending in .jpg/.png, or from an image host like Imgur). A Google Drive "share" link won't display — Drive's share/view links open a viewer page, not the image itself.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>{category === 'Car Rental' ? `Starting Price (${pricingType === 'day' ? 'per day' : pricingType === 'trip' ? 'per trip' : 'custom quote'})` : 'Price (per night)'}</label>
                  <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 85,000" className={inputClass} />
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(2)} className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-xl cursor-pointer">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!step3Valid}
                    onClick={() => setStep('summary')}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-40"
                  >
                    Review
                  </button>
                </div>
              </div>
            )}

            {/* SUMMARY */}
            {step === 'summary' && (
              <div className="space-y-5">
                <h3 className="font-serif text-2xl text-white font-light mb-1">Review Your Listing</h3>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 text-sm text-white/80">
                  <p><span className="text-white/40">Category:</span> {category}</p>
                  <p><span className="text-white/40">Name:</span> {name}</p>
                  <p><span className="text-white/40">Location:</span> {location}, {city}</p>
                  <p><span className="text-white/40">Price:</span> ₦{price}</p>
                  <p><span className="text-white/40">Photos:</span> {imagesText.split('\n').filter((l) => l.trim()).length}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(3)} className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-xl cursor-pointer">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingListing ? 'Save Changes' : 'Submit for Review'}
                  </button>
                </div>
              </div>
            )}

            {/* SUBMITTED */}
            {step === 'submitted' && (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="font-serif text-xl text-white font-light">
                  {editingListing?.status === 'approved' ? 'Changes Saved!' : 'Submitted for Review!'}
                </h3>
                <p className="text-white/40 text-xs mt-1 mb-6">
                  {editingListing?.status === 'approved'
                    ? 'Your listing is already live and reflects these changes now.'
                    : "We'll review this and let you know once it's approved — check your dashboard for status updates."}
                </p>
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="w-full py-3.5 bg-white/5 border border-white/10 text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
