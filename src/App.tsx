/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Hotel,
  Home,
  Car,
  Truck,
  BedDouble,
  ChevronLeft, 
  ChevronRight,
  MapPin, 
  Sparkles,
  X,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  Mail,
  Send,
  Phone,
  Check,
  Copy,
  Loader,
  Search,
  Sliders,
  Filter,
  ArrowUp,
  ShieldCheck,
  Layers,
  Crown,
  Plane,
  Sun,
  Moon,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from './firebase';
import portHarcourtImg from './assets/images/port_harcourt_landmark_1785093104193.jpg';
import abujaImg from './assets/images/abuja_landmark_1785093118297.jpg';
import lagosImg from './assets/images/lagos_landmark_1785093272541.jpg';
import { AdminDashboard } from './components/AdminDashboard';
import { AIConciergeModal } from './components/AIConciergeModal';
import { PrivateJetRequestModal } from './components/PrivateJetRequestModal';
import { MovingRequestModal } from './components/MovingRequestModal';
import { CarFleetBrowser } from './components/CarFleetBrowser';
import { CarDetailView } from './components/CarDetailView';
import { CarRequestModal } from './components/CarRequestModal';
import type { Vehicle } from './data/cars';
import {
  collection,
  addDoc
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}


function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type Category = 'stays' | 'homes' | 'drive' | 'jets' | 'moving' | null;

interface EnquiryData {
  location: string;
  dates: string;
  guests: string;
  preferences: string;
}

export default function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAIConciergeOpen, setIsAIConciergeOpen] = useState(false);

  // Light/dark theme — defaults to whatever the inline script in index.html
  // already applied (stored preference, or OS preference) so this never
  // fights that first paint.
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      // Ignore - e.g. storage disabled in a private/incognito context.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const [selectedCategory, setSelectedCategory] = useState<Category>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<any | null>(null);
  const [selectedShortlet, setSelectedShortlet] = useState<any | null>(null);
  const [selectedCar, setSelectedCar] = useState<Vehicle | null>(null);
  const [showJetRequestForm, setShowJetRequestForm] = useState(false);
  const [jetRequestPreset, setJetRequestPreset] = useState<string | null>(null);
  const [showMovingRequestForm, setShowMovingRequestForm] = useState(false);
  const [showCarRequestForm, setShowCarRequestForm] = useState(false);
  const [carRequestVehicle, setCarRequestVehicle] = useState<Vehicle | null>(null);

  // Luxury unified search states and helper functions
  const [searchQuery, setSearchQuery] = useState('');
  const [hotelRoomsMap, setHotelRoomsMap] = useState<Record<string, string>>({});
  const [hotelSelectedPackageMap, setHotelSelectedPackageMap] = useState<Record<string, { name: string; price: string }>>({});
  const [selectedPackage, setSelectedPackage] = useState<{ name: string; price: string } | null>(null);

  const getEffectiveHotelPackage = (hotel: any) => {
    if (!hotel) return null;
    if (hotelSelectedPackageMap[hotel.id]) {
      return hotelSelectedPackageMap[hotel.id];
    }
    if (hotel.tiers && hotel.tiers.length > 0) {
      const match = hotel.tiers.find((t: any) => t.price === hotel.price);
      if (match) return match;
      return { name: hotel.tiers[hotel.tiers.length - 1].name, price: hotel.tiers[hotel.tiers.length - 1].price };
    }
    return null;
  };

  const getFilteredHotels = () => {
    const query = searchQuery.trim().toLowerCase();
    const sourceHotels = selectedLocation && selectedLocation.toLowerCase().includes('lagos')
      ? lagosHotels
      : selectedLocation && selectedLocation.toLowerCase().includes('abuja')
      ? abujaHotels
      : phHotels;
    if (!query) return sourceHotels;
    return sourceHotels.filter(hotel => 
      hotel.name.toLowerCase().includes(query) ||
      hotel.location.toLowerCase().includes(query) ||
      hotel.description.toLowerCase().includes(query) ||
      ((hotel as any).note && (hotel as any).note.toLowerCase().includes(query)) ||
      ((hotel as any).tiers && (hotel as any).tiers.some((t: any) => t.name.toLowerCase().includes(query))) ||
      'hotels'.includes(query) ||
      'stays'.includes(query)
    );
  };

  const getFilteredShortlets = () => {
    const query = searchQuery.trim().toLowerCase();
    const sourceShortlets = selectedLocation && selectedLocation.toLowerCase().includes('lagos')
      ? lagosShortlets
      : selectedLocation && selectedLocation.toLowerCase().includes('abuja')
      ? abujaShortlets
      : phShortlets;
    if (!query) return sourceShortlets;
    return sourceShortlets.filter(shortlet => 
      shortlet.name.toLowerCase().includes(query) ||
      shortlet.location.toLowerCase().includes(query) ||
      shortlet.description.toLowerCase().includes(query) ||
      (shortlet.features && shortlet.features.some((f: string) => f.toLowerCase().includes(query))) ||
      'shortlets'.includes(query) ||
      'estates'.includes(query) ||
      'apartments'.includes(query) ||
      'villas'.includes(query) ||
      'homes'.includes(query)
    );
  };

  const renderSearchBar = (currentCategory: 'stays' | 'homes') => {
    const catLabels = {
      stays: { singular: 'hotel', plural: 'hotels' },
      homes: { singular: 'shortlet', plural: 'shortlets' }
    };

    return (
      <div className="w-full mb-10 bg-white border border-charcoal/5 rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-gold/5 font-sans">
        <div className="flex flex-col gap-4">
          <label className="block text-[10px] uppercase tracking-[0.25em] font-medium text-gold mb-1">
            Search {selectedLocation && selectedLocation.includes('Lagos') ? 'Lagos' : selectedLocation && selectedLocation.includes('Abuja') ? 'Abuja' : 'Port Harcourt'} Listings
          </label>
          <div className="relative w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${catLabels[currentCategory].plural}, other categories, or sub-locations (e.g. GRA, Stadium Rd)...`}
              className="w-full bg-charcoal/[0.03] border border-charcoal/10 rounded-2xl py-4 pl-14 pr-12 focus:outline-none focus:border-gold transition-colors text-sm font-medium text-charcoal placeholder-charcoal/30 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-charcoal/10 hover:bg-charcoal/20 text-charcoal/75 rounded-full transition-colors cursor-pointer"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mt-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-charcoal/40 mr-1.5 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-gold" /> Filter Tags:
            </span>
            
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
                !searchQuery
                  ? 'bg-gold text-cream shadow-sm'
                  : 'bg-charcoal/[0.03] text-charcoal hover:bg-charcoal/10'
              }`}
            >
              All {catLabels[currentCategory].plural}
            </button>

            {currentCategory === 'stays' && (
              selectedLocation && selectedLocation.includes('Lagos') ? [
                { label: 'Isheri Olofin', value: 'Isheri' },
                { label: 'Lekki Phase 1', value: 'Lekki' },
                { label: 'Eti-Osa', value: 'Eti-Osa' },
                { label: 'Victoria Island', value: 'Victoria' },
                { label: 'Ikeja', value: 'Ikeja' },
                { label: 'Ajao Estate', value: 'Ajao' },
                { label: 'Akowonjo', value: 'Akowonjo' },
                { label: 'Ojodu', value: 'Ojodu' },
                { label: 'Surulere', value: 'Surulere' },
                { label: 'Maryland', value: 'Maryland' },
                { label: 'Oshodi-Isolo', value: 'Oshodi' },
                { label: 'Festac Town', value: 'Festac' }
              ] : selectedLocation && selectedLocation.includes('Abuja') ? [
                { label: 'Central Business District', value: 'Central Business' },
                { label: 'Wuse', value: 'Wuse' },
                { label: 'Maitama', value: 'Maitama' },
                { label: 'Asokoro', value: 'Asokoro' },
                { label: 'Garki', value: 'Garki' }
              ] : [
                { label: 'GRA Port Harcourt', value: 'GRA' },
                { label: 'Rumudara', value: 'rumuodara' },
                { label: 'Stadium Road', value: 'stadium' },
                { label: 'Echelon', value: 'Echelon' }
              ]
            ).map(tag => (
              <button
                key={tag.label}
                type="button"
                onClick={() => setSearchQuery(tag.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  searchQuery.toLowerCase() === tag.value.toLowerCase()
                    ? 'bg-charcoal text-cream shadow-sm'
                    : 'bg-charcoal/[0.03] text-charcoal hover:bg-charcoal/10'
                }`}
              >
                #{tag.label}
              </button>
            ))}

            {currentCategory === 'homes' && (
              selectedLocation && selectedLocation.includes('Lagos') ? [
                { label: 'Akoka Lagos', value: 'Akoka' },
                { label: 'Beverly Hills', value: 'Beverly' },
                { label: 'Seychelles', value: 'Seychelles' },
                { label: 'Santorini', value: 'Santorini' },
                { label: 'Monte Carlo', value: 'Monte' },
                { label: 'Cappadocia', value: 'Cappadocia' },
                { label: 'Malibu', value: 'Malibu' }
              ] : [
                { label: 'GRA Sani Abacha', value: 'Sani Abacha' },
                { label: 'Treasure Court 4-Bed', value: '4-Bed Duplex' },
                { label: 'Treasure Court 3-Bed', value: '3-Bed Duplex' },
                { label: 'Elite Court Smart', value: 'Smart Home' },
                { label: 'Elite Court Off Abacha', value: 'off Abacha' },
                { label: 'Studio Room', value: 'Studio' },
                { label: 'Diamond Blue', value: 'Diamond' }
              ]
            ).map(tag => (
              <button
                key={tag.label}
                type="button"
                onClick={() => setSearchQuery(tag.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  searchQuery.toLowerCase() === tag.value.toLowerCase()
                    ? 'bg-charcoal text-cream shadow-sm'
                    : 'bg-charcoal/[0.03] text-charcoal hover:bg-charcoal/10'
                }`}
              >
                #{tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderOtherCategoryMatches = (activeCat: 'stays' | 'homes') => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.trim();
    const otherHotels = activeCat !== 'stays' ? getFilteredHotels() : [];
    const otherShortlets = activeCat !== 'homes' ? getFilteredShortlets() : [];

    const totalMatches = otherHotels.length + otherShortlets.length;
    if (totalMatches === 0) return null;

    return (
      <div className="mt-20 border-t border-charcoal/10 pt-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold block mb-2">Extended Exploration</span>
            <h3 className="text-3xl font-serif text-charcoal font-light">
              Matched in Other Categories
            </h3>
            <p className="text-xs text-charcoal/50 mt-1">
              We found premium luxury match options in other elite categories for &ldquo;{query}&rdquo;.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10">
          {otherHotels.map((hotel) => {
            const selectedPkg = hotelSelectedPackageMap[hotel.id] || null;
            return (
              <motion.div
                key={`other-hotel-${hotel.id}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 border border-charcoal/5 rounded-[2rem] overflow-hidden shadow-lg flex flex-col md:flex-row group hover:shadow-2xl hover:bg-white transition-all duration-500"
              >
                <div className="md:w-2/5 relative overflow-hidden aspect-video md:aspect-auto h-[240px] md:h-auto font-sans">
                  <HotelImageSlider images={hotel.images} name={hotel.name} />
                  <span className="absolute top-4 left-4 bg-charcoal text-cream text-[9px] uppercase tracking-[0.25em] font-bold px-3 py-1.5 rounded-full z-10 shadow-md">
                    Hotel Stay
                  </span>
                </div>
                <div className="md:w-3/5 p-8 flex flex-col justify-center font-sans">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-2xl font-serif text-charcoal mb-1">{hotel.name}</h4>
                      <div className="flex items-center text-charcoal/40 text-xs">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-gold" />
                        {hotel.location}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase tracking-widest text-gold font-bold block">
                        {selectedPkg ? `${selectedPkg.name} Rate` : 'From'}
                      </span>
                      <span className="text-xl font-serif text-charcoal">
                        ₦{selectedPkg ? selectedPkg.price : hotel.price}
                      </span>
                    </div>
                  </div>

                  <p className="text-charcoal/60 text-xs font-normal leading-relaxed mb-4 line-clamp-2">
                    {hotel.description}
                  </p>

                  {(hotel as any).tiers && (
                    <div className="mb-4 p-3 rounded-xl bg-gold/5 border border-gold/20 font-sans">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-gold flex items-center gap-1">
                          <Crown className="w-3 h-3 text-gold" /> Select Package / Tier:
                        </span>
                        {selectedPkg && (
                          <span className="text-[9px] font-bold text-charcoal bg-gold/20 px-2 py-0.5 rounded-full">
                            {selectedPkg.name}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(hotel as any).tiers.map((tier: any) => {
                          const isTierSelected = selectedPkg?.name === tier.name;
                          return (
                            <button
                              key={tier.name}
                              type="button"
                              onClick={() => {
                                const pkg = { name: tier.name, price: tier.price };
                                setHotelSelectedPackageMap(prev => ({ ...prev, [hotel.id]: pkg }));
                                setSelectedPackage(pkg);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                                isTierSelected
                                  ? 'bg-gold text-charcoal font-bold border-gold shadow-xs'
                                  : 'bg-white border-charcoal/10 text-charcoal/80 hover:border-gold/40'
                              }`}
                            >
                              <span>{tier.name}</span>
                              <span className={isTierSelected ? 'text-charcoal font-bold' : 'text-gold'}>₦{tier.price}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="w-full mb-3 p-2.5 bg-gold/5 border border-gold/15 rounded-xl font-sans">
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gold mb-1 flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5" /> Rooms Needed (Optional):
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {['1 Room', '2 Rooms', '3 Rooms', '4+ Rooms'].map((roomOpt) => {
                        const isSelected = (hotelRoomsMap[hotel.id] || '1 Room') === roomOpt;
                        return (
                          <button
                            key={roomOpt}
                            type="button"
                            onClick={() => {
                              setHotelRoomsMap(prev => ({ ...prev, [hotel.id]: roomOpt }));
                              setNumberOfRooms(roomOpt);
                            }}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-gold text-charcoal font-bold shadow-xs'
                                : 'bg-white border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/10'
                            }`}
                          >
                            {roomOpt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => {
                        const selectedRooms = hotelRoomsMap[hotel.id] || '1 Room';
                        setNumberOfRooms(selectedRooms);
                        setSelectedPackage(getEffectiveHotelPackage(hotel));
                        setSelectedCategory('stays');
                        setBookingType('booking');
                        setShowBookingOptions(hotel);
                      }}
                      className="bg-charcoal text-cream px-6 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-gold transition-colors shadow-md inline-block cursor-pointer"
                    >
                      Book Hotel
                    </button>
                    <button 
                      onClick={() => {
                        const selectedRooms = hotelRoomsMap[hotel.id] || '1 Room';
                        setNumberOfRooms(selectedRooms);
                        setSelectedPackage(getEffectiveHotelPackage(hotel));
                        setSelectedCategory('stays');
                        setBookingType('reservation');
                        setShowBookingOptions(hotel);
                      }}
                      className="bg-white text-charcoal border border-charcoal/20 px-6 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-gold hover:text-cream hover:border-gold transition-all duration-300 shadow-sm inline-block cursor-pointer"
                    >
                      Check Availability
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {otherShortlets.map((shortlet) => (
            <motion.div
              key={`other-shortlet-${shortlet.id}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 border border-charcoal/5 rounded-[2rem] overflow-hidden shadow-lg flex flex-col md:flex-row group hover:shadow-2xl hover:bg-white transition-all duration-500"
            >
              <div className="md:w-2/5 relative overflow-hidden aspect-video md:aspect-auto h-[240px] md:h-auto font-sans">
                <HotelImageSlider images={shortlet.images} name={shortlet.name} />
                <span className="absolute top-4 left-4 bg-gold text-cream text-[9px] uppercase tracking-[0.25em] font-bold px-3 py-1.5 rounded-full z-10 shadow-md">
                  Shortlet Suite
                </span>
              </div>
              <div className="md:w-3/5 p-8 flex flex-col justify-center font-sans font-sans">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-2xl font-serif text-charcoal mb-1">{shortlet.name}</h4>
                    <div className="flex items-center text-charcoal/40 text-xs">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-gold" />
                      {shortlet.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-widest text-gold font-bold block">Per Night</span>
                    <span className="text-xl font-serif text-charcoal">₦{shortlet.price}</span>
                  </div>
                </div>
                <p className="text-charcoal/60 text-xs font-normal leading-relaxed mb-6 line-clamp-2">
                  {shortlet.description}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
                      setSelectedCategory('homes');
                      setBookingType('booking');
                      setShowBookingOptions(shortlet);
                    }}
                    className="bg-charcoal text-cream px-6 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-gold transition-colors shadow-md inline-block cursor-pointer font-sans"
                  >
                    Book Shortlet
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedCategory('homes');
                      setBookingType('reservation');
                      setShowBookingOptions(shortlet);
                    }}
                    className="bg-white text-charcoal border border-charcoal/20 px-6 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-gold hover:text-cream hover:border-gold transition-all duration-300 shadow-sm inline-block cursor-pointer font-sans"
                  >
                    Check Availability
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

        </div>
      </div>
    );
  };
  const [showBookingOptions, setShowBookingOptions] = useState<any | null>(null);

  useEffect(() => {
    if (showBookingOptions) {
      const pkg = getEffectiveHotelPackage(showBookingOptions);
      setSelectedPackage(pkg);
    } else {
      setSelectedPackage(null);
    }
  }, [showBookingOptions]);
  const [bookingType, setBookingType] = useState<'booking' | 'reservation'>('booking');
  const [bookingStep, setBookingStep] = useState<1 | 2>(1); // 1 = Date/Time, 2 = WhatsApp Options
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [userPhoneNumber, setUserPhoneNumber] = useState('');
  const [numberOfRooms, setNumberOfRooms] = useState<string>('1 Room');
  const [emailSubmitStatus, setEmailSubmitStatus] = useState<'idle' | 'saving' | 'sending' | 'success' | 'manual_fallback'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  // A single date+time value per field (native datetime-local input) instead of
  // a separate calendar step plus hour/minute/AM-PM dropdowns — one control,
  // one decision, per check-in and check-out.
  const [checkinDate, setCheckinDate] = useState<Date | null>(null);
  const [checkoutDate, setCheckoutDate] = useState<Date | null>(null);

  const toDateTimeLocalValue = (date: Date | null): string => {
    if (!date) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const formatDateTime = (date: Date | null): string =>
    date
      ? `${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      : 'N/A';

  const formatShortDateTime = (date: Date | null): string =>
    date
      ? `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      : 'Select';

  const [showBackToTop, setShowBackToTop] = useState(false);

  const isPoppingState = useRef(false);

  // Helper for UI back/close buttons to cleanly pop browser history when available
  const handleNavigateBack = (fallbackFn: () => void) => {
    if (window.history.state && typeof window.history.state.depth === 'number' && window.history.state.depth > 0) {
      window.history.back();
    } else {
      fallbackFn();
    }
  };

  // 1. Mobile Physical Back Button & Browser Navigation Listener
  useEffect(() => {
    // Set up root history state on mount
    if (!window.history.state || window.history.state.ebRoot === undefined) {
      window.history.replaceState({
        ebRoot: true,
        depth: 0,
        category: null,
        location: null,
        bookingOptions: null,
        emailPopup: false,
        adminOpen: false,
        conciergeOpen: false
      }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      isPoppingState.current = true;
      const state = event.state;
      if (state) {
        setSelectedCategory(state.category ?? null);
        setSelectedLocation(state.location ?? null);
        setShowBookingOptions(state.bookingOptions ?? null);
        setShowEmailPopup(state.emailPopup ?? false);
        setIsAdminOpen(state.adminOpen ?? false);
        setIsAIConciergeOpen(state.conciergeOpen ?? false);
      } else {
        // Fallback to home root
        setSelectedCategory(null);
        setSelectedLocation(null);
        setShowBookingOptions(null);
        setShowEmailPopup(false);
        setIsAdminOpen(false);
        setIsAIConciergeOpen(false);
      }
      setTimeout(() => {
        isPoppingState.current = false;
      }, 60);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // 2. Sync state changes to browser history
  useEffect(() => {
    if (isPoppingState.current) return;

    const isRoot = !selectedCategory && !selectedLocation && !showBookingOptions && !showEmailPopup && !isAdminOpen && !isAIConciergeOpen;

    const currentState = {
      ebRoot: isRoot,
      category: selectedCategory,
      location: selectedLocation,
      bookingOptions: showBookingOptions,
      emailPopup: showEmailPopup,
      adminOpen: isAdminOpen,
      conciergeOpen: isAIConciergeOpen
    };

    const histState = window.history.state || {};

    const isSameState =
      histState.category === currentState.category &&
      histState.location === currentState.location &&
      (histState.bookingOptions?.id ?? null) === (currentState.bookingOptions?.id ?? null) &&
      histState.emailPopup === currentState.emailPopup &&
      histState.adminOpen === currentState.adminOpen &&
      histState.conciergeOpen === currentState.conciergeOpen;

    if (!isSameState) {
      const currentDepth = typeof histState.depth === 'number' ? histState.depth : 0;
      window.history.pushState({ ...currentState, depth: currentDepth + 1 }, '');
    }
  }, [selectedCategory, selectedLocation, showBookingOptions, showEmailPopup, isAdminOpen, isAIConciergeOpen]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (showBookingOptions) {
      setBookingStep(1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      setCheckinDate(tomorrow);
      setCheckoutDate(null);
      setShowEmailPopup(false);
      setUserPhoneNumber('');
      setEmailSubmitStatus('idle');
      setErrorMessage('');
    }
  }, [showBookingOptions]);

  const handleCheckinDateTimeChange = (value: string) => {
    const date = value ? new Date(value) : null;
    setCheckinDate(date);
    if (date && checkoutDate && date >= checkoutDate) {
      setCheckoutDate(null);
    }
  };

  const handleCheckoutDateTimeChange = (value: string) => {
    setCheckoutDate(value ? new Date(value) : null);
  };
  const [guestId, setGuestId] = useState<string>(() => {
    const existing = localStorage.getItem('guestId');
    if (existing) return existing;
    const newId = 'guest_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('guestId', newId);
    return newId;
  });
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<EnquiryData>({
    location: '',
    dates: '',
    guests: '',
    preferences: ''
  });

  const phHotels = [
    {
      id: 'echelon',
      name: 'Echelon Heights Hotel',
      location: '73 Ken Saro-Wiwa Rd, Port Harcourt, Rivers',
      price: '30,000',
      images: [
        'https://echelonheights.com/media/1479380492714A3780.jpg',
        'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1d/19/5f/94/echelon-heights-hotel.jpg?w=1200&h=1200&s=1',
        'https://www.hotelscombined.com/rimg/himg/fa/fa/17/expedia_group-2284512-195964036-218492.jpg?width=968&height=607&crop=true'
      ],
      description: 'Experience unparalleled luxury and comfort in the heart of Port Harcourt.'
    },
    {
      id: 'landmark',
      name: 'Land Mark Hotel',
      location: '4 Worlu St, D-line, Port Harcourt, Rivers',
      price: '69,000',
      tiers: [
        { name: 'Super Deluxe', price: '410,000' },
        { name: 'Deluxe', price: '260,000' },
        { name: 'Gold', price: '128,000' },
        { name: 'Diamond', price: '107,000' },
        { name: 'Exclusive', price: '84,000' },
        { name: 'Silver', price: '74,000' },
        { name: 'Top Tier', price: '69,000' }
      ],
      images: [
        'https://landmarkhotels.com.ng/wp-content/uploads/2020/04/DJI_0157.jpg',
        'https://media-cdn.tripadvisor.com/media/photo-s/0c/7e/43/c2/landmark-hotels-port.jpg',
        'https://lh3.googleusercontent.com/d/1G2bw3DsIvJsjD9EwGbF0OpV8bmxlCTmb',
        'https://lh3.googleusercontent.com/d/1Pm8MpSyLlWYeFvopkSiuFwhq3Mx_fPq6',
        'https://lh3.googleusercontent.com/d/15lf4-X6fTHmbtwEB2hdmfPvmXUmeEqne'
      ],
      description: 'A landmark of hospitality offering world-class amenities and service.'
    },
    {
      id: 'dmatel',
      name: 'Dmatel Gold Hotel',
      location: '91 Stadium Rd, Rumuomasi, Port Harcourt, Rivers',
      price: '40,000',
      images: [
        'https://hrelisting.com/wp-content/uploads/2022/02/Dmatel-Onyx-Hotel-Superior-Room.jpg',
        'https://www.dmatelhotels.com.ng/rooms/gra2-ph/superior-room2.jpg'
      ],
      description: 'Modern elegance meets traditional warmth in this premium stay.'
    },
    {
      id: 'heliconia',
      name: 'Heliconia Hotel',
      location: 'Eastern Bypass, Ogbunabali, Amadi, Rivers',
      price: '58,000',
      tiers: [
        { name: 'Exclusive', price: '211,000' },
        { name: 'Silver', price: '148,000' },
        { name: 'Top Tier', price: '76,000' },
        { name: 'Bronze', price: '66,000' },
        { name: 'Basic', price: '58,000' }
      ],
      images: [
        'https://www.heliconiaparkhotels.com/port-harcourt/assets/img/restaurant1.jpg',
        'https://q-xx.bstatic.com/xdata/images/hotel/max500/373718300.jpg?k=0fe93c496556445f6b1985ee117ba035240f6fbb917963331b21bdff437c1fb4&o=',
        'https://images.trvl-media.com/lodging/84000000/83080000/83078400/83078322/fc1cd831.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill'
      ],
      description: 'A serene and luxurious retreat offering exceptional hospitality and comfort.'
    },
    {
      id: 'leadwort',
      name: 'Leadwort Hotel',
      location: 'Oriji St, 2 Chief Chukwuka Amadi St, Airport Road, Port Harcourt, Rivers',
      price: '45,000',
      images: [
        'https://images.trvl-media.com/lodging/112000000/111070000/111068500/111068494/909ce907.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
        'https://images.trvl-media.com/lodging/104000000/103780000/103778400/103778328/w1242h932x0y7-47168e1f.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill'
      ],
      description: 'Experience refined comfort and world-class service at Leadwort.'
    },
    {
      id: 'casoni',
      name: 'Casoni international hotels and suites Ltd',
      location: '6 Presbyterian Close, Off Stadium Road, opposite RCCG, Rumuomasi, Port Harcourt',
      price: '50,000',
      images: [
        'https://casoni.com.ng/wp-content/uploads/2021/11/13-788x504-7771.jpg',
        'https://casoni.com.ng/wp-content/uploads/2021/11/casoni_rooms_4a-788x504-1.jpg',
        'https://casoni.com.ng/wp-content/uploads/2021/11/25-788x504-1.jpg'
      ],
      description: 'A premium destination for business and leisure travelers in Port Harcourt.'
    },
    {
      id: 'marvel-hotel',
      name: 'Marvel Hotel',
      location: 'Phase 2, 153 Tombia St, New GRA',
      price: '100,000',
      images: [
        'https://images.trvl-media.com/lodging/126000000/125080000/125075600/125075556/b5637f90.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
        'https://images.trvl-media.com/lodging/126000000/125080000/125075600/125075556/ffa8ca8f.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
        'https://www.nacobooking.com/media/property_images/2_yJFjA7g.jpg'
      ],
      description: 'Experience refined luxury and world-class service in the heart of New GRA.'
    },
    {
      id: 'ss3-odi',
      name: 'SS3 Odi',
      location: '10 odi street old GRA',
      price: '99,000',
      tiers: [
        { name: 'Gold', price: '220,000' },
        { name: 'Diamond', price: '160,000' },
        { name: 'Exclusive', price: '141,000' },
        { name: 'Silver', price: '125,400' },
        { name: 'Top Tier', price: '119,400' },
        { name: 'Bronze', price: '111,000' },
        { name: 'Basic', price: '99,000' }
      ],
      images: [
        'https://images.timbu.com/hotels-ng/supplier_m6stkkavzk_2_900x550.jpg',
        'https://images.trvl-media.com/lodging/38000000/37860000/37851300/37851288/3d34102a.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
        'https://images.trvl-media.com/lodging/38000000/37860000/37851300/37851288/b5500453.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill'
      ],
      description: 'Exquisite luxury at SS3 Odi. Select from our range of premium tiers for an unforgettable experience.'
    },
    {
      id: 'julirose-hotel',
      name: 'Julirose Hotel & Suites',
      location: 'Sim Fubara Close, Abuja Campus, Uniport',
      price: '80,000',
      tiers: [
        { name: 'Diamond', price: '300,000' },
        { name: 'Exclusive', price: '220,000' },
        { name: 'Bronze', price: '100,000' },
        { name: 'Basic', price: '80,000' }
      ],
      images: [
        'https://images.trvl-media.com/lodging/125000000/124490000/124485200/124485132/d8e31402.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
        'https://images.trvl-media.com/lodging/126000000/125030000/125024200/125024132/2e57424e.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
        'https://images.trvl-media.com/lodging/126000000/125030000/125024200/125024132/1bf5f3a2.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
        'https://images.trvl-media.com/lodging/125000000/124490000/124485200/124485132/b5f7666c.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
        'https://images.trvl-media.com/lodging/125000000/124490000/124485200/124485132/3fe0f5ee.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill'
      ],
      description: 'Experience premium luxury and academic proximity at Julirose Hotel & Suites, located conveniently near Uniport.'
    },
    {
      id: 'miami-hotel',
      name: 'Miami Hotel & Lounge',
      location: '7 Trans Woji Road, Elenlenwo',
      price: '38,000',
      tiers: [
        { name: 'Exclusive', price: '83,000' },
        { name: 'Silver', price: '63,000' },
        { name: 'Top Tier', price: '58,000' },
        { name: 'Bronze', price: '48,000' },
        { name: 'Basic', price: '38,000' }
      ],
      images: [
        'https://www.crystalbeds.com.ng/images/960x490/2025-01-17.jpg',
        'https://www.crystalbeds.com.ng/images/960x490/Screenshot_20250919-145713.png'
      ],
      description: 'Discover relaxation and vibrant nightlife at Miami Hotel & Lounge, perfectly situated on Trans Woji Road.'
    },
    {
      id: 'bonn-boutique',
      name: 'Bonn Boutique hotel & Lounge',
      location: '2 Love Close off Aganorlu Street, Ada-George Road, Mgbuoba',
      price: '23,000',
      tiers: [
        { name: 'Exclusive', price: '73,000' },
        { name: 'Silver', price: '48,000' },
        { name: 'Top Tier', price: '43,000' },
        { name: 'Bronze', price: '28,000' },
        { name: 'Basic', price: '23,000' }
      ],
      images: [
        'https://images.trvl-media.com/lodging/119000000/118240000/118236400/118236362/4b19dff8.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
        'https://images.trvl-media.com/lodging/119000000/118240000/118236400/118236362/w771h510x1y0-c3ddfb44.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
        'https://images.trvl-media.com/lodging/119000000/118240000/118236400/118236362/d3460250.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill'
      ],
      description: 'A stylish boutique hotel offering a blend of comfort and elegance on Ada-George Road.'
    },
    {
      id: 'doncont-hotel',
      name: 'Doncont Hotel',
      location: 'No.2 Orugbum Crescent off Woji Road, GRA Phase 2',
      price: '123,000',
      tiers: [
        { name: 'Gold', price: '205,000' },
        { name: 'Diamond', price: '143,000' },
        { name: 'Exclusive', price: '123,000' }
      ],
      images: [
        'https://images.trvl-media.com/lodging/111000000/110810000/110806700/110806677/9cb18bd1.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill',
        'https://images.trvl-media.com/lodging/111000000/110810000/110806700/110806677/a2471259.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill'
      ],
      description: 'Experience luxury and comfort at Doncont Hotel, ideally located in the prestigious GRA Phase 2.'
    },
    {
      id: 'villa-toscana-luxe',
      name: 'Villa Toscana Luxe Hotel',
      location: 'No. 20 Orogbum Crescent, GRA phase 2, port harcourt.',
      price: '93,000',
      tiers: [
        { name: 'Super Deluxe', price: '710,000' },
        { name: 'Deluxe', price: '355,000' },
        { name: 'Gold', price: '255,000' },
        { name: 'Diamond', price: '164,000' },
        { name: 'Exclusive', price: '143,000' },
        { name: 'Silver', price: '113,000' },
        { name: 'Top Tier', price: '103,000' },
        { name: 'Bronze', price: '98,000' },
        { name: 'Basic', price: '93,000' }
      ],
      images: [
        'https://www.villatoscanahotels.com/wp-content/uploads/2023/07/Villa-Toscana-Hotel-Port-Harcourt-1.jpg',
        'https://cf.bstatic.com/xdata/images/hotel/max1024x768/467889133.jpg?k=63a6c1886a25472086f82abd8478d3480acf9dc4d81d5e492456e6cc4bc60397&o=&hp=1',
        'https://www.villatoscanahotels.com/wp-content/uploads/2023/07/Flavour-Suite-Villa-Toscana-Hotel-Port-Harcourt-4.jpg',
        'https://www.villatoscanahotels.com/wp-content/uploads/2023/07/Twin-Suite-Villa-Toscana-Hotel-Port-Harcourt-7.jpeg.webp'
      ],
      description: 'Experience luxury at its finest at Villa Toscana Luxe Hotel, located in the prestigious GRA Phase 2.'
    },
    {
      id: 'hotel-1708',
      name: '1708 Hotel',
      location: '3 Ogunka Erewu Road',
      price: '53,000',
      tiers: [
        { name: 'Silver', price: '58,000' },
        { name: 'Top Tier', price: '53,000' }
      ],
      images: [
        'https://cf.bstatic.com/xdata/images/hotel/270x200/724381730.webp?k=6265314bb5b299ca3d962310f72438f948ae71f4220a3b123962b4384cd067f2&o='
      ],
      description: 'Experience cozy comfort and outstanding service at 1708 Hotel, located on Ogunka Erewu Road.'
    },
    {
      id: 'londa-hotel',
      name: 'Londa Hotel',
      location: '24b ebara oroazi rd Rumuepirikom',
      price: '33,000',
      tiers: [
        { name: 'Silver', price: '58,000' },
        { name: 'Top Tier', price: '41,000' },
        { name: 'Bronze', price: '38,000' },
        { name: 'Basic', price: '33,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1k5bGXTY_ZK-L4t4jy4bxaQfkum9dd-H8',
        'https://lh3.googleusercontent.com/d/1gCQXhsLVmGPN_FGkdWEUxkf3Zz8cmJo5',
        'https://lh3.googleusercontent.com/d/1Fy9L6n1rUnf_LYgu6aKE3FoDlaBH3b7V'
      ],
      description: 'Relax in stylish, refined surroundings at Londa Hotel, featuring exceptional service and a range of accommodation options on Ebara Oroazi Road.'
    },
    {
      id: 'boutique-1804',
      name: '1804 Boutique Hotel',
      location: 'Ekekahia rd rumuola',
      price: '22,500',
      tiers: [
        { name: 'Diamond', price: '48,500' },
        { name: 'Exclusive', price: '43,600' },
        { name: 'Silver', price: '42,000' },
        { name: 'Top Tier', price: '28,000' },
        { name: 'Bronze', price: '25,000' },
        { name: 'Basic', price: '22,500' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1sIBEJ11-EXfdsiDdGw-Adl2zBYfcfT8e',
        'https://lh3.googleusercontent.com/d/1qfaE1AGhOftteQLlDk83J01M7movd5Qc',
        'https://lh3.googleusercontent.com/d/1YHDhz-Bgfd3erKJZ4yIXWf3UgJlfJG-Y',
        'https://lh3.googleusercontent.com/d/1ZCuTR3lAY1oxw9g4FBbcHS-2jUMhQZU6'
      ],
      description: 'Discover unparalleled boutique hospitality at 1804 Boutique Hotel. Located along Ekekahia Road in Rumuola, we offer unique, high-end accommodations tailored to satisfy discerning travelers.'
    },
    {
      id: 'nima-suit-hotel',
      name: 'Nima Suit Hotel',
      location: '9 onukolo rd off woji road trans',
      price: '16,000',
      tiers: [
        { name: 'Top Tier', price: '20,000' },
        { name: 'Bronze', price: '17,000' },
        { name: 'Basic', price: '16,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1r1xhh2c5h3A7p7P81RdwxdH9LPkfTbUT',
        'https://lh3.googleusercontent.com/d/1pUltQ8TVydcnvqC3lYXXTyy95YUJMmhn',
        'https://lh3.googleusercontent.com/d/1WWaWaXzcuCL44ucKlORPQxCHoqwYMLVw'
      ],
      description: 'Experience supreme hospitality and a relaxing stay at Nima Suit Hotel, located perfectly in a peaceful setting off Woji Road.'
    },
    {
      id: 'the-gibs-hotel',
      name: 'The Gibs Hotel',
      location: 'No 9 shell location rd off tombia extension gra phase 3',
      price: '78,000',
      tiers: [
        { name: 'Diamond', price: '410,000' },
        { name: 'Top Tier', price: '138,000' },
        { name: 'Bronze', price: '118,000' },
        { name: 'Basic', price: '78,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1NL5t0blHcVhh9vLkbPeTnePWmhMty-fq',
        'https://lh3.googleusercontent.com/d/1AW3rCOF8WxzBtjHX2P66XylOoGNWHXcT',
        'https://lh3.googleusercontent.com/d/1V0R1vT2kNKM1etFf6hK-dnypwVmzGonX',
        'https://lh3.googleusercontent.com/d/1W67alILrNRrRQKO6O0fWWE6L7ttGlP52'
      ],
      description: 'Experience refined luxury at The Gibs Hotel, nestled in the upscale GRA Phase 3 off Tombia Extension. Enjoy impeccable service, elegant suites, and a truly high-class experience.'
    },
    {
      id: 'hano-hotels-suites',
      name: 'Hano Hotels & Suites',
      location: 'Phase orogbum crescent GRA',
      price: '93,000',
      tiers: [
        { name: 'Diamond', price: '164,000' },
        { name: 'Exclusive', price: '129,000' },
        { name: 'Silver', price: '103,000' },
        { name: 'Top Tier', price: '93,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1ac0cL7t2EzqyhjxBpjyezB4g7Noz47qJ',
        'https://lh3.googleusercontent.com/d/1ES5XUzbSqk_Pb5FmaIJPJvgrNRTTL58H',
        'https://lh3.googleusercontent.com/d/1OVaK1BkNS_ac3QAGrz-cAfe-JOu0E6TX'
      ],
      description: 'Indulge in sophisticated luxury at Hano Hotels & Suites, located on Orogbum Crescent in the prestigious GRA area. Offering pristine rooms and an executive feel, it is ideal for business and leisure travellers alike.'
    },
    {
      id: 'berenice-hotel',
      name: 'Berenice Hotel',
      location: '5 Ahoada east west rd rumuodara',
      price: '15,000',
      tiers: [
        { name: 'Bronze', price: '21,000' },
        { name: 'Basic', price: '15,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/14vkG8-SuNceKTqZpanRWAGrrNrnf-rCe',
        'https://lh3.googleusercontent.com/d/1aJRW45w4DnPGXwkHFB3oEblhQin63F5c',
        'https://lh3.googleusercontent.com/d/1KraeAN4dzKjPI0hj6Me4yX9LZ2MONMFp'
      ],
      description: 'Enjoy a warm hospitality and comfortable stay at Berenice Hotel, conveniently located on the Ahoada East-West Road in Rumuodara. Perfect for travelers seeking excellent service and relaxing accommodations.'
    },
    {
      id: 'meritz-hotels-suites',
      name: 'Meritz Hotels & suites',
      location: '1A acron avenue stadium rd',
      price: '53,700',
      tiers: [
        { name: 'Top Tier', price: '63,900' },
        { name: 'Bronze', price: '58,450' },
        { name: 'Basic', price: '53,700' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1oo8ZC0xWB71xzHaN-VEE6H09YN7A29IM',
        'https://lh3.googleusercontent.com/d/1iD1ajb_RZ8RrdAr6gtntL5TA4wFqJIV7',
        'https://lh3.googleusercontent.com/d/1532t91eC4Ad_Letli8o3zfP_04PugWwX',
        'https://lh3.googleusercontent.com/d/1QEDSkLO0vl0GCyuKrMp4gkynTf6aQo17'
      ],
      description: 'Discover stylish accommodations and top-class hospitality at Meritz Hotels & Suites, located on 1A Acron Avenue near Stadium Road. Featuring cozy premium rooms and dedicated service perfect for any visit.'
    },
    {
      id: 'transit-care-hotels',
      name: 'Transit care hotels',
      location: 'Presidential housing estate 17 circular rd new GRA',
      price: '23,000',
      tiers: [
        { name: 'Top Tier', price: '43,000' },
        { name: 'Bronze', price: '33,000' },
        { name: 'Basic', price: '23,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1bTB8puP9r51xZL6z-vDg20yn6FJrSBu6',
        'https://lh3.googleusercontent.com/d/1mTApfA1RXs6UDvtiZHofWwgIAjH3gW3Q',
        'https://lh3.googleusercontent.com/d/1TKWVI3NSdYZ1dXNiY3TcFqqbkpH8amzc',
        'https://lh3.googleusercontent.com/d/1iFfFNmZmzE8ZoOLRq8X_MCb5W0nJEjPD',
        'https://lh3.googleusercontent.com/d/1h84YuYN0rVl2bP0eT28tI37GhmvzRagx'
      ],
      description: 'Experience supreme rest and elegant comfort at Transit Care Hotels, strategically located inside the Presidential housing estate on 17 Circular Road, New GRA. We blend professional hospitality with cozy living blocks and premium amenities.'
    },
    {
      id: 'visa-karena-hotel',
      name: 'Visa Karena Hotel',
      location: '3D Wonodi Street, Olu Obasanjo Rd',
      price: '105,000',
      tiers: [
        { name: 'Diamond', price: '248,000' },
        { name: 'Exclusive', price: '138,000' },
        { name: 'Silver', price: '118,000' },
        { name: 'Top Tier', price: '105,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1vvnEU3Fv01BlJ6x5N6IXiIChusomghMq',
        'https://lh3.googleusercontent.com/d/13xDGaFKEH6kq1qgZaKNE4f_odz4dXgfF',
        'https://lh3.googleusercontent.com/d/1Y9RXR-DLajKVPae-rrhvRGKeS9OLuLkf',
        'https://lh3.googleusercontent.com/d/19jiU14Oee1TEuA9EIdMp5EEcUveVTEvK'
      ],
      description: 'Welcome to Visa Karena Hotel, situated on 3d Wonodi Street off Olu Obasanjo Road. Unwind in top-tier rooms, exquisite silver suites, high-end exclusive facilities, and premium diamond apartments engineered for supreme luxury and convenience.'
    },
    {
      id: 'city-view-hotel',
      name: 'City View Hotel',
      location: 'No 15/17 Akwaka Avenue off Oroazi Market Road, Opposite Sonabel Medical Center, Rumueme Mile 4',
      price: '30,875',
      tiers: [
        { name: 'Super Deluxe', price: '228,000' },
        { name: 'Deluxe', price: '170,250' },
        { name: 'Gold', price: '115,500' },
        { name: 'Diamond', price: '64,325' },
        { name: 'Exclusive', price: '48,175' },
        { name: 'Silver', price: '42,025' },
        { name: 'Top Tier', price: '36,450' },
        { name: 'Bronze', price: '33,105' },
        { name: 'Basic', price: '30,875' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1JdW_DEreRwb96aOYeXj-xj_Th6-vonz_',
        'https://lh3.googleusercontent.com/d/1Wm18HPIheRyko5BDig30ffkeipJQmf8u',
        'https://lh3.googleusercontent.com/d/1ZvNO6Vf7-EAAeiTSjoeANZ_OoF2k46GL',
        'https://lh3.googleusercontent.com/d/1siW6OYKxdpndnucPTAPIlx8ucEodegdL'
      ],
      description: 'Experience stunning city vistas and refined comfort at City View Hotel, located in the peaceful neighborhood of Rumueme Mile 4. With a vast selection of exquisitely furnished rooms spanning from cozy Basic quarters to masterfully designed Super Deluxe suites, we offer unmatched rest, wonderful service, and top-class hospitality.'
    },
    {
      id: 'macdestly-hotel',
      name: 'MacDestly Hotel',
      location: 'Plot 234/235 Oriprisam Nemi Avenue, off LNG Road, opposite Flourish Filling Station, Amadi-Ama',
      price: '73,000',
      tiers: [
        { name: 'Gold', price: '205,000' },
        { name: 'Silver', price: '83,000' },
        { name: 'Top Tier', price: '73,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1_txd5DpltiW5abIDkg8Chd5e-pVE2ZTs',
        'https://lh3.googleusercontent.com/d/1xEwpj9GNaAN_Kr0VPMl7TnMG8OJicAwI',
        'https://lh3.googleusercontent.com/d/1jXiVAwKRHk9OOFjec4p7c-cbQ05-tGLy',
        'https://lh3.googleusercontent.com/d/1NVXN8oyWe0zxr-PqdE9me1-tr3-so1UX'
      ],
      description: 'Experience prestige and tranquility at MacDestly Hotel, beautifully situated at Plot 234/235 Oriprisam Nemi Avenue, off LNG Road, opposite Flourish Filling Station, Amadi-Ama. We provide refined hospitality in top-tier rooms, luxurious silver suites, and magnificent gold residencies with personalized premium services.'
    },
    {
      id: 'salt-wood-hotel',
      name: 'Salt Wood Hotel',
      location: '#8 Egweme Street, Okuru-Ama / Abuloma Road, off Peter Odili Rd',
      price: '48,000',
      tiers: [
        { name: 'Gold', price: '68,000 (Wkdy) / ₦74,000 (Wknd)' },
        { name: 'Diamond', price: '63,000 (Wkdy) / ₦68,000 (Wknd)' },
        { name: 'Exclusive', price: '58,000 (Wkdy) / ₦63,000 (Wknd)' },
        { name: 'Silver', price: '53,000 (Wkdy) / ₦58,000 (Wknd)' },
        { name: 'Top Tier', price: '48,000 (Wkdy) / ₦53,000 (Wknd)' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1TJ11a8wgXBcbYgDbUptLLbT2RlB62QR6',
        'https://lh3.googleusercontent.com/d/1POEur99qMMvV-bo89O-UlS2UnToSoCrv',
        'https://lh3.googleusercontent.com/d/1g-G9PPCD46gCKacLbGLfYW3tkRqLbrX-'
      ],
      description: 'Find serene, nature-inspired comfort at Salt Wood Hotel, perfectly nestled at #8 Egweme Street off Peter Odili Road. Offering beautiful interior design and customizable weekday/weekend pricing structures for our Gold, Diamond, Exclusive, Silver, and Top Tier rooms.'
    },
    {
      id: 'cskr-hotel',
      name: 'CSKR Hotel',
      location: '6b Elekahai Housing Estate, Plot 7/9 Close off Circular Rd',
      price: '16,000',
      tiers: [
        { name: 'Diamond', price: '130,000' },
        { name: 'Exclusive', price: '85,500' },
        { name: 'Silver', price: '64,000' },
        { name: 'Top Tier', price: '43,000' },
        { name: 'Bronze', price: '22,500' },
        { name: 'Basic', price: '16,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1TFcgEYu9Hyq6jYamwe6WB0b5R4WGwJyK',
        'https://lh3.googleusercontent.com/d/1gH1Y8vlOhA1XxMRIXbO5toorUXh87W0g',
        'https://lh3.googleusercontent.com/d/14Ekt0Vk_ZLSCkyfagalSf9T6aJJHtb64',
        'https://lh3.googleusercontent.com/d/1WJhTWhSmhlkfx_BQTCxB7YBZqMMNdLkF'
      ],
      description: 'Discover quiet elegance at CSKR Hotel, nestled within the secure 6b Elekahai housing estate, Plot 7/9 close off Circular Road. Offering superb premium accommodations with tailored prices for Basic, Bronze, Top Tier, Silver, Exclusive, and Diamond selections designed for ultimate rest and retreat.'
    },
    {
      id: 'golf-prince-hotel',
      name: 'Golf Prince Hotel',
      location: '34 Abana Close',
      price: '41,300',
      tiers: [
        { name: 'Silver', price: '59,300' },
        { name: 'Top Tier', price: '46,300' },
        { name: 'Bronze', price: '44,300' },
        { name: 'Basic', price: '41,300' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1WUwjE7UtcTlc6k6KPWutO9HRh38KAqPn',
        'https://lh3.googleusercontent.com/d/1PvfnlzUmMFR3PzM7OTAAXGciE-YXviv4',
        'https://lh3.googleusercontent.com/d/1hh8QUqhVJERLRwoZnZdlGnddkK7jXbLV'
      ],
      description: 'Experience majestic hospitality and absolute comfort at Golf Prince Hotel, beautifully located at 34 Abana Close. Featuring modern room selections, meticulous high-end services, and perfectly curated rooms from Basic up to Silver suites designed for a premium hospitality experience.'
    },
    {
      id: 'mexiloyd-hotel',
      name: 'Mexiloyd Hotel',
      location: '10 Happyland Close, near Golf Estate, Okuru-Ama',
      price: '29,000',
      tiers: [
        { name: 'Silver', price: '79,000' },
        { name: 'Top Tier', price: '59,000' },
        { name: 'Bronze', price: '39,000' },
        { name: 'Basic', price: '29,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1m5jGecZlMfWG86NduCs_ZOqWGtP7nu3m',
        'https://lh3.googleusercontent.com/d/1Zu0IwXZPwclkBD1AH6UDyDP-eSUVhnp3'
      ],
      description: 'Experience unparalleled rest and premium leisure at Mexiloyd Hotel, situated at 10 Happyland Close near Golf Estate in Okuru-Ama. We offer pristine comfort in beautifully furnished rooms ranging from cozy Basic rooms to elite Silver suites, with spectacular hospitality.'
    },
    {
      id: 'de-revelation-hotel',
      name: 'De Revelation Hotel',
      location: 'Mummy B Drive by Zenith Bank, 8 Ezimgbu Road, New GRA',
      price: '18,000',
      tiers: [
        { name: 'Top Tier', price: '28,000' },
        { name: 'Bronze', price: '24,000' },
        { name: 'Basic', price: '18,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1TvRcfNt-i9dno2hvw0OoSXPdoK999qwX',
        'https://lh3.googleusercontent.com/d/1VH1t5QjSGr7VPC-CswbfHB3vw0yu2vw9',
        'https://lh3.googleusercontent.com/d/1vhb0z0EQ6tQ6fa7DoxF-duDbjQ_J4ujC'
      ],
      description: 'Experience refined comfort and supreme convenience at De Revelation Hotel, perfectly situated along Mummy B Drive, by Zenith Bank near 8 Ezimgbu Road in New GRA. We offer elegant room environments from our cozy Basic tier up to luxurious Top Tier suites, backed by exquisite local hospitality.'
    },
    {
      id: 'elite-hotel',
      name: 'Elite Hotel',
      location: '10 Enugu Estate by Rumuobiokani/Trans-Amadi Roundabout, Old Aba Road',
      price: '21,000',
      tiers: [
        { name: 'Bronze', price: '23,000' },
        { name: 'Basic', price: '21,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1hfZPlXZZlu4XScXeJLaFQ9rvuV0V9CMF',
        'https://lh3.googleusercontent.com/d/1yAWECkfkLnur0AiS7y_evl_mZ1xIu3uu'
      ],
      description: 'Experience exceptional modern living and perfect strategic convenience at Elite Hotel, remarkably situated at 10 Enugu Estate by the Rumuobiokani/Trans-Amadi Roundabout on Old Aba Road. We offer incredibly designed accommodations perfect for relaxing business retreats and luxury leisure.'
    },
    {
      id: 'goldrush-hotel',
      name: 'GoldRush Hotel',
      location: 'Phase 4 Mummy B, 14 Ezimgbu Link Rd, GRA',
      price: '43,000',
      tiers: [
        { name: 'Gold', price: '124,000' },
        { name: 'Diamond', price: '99,000' },
        { name: 'Exclusive', price: '84,000' },
        { name: 'Silver', price: '54,000' },
        { name: 'Top Tier', price: '51,000' },
        { name: 'Bronze', price: '46,000' },
        { name: 'Basic', price: '43,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1i78E1f266qPc2pUpORa_iIjqJq36uBj-',
        'https://lh3.googleusercontent.com/d/1liCiHOGTKzwuIzxaFVQiAB834MfH8xXY',
        'https://lh3.googleusercontent.com/d/1u5n3-Eka_3bmMJhWQYvmxl_ICmCly7u3'
      ],
      description: 'Experience pristine luxury and unparalleled comfort at GoldRush Hotel, beautifully located at Phase 4 Mummy B, 14 Ezimgbu Link Road, GRA. Enjoy exquisite modern rooms ranging from cosy Basic options to the elite Gold suites, delivered with refined excellence.'
    },
    {
      id: 'empire-boutique-hotel',
      name: 'Empire Boutique Hotel',
      location: '5 Suleiman Close off Danjuma Drive, Peter Odili Rd',
      price: '38,000',
      tiers: [
        { name: 'Top Tier', price: '48,000' },
        { name: 'Bronze', price: '43,000' },
        { name: 'Basic', price: '38,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1Vp84gomj_gGz1zzqQsslQlpMQkTyMIxl',
        'https://lh3.googleusercontent.com/d/1r5eNj-KSPd6jjoqenQdFnn5peszsfakb'
      ],
      description: 'Experience refined hospitality and bespoke rest at Empire Boutique Hotel, elegantly located at 5 Suleiman Close off Danjuma Drive, Peter Odili Road. Enjoy peaceful accommodation with tailored prices for Basic, Bronze, and high-end Top Tier clients.'
    },
    {
      id: 'luxarna-hotel-spa',
      name: 'Luxarna Hotel & SPA',
      location: 'Trunk C Mandela Estate, Plot 13 SARS Rd',
      price: '26,000',
      tiers: [
        { name: 'Silver', price: '54,000' },
        { name: 'Top Tier', price: '43,000' },
        { name: 'Bronze', price: '33,000' },
        { name: 'Basic', price: '26,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1vwFRHkH-N6rRb0v3xdhTgNapMITM8ci6',
        'https://lh3.googleusercontent.com/d/1RhEvE1WLGNdAuHD3-fKDG_Iz4i7Ilhin',
        'https://lh3.googleusercontent.com/d/1Wro3YJrS7UEJxY1bSJCHmgQBYfAN6Zrg',
        'https://lh3.googleusercontent.com/d/1A8NISw5DwrsQB2C6PvR-rHRFzAEBmorF'
      ],
      description: 'Experience world-class hospitality, absolute rejuvenation, and high-end serenity at Luxarna Hotel & SPA, ideally situated at Trunk C Mandela Estate, Plot 13 SARS Road. Featuring modern architectural design, premium spa services, and beautifully furnished rooms from cozy Basic up to premier Silver selections.'
    },
    {
      id: 'osborn-la-palm-resort',
      name: 'Osborn La Palm Resort',
      location: 'Phase 2, 3 Lord Ugboma Drive, GRA',
      price: '112,835',
      tiers: [
        { name: 'Deluxe', price: '698,225' },
        { name: 'Gold', price: '620,200' },
        { name: 'Diamond', price: '313,100' },
        { name: 'Exclusive', price: '236,075' },
        { name: 'Silver', price: '128,240' },
        { name: 'Top Tier', price: '112,835' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1a4tBgTiD1M6iVEn9139LVXqWG77fWN2v',
        'https://lh3.googleusercontent.com/d/1cMaEImBSM_Bpf4oPagdf8tRX7i10m46h',
        'https://lh3.googleusercontent.com/d/1QXfxPgPDu71g7raubGojQYldo7VYXDQn',
        'https://lh3.googleusercontent.com/d/1YT-FHzpSNisvPWqatc8aMJ-RoOd6MWlS'
      ],
      description: 'Indulge in magnificent prestige and premium comfort at Osborn La Palm Resort, nested at Phase 2, 3 Lord Ugboma Drive, GRA. Offering unparalleled luxury accommodations ranging from custom Top Tier rooms up to the ultra-exclusive Deluxe suites.'
    },
    {
      id: 'gordonsville-escape-boutique-hotel-spa',
      name: 'Gordonsville Escape Boutique Hotel & SPA',
      location: 'Bozgomero Estate, 30 Abuloma Rd, opposite FCMB Bank, Trans Amadi',
      price: '72,000',
      tiers: [
        { name: 'Gold', price: '163,000' },
        { name: 'Diamond', price: '133,000' },
        { name: 'Exclusive', price: '113,000' },
        { name: 'Silver', price: '93,000' },
        { name: 'Top Tier', price: '72,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1k5r8LRGDP1IWzzWXtcbkRFavsOqqPoGh',
        'https://lh3.googleusercontent.com/d/1L3PCYUdao_3XL-oeUpG6fLC-s3A1OKH0',
        'https://lh3.googleusercontent.com/d/1__FCKvGp9g09_VlwruqyK8PPSOnzY5Lf',
        'https://lh3.googleusercontent.com/d/1SMHOjFcEixVTKiyVdftaNSNTzwZkDgkP'
      ],
      description: 'Experience supreme relaxation, modern chic design, and signature therapeutic serenity at Gordonsville Escape Boutique Hotel & SPA, beautifully situated inside Bozgomero Estate, 30 Abuloma Road, opposite FCMB Bank, Trans Amadi. Featuring custom-designed suites from high-end Top Tier up to elite Gold options alongside spectacular spa services.'
    },
    {
      id: 'liberty-house',
      name: 'Liberty House',
      location: '41 Alexandra Street, Mgbuoshimiri',
      price: '23,000',
      tiers: [
        { name: 'Diamond', price: '43,000' },
        { name: 'Exclusive', price: '36,000' },
        { name: 'Silver', price: '33,000' },
        { name: 'Top Tier', price: '31,000' },
        { name: 'Bronze', price: '25,000' },
        { name: 'Basic', price: '23,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1lt08VX4KS8KeK2-jLrqTY-GYliLl3UZu',
        'https://lh3.googleusercontent.com/d/1NTjGIyIcMVoBJbnnhDSl6aKBozVBbJ4X',
        'https://lh3.googleusercontent.com/d/10A3UunyybCchTgQdqhbK2gFzuKCkU-WD'
      ],
      description: 'Enjoy exceptionally serene lodging and welcoming premium services at Liberty House, beautifully situated at 41 Alexandra Street, Mgbuoshimiri. Offering cozy and private room tiers ranging from Basic up to Diamond suites for a thoroughly relaxing stay.'
    },
    {
      id: 'de-loccville-place',
      name: 'De loccville place',
      location: 'Parkland estate, 6 Hon Gideon Ekeuwei Lane, Peter Odili Rd',
      price: '33,000',
      tiers: [
        { name: 'Exclusive', price: '64,000' },
        { name: 'Silver', price: '48,000' },
        { name: 'Top Tier', price: '43,000' },
        { name: 'Bronze', price: '38,000' },
        { name: 'Basic', price: '33,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1vouJIu_TnRF3e0lhR14j-hNxbmw8iZNs',
        'https://lh3.googleusercontent.com/d/1_08zykLITh3d_LhsM-YUO6KpAmM29YV4',
        'https://lh3.googleusercontent.com/d/1qYVAhpUGPUhZCJENReqKibtqZ2EAHG9q',
        'https://lh3.googleusercontent.com/d/17Nj4Q1KZA5gilgYaBfTYxa-xf3PHnMIo'
      ],
      description: 'Experience unparalleled serenity and upscale convenience at De loccville place, premium lodgings nestled inside Parkland estate at 6 Hon Gideon Ekeuwei Lane, Peter Odili Road. Offering beautifully tailored rooms and suites from cozy Basic options up to our signature Exclusive rooms designed for magnificent stays.'
    },
    {
      id: 'ibk-hotel-suites',
      name: 'Ibk Hotel and Suites',
      location: 'Queens Park Estate, House 19, Rd 3B, Eneka Link Rd',
      price: '38,000',
      tiers: [
        { name: 'Exclusive', price: '59,000' },
        { name: 'Silver', price: '43,000' },
        { name: 'Top Tier', price: '38,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/12h8wnGQqTRI21GZsSDmUwxljmIAcYfE2',
        'https://lh3.googleusercontent.com/d/1CEpfYJb9Wp8yO8lFI_1aIUMyO0UOKXPj'
      ],
      description: 'Experience ultimate comfort and prestige at Ibk Hotel and Suites, delightfully situated at Queens Park Estate, House 19, Road 3B, Eneka Link Road. We offer high-quality lodgings ranging from premium Top Tier suites to ultra-exclusive selections, setting a high standard of local hospitality.'
    },
    {
      id: 'trulli-hotel',
      name: 'Trulli Hotel',
      location: '12b Faith Avenue, Rumuomasi',
      price: '33,000',
      tiers: [
        { name: 'Silver', price: '64,000' },
        { name: 'Top Tier', price: '48,000' },
        { name: 'Bronze', price: '38,000' },
        { name: 'Basic', price: '33,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1bTVwpusnMGspCoEgU5prkc4MHfdG1tjY',
        'https://lh3.googleusercontent.com/d/1v3icNQXzpWCm4BbmM91HdK2WVncncJrq'
      ],
      description: 'Discover contemporary elegance and comfort at Trulli Hotel, perfectly situated at 12b Faith Avenue, Rumuomasi. Experience exceptionally tailored hospitality from cozy Basic rooms to premier Silver suites.'
    },
    {
      id: 'dee-os-hotel',
      name: "Dee O's Hotel",
      location: '18 Mini Ezekwu St, Mgbuesilara',
      price: '26,000',
      tiers: [
        { name: 'Top Tier', price: '34,000' },
        { name: 'Bronze', price: '29,000' },
        { name: 'Basic', price: '26,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1fflwCC356DUKzt0uMaof1RqfGIRhReRs',
        'https://lh3.googleusercontent.com/d/1Tgt_6AUcvqHL1tSF0NNbcOiEui9VIFyo'
      ],
      description: "Experience premium serenity and comfort at Dee O's Hotel, beautifully situated at 18 Mini Ezekwu St, Mgbuesilara. From cozy Basic options up to elite Top Tier suites, enjoy excellent hospitality designed for a delightful stay."
    },
    {
      id: '9ja-luxury-life-suites',
      name: '9ja Luxury Life Suites',
      location: 'Rd 3 Akwaka Rd',
      price: '21,000',
      tiers: [
        { name: 'Top Tier', price: '33,000' },
        { name: 'Bronze', price: '28,000' },
        { name: 'Basic', price: '21,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1BFcMjKpfgwh3uHtVZeNGW-G3NfpDtMXS',
        'https://lh3.googleusercontent.com/d/10g4TcMO3Fh-gchkXGolV_aMKfbmBciu1'
      ],
      description: 'Experience premier executive comfort, rich leisure, and elegant style at 9ja Luxury Life Suites, beautifully nested at Road 3 Akwaka Road. Offering beautifully detailed rooms ranging from cozy Basic options to high-end Top Tier accommodations.'
    },
    {
      id: 'bhanek-inn',
      name: 'Bhanek Inn',
      location: 'Rumuepirikon',
      price: '29,000',
      tiers: [
        { name: 'Top Tier', price: '48,000' },
        { name: 'Bronze', price: '38,000' },
        { name: 'Basic', price: '29,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1USQwiLxNzqcY29yrsBJUI0CPODepuUW0',
        'https://lh3.googleusercontent.com/d/1C_040hOl-heDOf4_p4uy64IBb3cZC9mW',
        'https://lh3.googleusercontent.com/d/1x_c9_pX5TdBFzGD_JniRlTfTQaEBlJ5i'
      ],
      description: 'Experience premium comfort, elegant style, and unmatched hospitality at Bhanek Inn, beautifully nested in Rumuepirikon. Enjoy exceptional accommodation options from cozy Basic rooms to elite Top Tier suites tailored to perfection.'
    },
    {
      id: 'grand-rivera-hotel',
      name: 'Grand Rivera hotel',
      location: 'Plot 534 EL Rd 12, Eagle Island',
      price: '33,000',
      tiers: [
        { name: 'Gold', price: '106,000' },
        { name: 'Exclusive', price: '74,000' },
        { name: 'Silver', price: '64,000' },
        { name: 'Top Tier', price: '54,000' },
        { name: 'Bronze', price: '43,000' },
        { name: 'Basic', price: '33,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1rtAIfydpfjWRl1exzfCdP-UvywWMlfV_',
        'https://lh3.googleusercontent.com/d/1Cn8TXAMGfoMQJiYyQC03yo3HxVWDFI4s',
        'https://lh3.googleusercontent.com/d/1lKL-Qn77up4UnbKP_t3RMNWTfVynC_uy'
      ],
      description: 'Experience refined prestige, majestic relaxation, and premium comfort at Grand Rivera hotel, ideally located at Plot 534 EL Road 12, Eagle Island. Offering beautifully designed accommodations ranging from cozy Basic rooms up to our signature Gold suites for a memorable stay.'
    },
    {
      id: 'whitestone-hotel',
      name: 'Whitestone Hotel',
      location: 'Off East West Rd, 1 Ordu Avenue, opp Omega House, Rumuodara',
      price: '50,950',
      tiers: [
        { name: 'Diamond', price: '84,950' },
        { name: 'Exclusive', price: '73,950' },
        { name: 'Silver', price: '50,950' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1AzZUUiB1cSjDyrWKzqxdbqIFWNQ5Sjzs',
        'https://lh3.googleusercontent.com/d/1ruYBsBuXpPRWiGuuoH1Y3ccQApzLtShr',
        'https://lh3.googleusercontent.com/d/1Fpc8ioBX0B9WORjFxlSmCX8LPV7dRFW_',
        'https://lh3.googleusercontent.com/d/17NpjAIZe3dQJ5mxDkWjLTZmwvE4K1WFS'
      ],
      description: 'Experience refined hospitality, beautiful architectural details, and modern convenience at Whitestone Hotel, remarkably located off East West Road at 1 Ordu Avenue, opposite Omega House, Rumuodara. Ideal for both business retreats and premium luxury leisure.',
      note: 'All tiers come with complimentary breakfast for 1 person'
    },
    {
      id: 'chrisolik-hotel-ltd',
      name: 'Chrisolik Hotel Ltd',
      location: 'Plot 5a off Trans Amadi, adjacent to Market Square and close to Sasun Roundabout, Plot 5 Peter Odili Rd, Trans Amadi',
      price: '26,000',
      tiers: [
        { name: 'Silver', price: '36,000' },
        { name: 'Top Tier', price: '33,000' },
        { name: 'Bronze', price: '31,000' },
        { name: 'Basic', price: '26,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/14x6Vwnu4Xd79BMEqsejGbsn0G0vR6sQQ',
        'https://lh3.googleusercontent.com/d/1ph9gPlGGAZOMR5tEGeURuPtfcaDeGD5V',
        'https://lh3.googleusercontent.com/d/1_wEvo1ukTTwwsvVkTkFKGejvW52YOnR1',
        'https://lh3.googleusercontent.com/d/14XFyjk8wUSrwCyEBJ_wW3sjHgbmXmVUW'
      ],
      description: 'Experience unparalleled strategic convenience and superior hospitality at Chrisolik Hotel Ltd, impeccably situated on Plot 5a off Trans Amadi, adjacent to Market Square and close to the Sasun Roundabout (Plot 5, Peter Odili Road). Offering beautifully finished room types from comfortable Basic layouts up to elite Silver suites designed for exquisite visits.'
    },
    {
      id: 'rj-hotel',
      name: 'RJ hotel',
      location: 'Mummy B Rd, 16 Justice Mary Odili St, GRA Phase 4, off Ezimgbu Rd',
      price: '35,000',
      tiers: [
        { name: 'Silver', price: '39,000' },
        { name: 'Basic', price: '35,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1KfU-kry0HZf4BnFzbcpK7t3M0I13Emud',
        'https://lh3.googleusercontent.com/d/1C-aDQehK7YWVe52Fw2aL2Yw2Tbf8wGR9',
        'https://lh3.googleusercontent.com/d/1E7V2D5GgBc1SKilLJguNRTmB63Lsux_N'
      ],
      description: 'Experience quiet luxury and modern refinement at RJ hotel, situated at Mummy B Road, 16 Justice Mary Odili Street in GRA Phase 4, off Ezimgbu Road. Providing superb comfort with stylishly customized rooms including Cozy Basic and Elegant Silver tiers for an outstanding stay.'
    },
    {
      id: 'dotnova-hotel',
      name: 'DotNova Hotel',
      location: 'Ikwerre Rd, Rumuokwuta',
      price: '18,000',
      tiers: [
        { name: 'Bronze', price: '21,000' },
        { name: 'Basic', price: '18,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/17NG_urh6GnqmtdIz4CLPqS0Xv5AGbp50',
        'https://lh3.googleusercontent.com/d/12yKli9MJv6DcQ8M444uw6if4mD-9BFg9',
        'https://lh3.googleusercontent.com/d/1MGbLiTn6RkE4qYdjLUdkTJoaxLBVwDUP'
      ],
      description: 'Discover cozy comfort, friendly ambiance, and superior hospitality at DotNova Hotel, perfectly located along Ikwerre Road, Rumuokwuta. Experience remarkably comfortable stays with beautifully tailored tiers from our Cozy Basic options to excellent Bronze accommodations.'
    },
    {
      id: 'proxima-centauri-hotel',
      name: 'PROXIMA CENTAURI HOTEL',
      location: 'Ykc 5 Unity Close, Golden Valley Estate, Woji',
      price: '49,000',
      tiers: [
        { name: 'Gold', price: '83,000' },
        { name: 'Diamond', price: '77,000' },
        { name: 'Exclusive', price: '66,000' },
        { name: 'Silver', price: '56,000' },
        { name: 'Top Tier', price: '49,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1VfKRFR64CD3_0mU5Gz76SG989qC0dLKJ',
        'https://lh3.googleusercontent.com/d/1CvHzH3DjnE4QK-8iqUC3fanCryGUyf9p',
        'https://lh3.googleusercontent.com/d/1NFHf7__b_UGTi32Z2LJnmPSVLNbd0SvZ',
        'https://lh3.googleusercontent.com/d/1G4CAElEH4nUUI4jA5JqsOv3mleZSTGOH'
      ],
      description: 'Discover contemporary luxury and stellar comfort at PROXIMA CENTAURI HOTEL, ideally nested inside Golden Valley Estate at YKC 5 Unity Close, Woji. We offer premium options ranging from cozy Top Tier quarters up to our ultra-exclusive Gold suites, all designed for a magnificent stay.'
    }
  ];

  const abujaHotels = [
    {
      id: 'sharon-ultimate-hotel',
      name: 'Sharon Ultimate Hotel',
      location: '29 Jos St, Garki, Abuja 900243, Federal Capital Territory',
      price: '42,950',
      tiers: [
        { name: 'Standard', price: '42,950' },
        { name: 'Deluxe', price: '50,000' },
        { name: 'Royal', price: '56,875' },
        { name: 'Executive', price: '62,750' }
      ],
      images: [
        '/images/sharon-ultimate-hotel/exterior.jpeg',
        '/images/sharon-ultimate-hotel/room-1.jpeg',
        '/images/sharon-ultimate-hotel/room-2.jpeg'
      ],
      description: 'Set on Jos Street in the heart of Garki, Sharon Ultimate Hotel offers refined comfort and dependable service in one of Abuja\'s most accessible districts. Choose from Standard, Deluxe, Royal, or Executive rooms, each finished with plush bedding and warm, elegant interiors — ideal for business travelers and guests seeking a peaceful stay close to the city center.'
    },
    {
      id: 'jasmines-place-suites',
      name: "Jasmine's Place & Suites",
      location: 'IMO STATE HOUSE, State Liaison Office - Imo State Government, 82 Ralph Shodeinde St, Central Business Dis, Abuja 900211, Federal Capital Territory',
      price: '43,000',
      tiers: [
        { name: 'Deluxe Suites (Premium)', price: '207,000' },
        { name: 'Deluxe Suites (Standard)', price: '155,000' },
        { name: 'Deluxe Suites (Basic)', price: '135,000' },
        { name: 'Standard Suites (Premium)', price: '125,000' },
        { name: 'Standard Suites (Standard)', price: '105,000' },
        { name: 'Standard Suites (Basic)', price: '84,000' },
        { name: 'Deluxe Room (Premium)', price: '75,000' },
        { name: 'Deluxe Room (Standard)', price: '59,000' },
        { name: 'Deluxe Room (Basic)', price: '54,000' },
        { name: 'Standard Room (Premium)', price: '64,000' },
        { name: 'Standard Room (Standard)', price: '48,000' },
        { name: 'Standard Room (Basic)', price: '43,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1B4I8XeHzy6FLmTfP902WOQUPf0rsmLAl',
        'https://lh3.googleusercontent.com/d/1WtZKZ0tqZ4Sp32lZ_O3EomC8Fk0Oe40g',
        'https://lh3.googleusercontent.com/d/1LXAhXPcmBwFNxlqsCtgSJPA3xJCvteBI'
      ],
      description: "Nestled in the prestigious IMO STATE HOUSE Complex on Ralph Shodeinde Street in the heart of Abuja's Central Business District, Jasmine's Place & Suites offers an exceptional sanctuary of peace, safety, and modern elegance. Ideal for diplomats, government officials, corporate leaders, and elite travelers seeking prime accessibility and boutique class services."
    },
    {
      id: 'the-destination-by-gidanka',
      name: 'The Destination by Gidanka',
      location: '20 N Djamena crescent, off Aminu Kano Crescent, Wuse, Abuja 900001, Federal Capital Territory',
      price: '96,000',
      tiers: [
        { name: 'Basic (2 Persons)', price: '96,000' },
        { name: 'Bronze', price: '226,000' },
        { name: 'Top Tier', price: '309,000' },
        { name: 'Silver', price: '409,000' },
        { name: 'Deluxe (8 Adults + 4 Kids, 2 Kitchens)', price: '910,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1K91S1lDqppleAsYRcaP-oVYNJsrueKqw',
        'https://lh3.googleusercontent.com/d/1P8mOicFPNKJVQyUV8oq66g-reQvSGmmI',
        'https://lh3.googleusercontent.com/d/1Uaij3IJRqhoSKhNOkGrhG-nzD9ob3Ylk',
        'https://lh3.googleusercontent.com/d/1RE1JCWuczukkQufHTHhv1jz3oqpy-yyM'
      ],
      description: 'Experience the absolute pinnacle of sophisticated hospitality at The Destination by Gidanka. Located on N Djamena Crescent in the prestigious Wuse district, this architectural masterpiece features majestic suites, bespoke kitchens, premium comforts, and unmatched security tailored perfectly for families, elites, and business leaders.'
    },
    {
      id: 'presken-hotel-abuja',
      name: 'Presken Hotel',
      location: '44 Parakou St, Wuse, Abuja 904101, Federal Capital Territory',
      price: '59,000',
      tiers: [
        { name: 'Executive Room', price: '59,000' },
        { name: 'Executive Royal', price: '74,000' },
        { name: 'Supreme Royal', price: '79,000' },
        { name: 'Prestige', price: '84,000' },
        { name: 'Classic Suite', price: '120,000' },
        { name: 'Two Bedroom (Penthouse)', price: '206,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1ltvmJPyb07V2eejEH_-oNP92hWcck39D',
        'https://lh3.googleusercontent.com/d/1ipQKzBwcVA40HSVUz661goeMXr_6S9CH',
        'https://lh3.googleusercontent.com/d/1z7dLs3xb9LdDmsGdtE-jdTWa5_K5ST9-',
        'https://lh3.googleusercontent.com/d/16E21XpxIdsDyc_dPj9aVIFpjbiFwYeZ3',
        'https://lh3.googleusercontent.com/d/1qF2p4wvSkyppN5dcjNfvWSeqpXN1A2r8'
      ],
      description: 'Discover true comfort and first-class services at Presken Hotel, Wuse. Offering spacious executive rooms, premium leisure facilities, and delicious dining options, Presken delivers a warm and thoroughly relaxing oasis for corporate executives and holidaymakers in the heart of Abuja.'
    },
    {
      id: 'paris-royal-hotel',
      name: 'Paris Royal Hotel',
      location: 'Jim P. Brown St, Gwarinpa, Abuja 900108, Federal Capital Territory',
      price: '43,000',
      tiers: [
        { name: 'Parris Deluxe', price: '43,000' },
        { name: 'Parris Exquisite', price: '48,000' },
        { name: 'Parris Royal Delight (Twin Bed)', price: '52,000' },
        { name: 'Parris Royal Ambassadorial Suite', price: '69,000' },
        { name: 'Parris Royal Presidential Suite', price: '74,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1SDQsANG9e6ZXRIZ5YFCeRKaaPXg2jnW0',
        'https://lh3.googleusercontent.com/d/18EKQWf_xc_v9_ruI5nc1Sg5OvSojkz7z',
        'https://lh3.googleusercontent.com/d/1FxBPO7j-kM4m2xHtT_LuW9jZmy7SW_Ue'
      ],
      description: 'Savor royal elegance and majestic treatment at Paris Royal Hotel, Gwarinpa, Abuja. Adorned with beautiful European-inspired architecture, spacious state rooms, and supreme amenities, it represents a premier choice for high-class security, quiet comfort, and impeccable service.'
    },
    {
      id: 'pearl-gates-hotel',
      name: 'Pearl Gates Hotel',
      location: 'Zone 4, Sani Abacha Estate, 11 Suez Cres, Wuse, Abuja 900288, Federal Capital Territory',
      price: '46,300',
      tiers: [
        { name: 'Classic', price: '46,300' },
        { name: 'Deluxe', price: '56,700' },
        { name: 'Royal', price: '60,900' },
        { name: 'Alcove', price: '66,500' },
        { name: 'Executive', price: '78,500' },
        { name: 'Pearl Room', price: '82,400' },
        { name: 'Pearl Suites', price: '86,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1j70U_Jtc-8f_LdocsItf0OpVttDCc87d',
        'https://lh3.googleusercontent.com/d/1FVnLWGxCqzTFbqbxvVueVmrEKrrs8T8l',
        'https://lh3.googleusercontent.com/d/1qLPCpyqjXleKOyNsCFBPOW-qpz3ZEE7B'
      ],
      description: 'Boasting a premium location in the tranquil Sani Abacha Estate, Pearl Gates Hotel is an exceptional haven of peace and style. From beautifully curated Classic and Deluxe rooms to elite Pearl Suites, experience top-shelf customer service, state-of-the-art security, and a wonderfully relaxing stay.'
    },
    {
      id: 'bon-hotel-imperial-wuse',
      name: 'Bon Hotel Imperial Wuse',
      location: '34 Sokode Cres, Wuse, Abuja 904101, Federal Capital Territory',
      price: '133,500',
      tiers: [
        { name: 'Classic Room', price: '133,500' },
        { name: 'Deluxe Room', price: '144,600' },
        { name: 'Superior Deluxe', price: '151,590' },
        { name: 'Executive Deluxe', price: '157,920' },
        { name: 'Executive Suite', price: '248,400' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/138jJ56rILmTz0tQPmgLszZC0EaEqb7Gp',
        'https://lh3.googleusercontent.com/d/1TCfW_2vP85-4OdIw5sR1ZC9XTbM1ijvl',
        'https://lh3.googleusercontent.com/d/1QBZM6WfrKaqbEDHwUgHFsaOAq1ypYlwg',
        'https://lh3.googleusercontent.com/d/16kJHy5XZoKoGUH4kyHsVJTvIlHzIE2MB'
      ],
      description: 'Experience imperial grandeur and world-class luxury at Bon Hotel Imperial Wuse. Located on Sokode Crescent, Wuse, this landmark hotel offers magnificent accommodations, gorgeous views, executive boardrooms, and highly refined services perfectly tailored to international business and leisure elites.'
    },
    {
      id: 'bon-hotel-abuja',
      name: 'BON Hotel Abuja',
      location: '3 Negro Cres, Maitama, Abuja 904101, Federal Capital Territory',
      price: '155,000',
      tiers: [
        { name: 'Executive Classic', price: '155,000' },
        { name: 'Executive Suite', price: '256,000' },
        { name: 'Diplomatic', price: '286,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/13IkWqpHw6Ww3lA5Tod-YpsqiJoT2aiFY',
        'https://lh3.googleusercontent.com/d/19MPPDcPPkTwvzkfvC7SfQtm-ftw8wYe_',
        'https://lh3.googleusercontent.com/d/1AoTaqfrfxqG5f7JVa5_NvNYUIA4L44qj'
      ],
      description: 'Located in the elite enclave of Maitama, BON Hotel Abuja offers a refined sanctuary of contemporary grandeur, supreme tranquility, and exquisite dining. An outstanding address for corporate executives and diplomats seeking prestige and flawless luxury.'
    },
    {
      id: 'first-forty-hotel',
      name: '1st Forty Hotel',
      location: '38 Aminu Kano Cres, Wuse 2, Abuja 904101, Federal Capital Territory',
      price: '48,800',
      tiers: [
        { name: 'Millennium Room', price: '48,800' },
        { name: 'Deluxe Room', price: '56,800' },
        { name: 'Diplomatic Room', price: '64,500' },
        { name: 'Supreme Room', price: '69,800' },
        { name: 'Executive Room', price: '89,000' },
        { name: 'Luxury Room', price: '99,000' },
        { name: 'Royal Room', price: '126,000' },
        { name: 'Executive Deluxe Room', price: '133,000' },
        { name: 'Premium Suite', price: '155,000' },
        { name: 'Junior Suite', price: '175,000' },
        { name: 'Signature', price: '276,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1AiDwENTSHAdjGEI4G8QRnK83M1l0LAxY',
        'https://lh3.googleusercontent.com/d/1pbAos9SqFbf2ToE2ycDDEVPrgloStlcq',
        'https://lh3.googleusercontent.com/d/1ZHcCLoIgXMS5ljblGf_Q1duzsYjpYa55'
      ],
      description: 'Situated prominently on the iconic Aminu Kano Crescent in Wuse 2, 1st Forty Hotel is a luxury beacon of style, supreme comfort, and premium hospitality. Featuring an array of meticulously designed rooms and suites, outstanding conference centers, and first-rate customer services.'
    },
    {
      id: 'the-panama-hotel',
      name: 'The Panama',
      location: '43 Panama St, Maitama, Abuja 900271, Federal Capital Territory',
      price: '139,000',
      tiers: [
        { name: 'Standard Room', price: '139,000' },
        { name: 'Deluxe Room', price: '173,000' },
        { name: 'Premium Room', price: '209,000' },
        { name: 'Luxury Suite', price: '256,000' },
        { name: 'Executive Suite', price: '319,000' },
        { name: 'The Panama', price: '397,000' },
        { name: 'The Royal', price: '506,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/16B9WPU5im5m6crnlRlz-y2cvViQan-ab',
        'https://lh3.googleusercontent.com/d/1PUuCt8TKil-2FwRvtyE0NUpQeU2_LgZg',
        'https://lh3.googleusercontent.com/d/1PmyXVAz4pFGfZcbtiuhrG8m7VowtsEad'
      ],
      description: 'Set in the diplomat-preferred neighborhood of Maitama, The Panama offers a bespoke boutique hotel experience combining modern sophistication with unparalleled privacy. Guests enjoy grandly appointed suites, signature amenities, and top-tier security for an unforgettable stay.'
    },
    {
      id: 'the-sai-luxury-hotel-abuja',
      name: 'The SAI luxury hotel Abuja',
      location: 'No. 6, Asa Street, Off Gana Street Maitama, Abuja, Federal Capital Territory',
      price: '84,000',
      tiers: [
        { name: 'ZINNIA', price: '84,000' },
        { name: 'MAGNOLIA', price: '105,000' },
        { name: 'RED ROSE', price: '120,000' },
        { name: 'DHALIA', price: '140,000' },
        { name: 'WHITE ROSE', price: '186,000' },
        { name: 'DAISY', price: '186,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1CIvDQtQvJHPFSalUOyj6okHYuYZNeFe4',
        'https://lh3.googleusercontent.com/d/11jcvEve08tzyh2akL43MZvK3oxpmS6sK',
        'https://lh3.googleusercontent.com/d/1STYWeSgOsXYDE3hb-Q5MyH0smLSncgaG'
      ],
      description: 'Experience bespoke boutique hospitality and pristine luxury at The SAI Luxury Hotel, located at No. 6 Asa Street, Off Gana Street in Maitama, Abuja. Offering thoughtfully styled accommodations from ZINNIA to executive DAISY suites with round-the-clock security and premier service.'
    },
    {
      id: 'ritman-hotel-abuja',
      name: 'Ritman Hotel',
      location: '11 Ilorin St, Garki, Abuja 900103, Federal Capital Territory',
      price: '31,000',
      tiers: [
        { name: 'Standard Room', price: '31,000' },
        { name: 'Deluxe Room', price: '37,000' },
        { name: 'Executive Room', price: '51,000' },
        { name: 'Super Deluxe Room', price: '64,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1lcMGnPXtmrojTY8JLb7nRHJMOgUZc2Tn',
        'https://lh3.googleusercontent.com/d/1oHTay78kyK1HzPOThct0ZT7l2Y-LVxl9',
        'https://lh3.googleusercontent.com/d/1XO5qnjOyQ-vl58k9LcyN5__2oZQzes9B'
      ],
      description: 'Discover welcoming hospitality and quiet comfort at Ritman Hotel in Garki, Abuja. Conveniently situated on Ilorin Street, offering cozy Standard options to spacious Super Deluxe rooms with excellent customer service and prime security.'
    },
    {
      id: 'hotel-de-bently-abuja',
      name: 'Hotel de Bently',
      location: '892 Ngozi Okonjo-Iweala Wy, Utako, Abuja 900108, Federal Capital Territory',
      price: '54,000',
      tiers: [
        { name: 'Standard Room', price: '54,000' },
        { name: 'Deluxe Room', price: '59,000' },
        { name: 'Executive Suite', price: '64,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1TQw0j56Z6HKaei1IlnVwX2OXjzy9GgQM',
        'https://lh3.googleusercontent.com/d/1bCRxacPBXGDLHjODooAgZW9dCTFo80zU',
        'https://lh3.googleusercontent.com/d/1g70Jnhx9N97jVE4AvxnnndGI03fWnkod',
        'https://lh3.googleusercontent.com/d/1uuDdgJreOSuLaZlx7p7vnmmP7QPwmRfM',
        'https://lh3.googleusercontent.com/d/1gF0aOMyLxyDIWZLY8ETI7U0mdzMT-byo'
      ],
      description: 'Experience refined elegance and contemporary hospitality at Hotel de Bently, conveniently located on Ngozi Okonjo-Iweala Way in Utako, Abuja. Featuring tastefully appointed Standard, Deluxe, and Executive suites, backed by top-class security and premium amenities.'
    },
    {
      id: 'candellux-imperial-hotel-suites-abuja',
      name: 'Candellux Imperial hotel and suites',
      location: 'Area 1, No. 5 Sir Anebo Okekenta Street, adjacent Divine Hand of God Church, Garki, Abuja, Federal Capital Territory',
      price: '54,000',
      tiers: [
        { name: 'Standard', price: '54,000' },
        { name: 'Ultra', price: '74,000' },
        { name: 'Suite', price: '105,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/127nGAoSw3y21JG6GX1L3Wm4GYLw0wPvp',
        'https://lh3.googleusercontent.com/d/1qq-QFz3T5lgVEJfJ-hNAe2Zv2mdp9Ggx',
        'https://lh3.googleusercontent.com/d/1dIhy9K1vmeQdRskHoNkNNr5xohPYtiDb',
        'https://lh3.googleusercontent.com/d/1yTN630WW7mDmb6q6Hh_70zUcEMCEM3kN'
      ],
      description: 'Discover opulent accommodations and pristine executive service at Candellux Imperial Hotel and Suites. Located in Garki, Abuja, featuring refined Standard, Ultra, and luxury Suites equipped with high-speed internet, premier dining, and top-tier security.'
    },
    {
      id: 'dayspring-hotel-abuja',
      name: 'DaySpring Hotel',
      location: 'Zone 6, Plot 4 Juba St, Wuse, Abuja 904101, Federal Capital Territory',
      price: '33,000',
      tiers: [
        { name: 'Standard Room', price: '33,000' },
        { name: 'Deluxe Room', price: '38,000' },
        { name: 'Superior Room', price: '43,000' },
        { name: 'Executive Room', price: '48,000' },
        { name: 'Super Deluxe Suite', price: '64,000' },
        { name: 'Presidential Suite', price: '84,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1P-Abri6TqvI_vw8kPA0TjA4PbNRncLry',
        'https://lh3.googleusercontent.com/d/1TuSKWw-wj-jtrL-71uDvhvVnL9nBGH5I',
        'https://lh3.googleusercontent.com/d/1-9Lr-YL2troDML1g4v7ZhVTfB375_1vS',
        'https://lh3.googleusercontent.com/d/1I5T_QSVwR8klAYQcLYFkE3dn2xdxoQW5'
      ],
      description: 'Experience comforting hospitality and quiet elegance at DaySpring Hotel in Wuse, Abuja. Positioned on Juba Street in Zone 6, featuring room tiers from Standard to Executive and Presidential Suites with top-notch amenities and dedicated guest services.'
    },
    {
      id: 'broadfield-hotel-apo-residence-abuja',
      name: 'Broadfield Hotel Apo residence',
      location: '2 Ahmadu Bello Wy, Apo, Abuja 900110, Federal Capital Territory',
      price: '79,000',
      tiers: [
        { name: 'Classic (Single Room)', price: '79,000' },
        { name: '1 Bedroom Apartment', price: '147,000' },
        { name: '2 Bedroom Apartment (Standard)', price: '158,000' },
        { name: '2 Bedroom Apartment (Executive)', price: '210,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1j_48gd4JZSYV_jtktkYJVmT2Jp4K68OX',
        'https://lh3.googleusercontent.com/d/15_lPfDBZLo7TILOrlIdNkFO2wzSVGlXZ',
        'https://lh3.googleusercontent.com/d/1IDA9gxYE9wDHz-cmaVKJemoO6vY6tblV',
        'https://lh3.googleusercontent.com/d/1uV721Iz2XUkREysQaO9-oc-SRKa9ilEW',
        'https://lh3.googleusercontent.com/d/1O0ok8cwF5PEF_6F7E7Lykxcar-xyO2I2'
      ],
      description: 'Enjoy high-end residence living at Broadfield Hotel Apo Residence on Ahmadu Bello Way, Apo, Abuja. Featuring sophisticated Classic single rooms to spacious 1 & 2 bedroom luxury apartments complete with modern kitchens, fitness facilities, and top-tier security.'
    },
    {
      id: 'peace-luxury-hotel-apartments-abuja',
      name: 'Peace Luxury Hotel and apartments',
      location: 'Jahi, Municipal, Abuja 900108, Federal Capital Territory',
      price: '60,250',
      tiers: [
        { name: 'Standard (Single Room)', price: '60,250' },
        { name: 'Supreme Deluxe (Self Con)', price: '82,750' },
        { name: 'Peace Suite (2 Bedroom)', price: '118,250' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1IbE74juc_bIXXSA3FiZM3BofglgSgKXY',
        'https://lh3.googleusercontent.com/d/1hypI63rKvysaQMZRHU4OL0S1N9mEWMCH',
        'https://lh3.googleusercontent.com/d/17sZpjCCmDwUnQr0zZat5uPDdSf84T0o3',
        'https://lh3.googleusercontent.com/d/1abMjYOagcsDn6gOrzieBS1odCgijVlm1'
      ],
      description: 'Experience tranquil serenity and boutique luxury at Peace Luxury Hotel and Apartments in Jahi, Abuja. Offering thoughtfully furnished Standard single rooms, Supreme Deluxe self-contained suites, and spacious 2-bedroom Peace Suites with round-the-clock power and top-flight security.'
    },
    {
      id: 'cubana-signature-abuja',
      name: 'Cubana Signature',
      location: '9 Ashiek Jarma Street, off Umaru Dikko St, District, Abuja, Federal Capital Territory',
      price: '64,000',
      tiers: [
        { name: 'Deluxe Room', price: '64,000' },
        { name: 'Executive Room', price: '74,000' },
        { name: 'Business Luxury Suite', price: '84,000' },
        { name: 'Signature Suite', price: '126,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1lA0fdol9UlIToZpP5yt4crMEAVU0KOCl',
        'https://lh3.googleusercontent.com/d/1W74fttso-XYOvpe2b7a0Fo8bnsFBFPaO',
        'https://lh3.googleusercontent.com/d/1EYl9mth-IBDrE9R-4sU94hFynYgvmcQr',
        'https://lh3.googleusercontent.com/d/1LmSezwXcH1-aHWTNCUHbvFVTDxnLTBaZ',
        'https://lh3.googleusercontent.com/d/1a318e_OgNlpSQue6HVpoXFJtbFSqnGSp',
        'https://lh3.googleusercontent.com/d/1DyJXAE04BL90vcmmmW5Ru5xprl8YIlC9'
      ],
      description: 'Experience elite hospitality and grand luxury at Cubana Signature in Abuja. Nestled on Ashiek Jarma Street off Umaru Dikko, offering high-end Deluxe, Executive, Business Luxury, and Signature suites with world-class dining, lounge, and security services.'
    },
    {
      id: 'reiz-continental-hotel-abuja',
      name: 'Reiz Continental Hotel',
      location: '9 Wole Olanipekun St, Cadastral Zone, Abuja 900103, Federal Capital Territory',
      price: '104,875',
      tiers: [
        { name: 'Small Room', price: '104,875' },
        { name: 'Standard Room', price: '113,100' },
        { name: 'Deluxe Room', price: '135,250' },
        { name: 'Super Deluxe Room', price: '147,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/19naXjXgcaApfYtSkXCOpgi7XENMbZP7M',
        'https://lh3.googleusercontent.com/d/1co-zg5rG73sZ4xgETxuD-K2phyO44rrT',
        'https://lh3.googleusercontent.com/d/1XyD_Lq9bmKsTRLhOXe2Luf2vo96uu5d_',
        'https://lh3.googleusercontent.com/d/1xAJoHePjBQ4imUuBSFPI3FKBlED4_GQn',
        'https://lh3.googleusercontent.com/d/1f61-1w4NNmgH_O2XGIOrp74_sqpXXbCm'
      ],
      description: 'Enjoy world-class hospitality and premier comfort at Reiz Continental Hotel in Central Cadastral Zone, Abuja. Located on Wole Olanipekun Street, featuring modern accommodations ranging from Cozy Small rooms to spacious Super Deluxe suites, complete with fine dining, event halls, and 24/7 top-tier security.'
    },
    {
      id: 'od-vicks-luxe-abuja',
      name: "OD-V!CK'S LUXE",
      location: 'Zone 4, Kitwe St, Wuse, Abuja 900109, Federal Capital Territory',
      price: '28,000',
      tiers: [
        { name: 'Standard Room', price: '28,000' },
        { name: 'Deluxe Room', price: '33,000' },
        { name: 'Super Deluxe Room', price: '38,000' },
        { name: 'Executive Room', price: '43,000' },
        { name: 'Superior Executive Room', price: '48,000' },
        { name: 'Royal Suite', price: '74,000' },
        { name: 'Diplomatic Suite', price: '84,000' },
        { name: 'Executive Suite', price: '105,000' },
        { name: 'Presidential Suite', price: '125,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/17s96mzq7wQvExXDq8a4c-PePDJvP6PSm',
        'https://lh3.googleusercontent.com/d/1FKveYf3XGWDvqk3AnATeUdd2zIoJDduS',
        'https://lh3.googleusercontent.com/d/1OfWj9tIedJtKm85f0TPRAZ8m8GQGWJcu',
        'https://lh3.googleusercontent.com/d/1f519pz4BW-z4X7mAKrGF5odmUvSPj62h'
      ],
      description: "Discover modern luxury and tailored hospitality at OD-V!CK'S LUXE in Wuse Zone 4, Abuja. Located on Kitwe Street, offering versatile accommodations from cozy Standard rooms to opulent Presidential suites equipped with high-speed WiFi, top-tier security, and fine dining."
    },
    {
      id: 'e-suites-luxury-hotel-abuja',
      name: 'E-Suites Luxury Hotel',
      location: '21 Jesse Jackson St, off Jimmy Carter Street, Asokoro, Abuja 900103, Federal Capital Territory',
      price: '40,000',
      tiers: [
        { name: 'Standard Room', price: '40,000' },
        { name: 'Executive Room', price: '48,000' },
        { name: 'Junior Suite', price: '59,000' },
        { name: 'Executive Suite (Room & Parlor)', price: '79,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1h0fYtcUi33r8gQCOOPnDzzHp316THFb6',
        'https://lh3.googleusercontent.com/d/1O3ysWDurhW40hL1Zcjx1ZfeJxnHrFe1W',
        'https://lh3.googleusercontent.com/d/1akTSI-AYko2oyS_XxND_BYKYWCISuwrs',
        'https://lh3.googleusercontent.com/d/1Cv4PPNS_8I10JANfCgis78J_224fSUSI'
      ],
      description: 'Experience refined hospitality and exclusive tranquility at E-Suites Luxury Hotel in Asokoro, Abuja. Situated on Jesse Jackson Street off Jimmy Carter Street, offering well-appointed Standard and Executive rooms, Junior Suites, and Executive Room & Parlor suites with top-class amenities and pristine security.'
    },
    {
      id: 'plush-hotel-abuja',
      name: 'Plush Hotel',
      location: '5 Mbala St, Zone 4, Abuja 904101, Federal Capital Territory',
      price: '33,000',
      tiers: [
        { name: 'Standard Room', price: '33,000' },
        { name: 'Executive Room', price: '74,000' },
        { name: 'Deluxe Suite', price: '96,000' },
        { name: 'Plush Presidential Suite', price: '126,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1-WZFdKBZLfE9hSw0q5o2Vk0urztHN4AS',
        'https://lh3.googleusercontent.com/d/1lAfUwfL_n7ys7570GTZkf32Taowsv32p',
        'https://lh3.googleusercontent.com/d/1KFZ-3pmoGcbDWVJJNuVcsHk4AOiERoDB',
        'https://lh3.googleusercontent.com/d/11B4PQbCkDJxysY6VPZgcLVnPa0elhpnx'
      ],
      description: 'Experience plush comfort and contemporary hospitality at Plush Hotel in Zone 4, Wuse, Abuja. Conveniently located on Mbala Street, offering stylishly finished Standard and Executive rooms to luxurious Deluxe and Presidential Suites with top-notch security and 24/7 guest services.'
    },
    {
      id: 'berbera-palace-royale-abuja',
      name: 'Berbera Palace Royale',
      location: 'Zone 6, 2 Berbera St, Wuse, Abuja 900108, Federal Capital Territory',
      price: '38,000',
      tiers: [
        { name: 'Standard Room', price: '38,000' },
        { name: 'Deluxe Room', price: '43,000' },
        { name: 'Executive Room', price: '48,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1VGNBPX9IwiGkHa25VABih8oba8K1I9IV',
        'https://lh3.googleusercontent.com/d/1u90xkfvdEQ4y8avhaa_bHg95DW0L8582',
        'https://lh3.googleusercontent.com/d/1knkVYmrhRYTqkHeh7psftduN7pNmSaDC',
        'https://lh3.googleusercontent.com/d/1bsdKWJ7AviyMvFtgPUL6668MA17PVsjk'
      ],
      description: 'Experience royal comfort and peaceful relaxation at Berbera Palace Royale in Wuse Zone 6, Abuja. Ideally located on Berbera Street, offering elegant Standard, Deluxe, and Executive accommodations equipped with modern amenities, 24/7 security, and exceptional guest services.'
    },
    {
      id: 'hawthorn-suite-by-wyndham-abuja',
      name: 'Hawthorn Suite by Wyndham',
      location: '1 Uke St, Garki 2, Abuja 900001, Federal Capital Territory',
      price: '142,000',
      tiers: [
        { name: 'Queen Bed Efficiency (Studio) 37 SQM', price: '142,000' },
        { name: 'Queen Bed Suite (1 Bedroom Deluxe) 43 SQM', price: '162,000' },
        { name: 'King Bed Suite (1 Bedroom Premium) 55 SQM', price: '176,000' },
        { name: 'King Bed VIP Suite (1 Bedroom Executive) 59 SQM', price: '204,000' },
        { name: 'Queen Bed Suite (2 Bedroom Premium) 50 SQM', price: '235,000' },
        { name: 'King Bed Suite (2 Bedroom Executive) 69 SQM', price: '260,000' },
        { name: 'Presidential Suite (116 SQM)', price: '385,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1C3LMdBx3WLYZ2M0N8LtD_NROlIQRqWWL',
        'https://lh3.googleusercontent.com/d/1OUTXWkYm6QbjceYvTxXCIPEm8WgqmQVs',
        'https://lh3.googleusercontent.com/d/1Sqg7as64croVJA2PhwP0R9ZpROlGQDiB',
        'https://lh3.googleusercontent.com/d/1ozFU561kHoN8opsk8zTVcqxF1xjXzv6G',
        'https://lh3.googleusercontent.com/d/1jjm0DaKnLwJxgFdJ1DH0VVRNvflFD6n_',
        'https://lh3.googleusercontent.com/d/16AhQYAyJCxDSlL_sk6W-XSzgqx0Bmv53',
        'https://lh3.googleusercontent.com/d/1IdGW0Jhxh1xpo1IkF22PtsnNbABi-iro'
      ],
      description: 'Experience world-class hospitality and international standard luxury at Hawthorn Suite by Wyndham in Garki 2, Abuja. Positioned on Uke Street, offering expansive studio efficiencies and 1 to 2 bedroom executive suites up to 116 SQM Presidential Suites equipped with kitchenette facilities, outdoor pool, fitness center, and top-tier security.'
    },
    {
      id: 'knightsbridge-hotel-suites-abuja',
      name: 'Knightsbridge Hotel & Suites',
      location: '32A Katsina-Ala St, Maitama, Abuja 904101, Federal Capital Territory',
      price: '127,000',
      tiers: [
        { name: 'Standard Room', price: '127,000' },
        { name: 'Deluxe Room', price: '147,000' },
        { name: 'Junior Suite', price: '167,000' },
        { name: 'Ambassador Suite', price: '187,000' },
        { name: 'Studio Apartment', price: '239,000' },
        { name: '1 Bedroom Apartment', price: '289,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1ppw9s1z5HPboWPksJCsmznbsbZH0XSU2',
        'https://lh3.googleusercontent.com/d/1uCEDIuaaxKbzV93iujoqRECC29dpTrE2',
        'https://lh3.googleusercontent.com/d/1HBGN2IvyOpA84WBAa1tTHLSX6B7iJNv4',
        'https://lh3.googleusercontent.com/d/16I0wWfqyf9Uan2XS3bsES_qhpqBbaW0I',
        'https://lh3.googleusercontent.com/d/1NKUrjPcJaX6R4WuOylxRv6bx8A5nNS7E',
        'https://lh3.googleusercontent.com/d/1qPdUKN-wK7afK4wDF53V3maCyMv-Slm8',
        'https://lh3.googleusercontent.com/d/1Dvukv_P7i_uV04eJSFFgMM-KdqVmQ_nn'
      ],
      description: 'Experience pristine British-inspired luxury and refined elegance at Knightsbridge Hotel & Suites in Maitama, Abuja. Located on Katsina-Ala Street, offering exquisite Standard & Deluxe rooms, Ambassador Suites, and high-end Studio and 1 Bedroom Apartments with premium amenities and top-flight security.'
    },
    {
      id: 'power-mike-hotel-abuja',
      name: 'Power Mike Hotel',
      location: 'Area 1, 9 Argungu Close, off Benue Cres, Garki, Abuja, Federal Capital Territory',
      price: '28,000',
      tiers: [
        { name: 'Standard Room', price: '28,000' },
        { name: 'Executive Room', price: '31,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1IkVa_ndAm9MwwiZ3mEHHd1nk-cLuMgie',
        'https://lh3.googleusercontent.com/d/19AvZGRSSgb3BEuGvZYQQAhHrNjMmvFVq',
        'https://lh3.googleusercontent.com/d/1oz5jMr0uH26vgB80hdA5h9sTAWolHa5g'
      ],
      description: 'Enjoy cozy hospitality and convenient comfort at Power Mike Hotel in Area 1, Garki, Abuja. Located on Argungu Close off Benue Crescent, offering well-furnished Standard and Executive rooms with round-the-clock power, secure surroundings, and friendly service.'
    },
    {
      id: 'yellow-trumpet-hotel-abuja',
      name: 'Yellow Trumpet Hotel',
      location: '51 Euphrates Cres, Wuse, Abuja 904101, Federal Capital Territory',
      price: '109,000',
      tiers: [
        { name: 'Deluxe Room', price: '109,000' },
        { name: 'Superior Room', price: '123,000' },
        { name: 'Executive Room', price: '144,000' },
        { name: 'Suite', price: '223,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1FWEd22GIHLV0KbZ7JAlH5Vp2pm4GduPZ',
        'https://lh3.googleusercontent.com/d/1HyQjC_UjE6ZAJSJjuU9AoZmVdUu0emHH',
        'https://lh3.googleusercontent.com/d/13yZSwP6C8t42PZjpPq93xvoj8HRbogxT',
        'https://lh3.googleusercontent.com/d/1GQNy8wVijN0cWYl3DQfwYmtXvRJX3oeO'
      ],
      description: 'Experience boutique elegance and contemporary luxury at Yellow Trumpet Hotel in Wuse, Abuja. Located on Euphrates Crescent, offering tastefully styled Deluxe, Superior, and Executive rooms, as well as grand Suites with fine dining, 24/7 security, and superior comfort.'
    },
    {
      id: 'tranquila-hotels-and-suites-abuja',
      name: 'Tranquila Hotels and Suites',
      location: 'Plot 1731 off Ahmadu Bello Wy, Mabushi, Abuja 900108, Federal Capital Territory',
      price: '79,000',
      tiers: [
        { name: 'Deluxe Room', price: '79,000' },
        { name: 'Executive Room', price: '88,000' },
        { name: 'Super Executive Room', price: '99,000' },
        { name: 'Diamond Suite', price: '105,000' },
        { name: 'Royal Suite', price: '116,000' },
        { name: 'Royal Suite Plus', price: '135,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1QJhB8sDrwy67XfkYOGyXNqmO6Fa8i_Ii',
        'https://lh3.googleusercontent.com/d/1wiBDmtM7fDy60cIaDPMiIwHMkLSWa1cM',
        'https://lh3.googleusercontent.com/d/1hVpHT0yrmU5D3hpXE730BKhbqTs2bzB2',
        'https://lh3.googleusercontent.com/d/1OsFar4mmudjgItNtPnN0LQHoLgRW6s3y',
        'https://lh3.googleusercontent.com/d/18niHZCMokGN6b2_R1XvnTti4nqWz-5AA',
        'https://lh3.googleusercontent.com/d/1PaPU3MvVsXOSG1w-XhHOySE2ZLv3w5tz',
        'https://lh3.googleusercontent.com/d/18sgQZlq3n0cVOvIxACxKeUbIecDYIWc1'
      ],
      description: 'Enjoy tranquil luxury and serene ambiance at Tranquila Hotels and Suites in Mabushi, Abuja. Located on Plot 1731 off Ahmadu Bello Way, offering plush Deluxe and Executive rooms to regal Royal Plus suites, equipped with high-speed internet, gourmet dining, 24/7 security, and world-class guest services.'
    }
  ];

  const lagosHotels = [
    {
      id: 'mayoral-hotel-suites',
      name: 'Mayoral Hotel n Suites',
      location: '14 Aminu Ajibode Avenue, Isheri Olofin, Lagos',
      price: '21,500',
      tiers: [
        { name: 'Diamond', price: '43,500' },
        { name: 'Exclusive', price: '38,500' },
        { name: 'Silver', price: '33,500' },
        { name: 'Top Tier', price: '28,500' },
        { name: 'Bronze', price: '23,500' },
        { name: 'Basic', price: '21,500' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/16Joa5DhAFvhxaJUpdTJHAQ9Et2Cgndyt',
        'https://lh3.googleusercontent.com/d/1_7XUY5Jd-mnDhwlOFKDso6CFrjhxe2Oh',
        'https://lh3.googleusercontent.com/d/1CYPxmvY8ARU_w_bV2GDUbM-3dBObW5ww',
        'https://lh3.googleusercontent.com/d/17WHOtWaRY5FcZQAxAAiQt7AoTkDz19rN',
        'https://lh3.googleusercontent.com/d/1K3iq3GoHX4z2elXo_QGMWWo9HT5vjMol'
      ],
      description: 'Experience refined elegance, relaxing comfort, and stellar hospitality at Mayoral Hotel n Suites, perfectly situated at 14 Aminu Ajibode Avenue, Isheri Olofin, Lagos. Unwind in meticulously finished accommodations from our cozy Basic selection to elite Diamond suites designed for a stellar stay.'
    },
    {
      id: 'the-yatch-hotel',
      name: 'The Yatch Hotel',
      location: '17 Admiralty Rd, Lekki Phase 1, Lagos',
      price: '310,000',
      tiers: [
        { name: 'Diamond [SEA VIEW]', price: '477,000' },
        { name: 'Exclusive [SEA VIEW]', price: '453,000' },
        { name: 'Silver [CITY VIEW]', price: '334,000' },
        { name: 'Top Tier [CITY VIEW]', price: '310,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1qYP3Bg9EUdWRiEwleNFO9EnH-I8a4NOU',
        'https://lh3.googleusercontent.com/d/1BFStPP9f73uoOrX10Zcb7PKuBNa-IHmX',
        'https://lh3.googleusercontent.com/d/1S1Cu-__ahcGTTdS4PZOhgVWV2Bh4Er-1',
        'https://lh3.googleusercontent.com/d/1txN6JxIXZtnyz2lmZcqKTtIyXH_enz6U'
      ],
      description: 'Experience maritime grandeur, sophisticated harbor living, and elite privilege at The Yatch Hotel, phenomenally situated at 17 Admiralty Road, Lekki Phase 1, Lagos. Offering prestigious premium accommodations curated with spectacular City View and breathtaking Sea View options for an unforgettable ultra-luxury voyage.'
    },
    {
      id: 'preserve-hotel',
      name: 'Preserve Hotel',
      location: '14 Babatunde Dabiri St, Eti-Osa, Lagos',
      price: '38,000',
      tiers: [
        { name: 'Gold', price: '160,000' },
        { name: 'Diamond', price: '74,000' },
        { name: 'Exclusive', price: '64,000' },
        { name: 'Silver', price: '59,000' },
        { name: 'Top Tier', price: '48,000' },
        { name: 'Bronze', price: '43,000' },
        { name: 'Basic', price: '38,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1KFL0_2A-tDWb-FU1jUqEuTGLxEJ4feQ-',
        'https://lh3.googleusercontent.com/d/1C-iYDHcq6zsOF32h96OUTq4sZPj-keZV',
        'https://lh3.googleusercontent.com/d/1aUXm3DY3YUtWMh-OE-ayt8LWJxp_i1xc'
      ],
      description: 'Discover serene luxury and exquisite wellness at Preserve Hotel, located at 14 Babatunde Dabiri Street, Eti-Osa, Lagos. Unwind in top-class accommodations meticulously finished from our comfortable Basic rooms to the prestigious executive Gold suites designed for absolute rest.'
    },
    {
      id: 'morning-side-suites',
      name: 'Morning Side Suites',
      location: '11b Taslim Elias Cl, Victoria Island, Lagos',
      price: '74,000',
      tiers: [
        { name: 'Exclusive', price: '210,000' },
        { name: 'Silver', price: '159,000' },
        { name: 'Top Tier', price: '109,000' },
        { name: 'Bronze', price: '85,000' },
        { name: 'Basic', price: '74,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1HrbSV1cW9dDW3K5uzR3kELyKKOlAYR_v',
        'https://lh3.googleusercontent.com/d/1oyY1vKVMOp8N8cC5dbJ4SKGQhxqpij-m',
        'https://lh3.googleusercontent.com/d/1Kc_53A8uL_FDDCpxG5OfioD-9yJ6QMQN'
      ],
      description: 'Indulge in unparalleled boutique comfort at Morning Side Suites, beautifully situated on 11b Taslim Elias Close, Victoria Island, Lagos. Experience exceptional service, outstanding suites, and top-tier amenities tailored for discerning business and leisure travelers alike.'
    },
    {
      id: 'the-atrium-lagos',
      name: 'The Atrium Lagos',
      location: 'Plot 19, Block 1a, Agoro St, Omole Phase 1, Ikeja, Lagos',
      price: '109,300',
      tiers: [
        { name: 'Diamond', price: '176,200' },
        { name: 'Exclusive', price: '139,000' },
        { name: 'Silver', price: '124,300' },
        { name: 'Top Tier', price: '109,300' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1vLqeHmx4yh4DrPvbybqYPfLzi_zv6lJt',
        'https://lh3.googleusercontent.com/d/1W-jKpdx3wFdXF5D12eq6Y-2h8kKf5XTf',
        'https://lh3.googleusercontent.com/d/1zHRyXiZ-IupFg43iKZ0XOkzIdS35qLwl',
        'https://lh3.googleusercontent.com/d/1GX23MbKq92gDD96L1Us3zgW_qT-iuZlU'
      ],
      description: 'Experience state-of-the-art hospitality, contemporary design, and unparalleled comfort at The Atrium Lagos, nested at Plot 19, Block 1a, Agoro Street, Omole Phase 1, Ikeja, Lagos. Unwind in spacious accommodations tailored from premium Top Tier and Silver settings to elite Diamond suites.'
    },
    {
      id: 'de-rigg-place',
      name: 'De Rigg Place',
      location: '18b Elsie Femi Pearse St, Off Kofo Abayomi St, Victoria Island, Lagos',
      price: '109,000',
      tiers: [
        { name: 'Silver', price: '139,000' },
        { name: 'Top Tier', price: '119,000' },
        { name: 'Bronze', price: '119,000' },
        { name: 'Basic', price: '109,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/17jB-eZXulebISE3wPiIxXXCS_GFsmw53',
        'https://lh3.googleusercontent.com/d/1fDEjRFiwvaPktyMjND0tkGvwpF67db2n',
        'https://lh3.googleusercontent.com/d/1ORgXMhNgLeHRQCY2-R1IOp7u5CESUnvZ',
        'https://lh3.googleusercontent.com/d/18kJYNz6z2UDvSSqpWO5EjSl1UEThz8TE'
      ],
      description: 'Indulge in modern urban convenience and classic warmth at De Rigg Place, located at 18b Elsie Femi Pearse Street, off Kofo Abayomi Street, Victoria Island, Lagos. Perfect for business travelers and luxury seekers wanting proximity to prime commercial and entertainment spots in Lagos.'
    },
    {
      id: 'the-art-hotel',
      name: 'The Art Hotel',
      location: 'Plot 13A, Block 111, Chief Yesufu Abiodun Oniru Rd, Victoria Island, Lagos',
      price: '260,000',
      tiers: [
        { name: 'Emperor', price: '810,000' },
        { name: 'Prince Deluxe', price: '510,000' },
        { name: 'Prince', price: '410,000' },
        { name: 'Duke Superior', price: '310,000' },
        { name: 'Duke Deluxe', price: '290,000' },
        { name: 'Duke Room', price: '260,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1Ei7UcqQRfmzN0Ti8EC_DRD4hhZYd3jSC',
        'https://lh3.googleusercontent.com/d/1nZU8oBATiLm6y0zTJGWtFWSOdXfE2g1w',
        'https://lh3.googleusercontent.com/d/1QpRriQfTMZZ7ZC16I34wtR1POPhaunsN',
        'https://lh3.googleusercontent.com/d/1ORgXMhNgLeHRQCY2-R1IOp7u5CESUnvZ'
      ],
      description: 'Enter a canvas of spectacular curated masterpieces, fine arts, and boutique hospitality at The Art Hotel, situated at Plot 13A, Block 111, Chief Yesufu Abiodun Oniru Road, Victoria Island, Lagos. Elevate your standard of living in exquisite chambers from our luxurious Duke rooms to the grand Emperor suites.'
    },
    {
      id: 'choice-suites-ii',
      name: 'Choice Suites II',
      location: '5 Tiwalade Close, Off Bamisele, Off Allen Avenue, Ikeja, Lagos',
      price: '43,000',
      tiers: [
        { name: 'Top Tier', price: '54,000' },
        { name: 'Bronze', price: '45,000' },
        { name: 'Basic', price: '43,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1NCFwOCYSLyiAf9vlTcEbsKn-5zZVMZKh',
        'https://lh3.googleusercontent.com/d/18kAOZl6w00M6s79teg-KanG9i9TBo7Wk',
        'https://lh3.googleusercontent.com/d/1gupSNT9NWeWgqgiLRTAQJhYTiQe14E9z'
      ],
      description: 'Experience home-away-from-home comfort and warm hospitality at Choice Suites II, nestled in a quiet, secure neighborhood at 5 Tiwalade Close, off Allen Avenue, Ikeja, Lagos. Fully tailored for cozy, relaxing stays with high-value bronze and basic tier selections.'
    },
    {
      id: 'bluemoon-beach-hotel',
      name: 'Bluemoon Beach Hotel',
      location: 'Okunde Blue Water Scheme, 2nd Roundabout, 3/5, Off Remi Olowude St, Eti-Osa, Lekki, Lagos',
      price: '38,000',
      tiers: [
        { name: 'Exclusive', price: '64,000' },
        { name: 'Silver', price: '54,000' },
        { name: 'Top Tier', price: '48,000' },
        { name: 'Bronze', price: '43,000' },
        { name: 'Basic', price: '38,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1A5xjWIe73yx8iZbGVSEVesVAIxK8JN1u',
        'https://lh3.googleusercontent.com/d/1pqx1GqT-YWrskpfoIdlarGzc0eFhGizB',
        'https://lh3.googleusercontent.com/d/1eu9YFYd9kc9chKODUZdxgjOZSvAutVUg'
      ],
      description: 'Unwind by the majestic coastline at Bluemoon Beach Hotel, located in the Okunde Blue Water Scheme, Lekki, Lagos. Offering wonderful breezy atmospheres, relaxing suites, and premier recreational vibes with exquisite room tiers ranging from Basic comfort to gorgeous Exclusive suites.'
    },
    {
      id: 'hotel-capitol',
      name: 'Hotel Capitol',
      location: '6 Animashaun Cl, Gate Akiode Bus Stop, Opp Justrite Supermarket, Opp Omole Phase 1, Ojodu, Ikeja, Lagos',
      price: '38,500',
      tiers: [
        { name: 'Deluxe', price: '129,000' },
        { name: 'Gold', price: '64,500' },
        { name: 'Diamond', price: '54,500' },
        { name: 'Exclusive', price: '50,500' },
        { name: 'Silver', price: '48,500' },
        { name: 'Top Tier', price: '43,500' },
        { name: 'Bronze', price: '41,500' },
        { name: 'Basic', price: '38,500' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1aEtgCcZsqyRZ1ka2kLRWEks3J9R5rucF',
        'https://lh3.googleusercontent.com/d/1X4rg5JbaFw0hZgjj7RHlez86k8kc-VHx',
        'https://lh3.googleusercontent.com/d/1MtMmEZ_PaffrwPoD57QcqA4CiDRDSeDs'
      ],
      description: 'Experience outstanding comfort and stellar customer support at Hotel Capitol, situated in Ojodu, Ikeja. Offering elegantly decorated rooms ranging from cozy Basic options to our luxury Deluxe suites to guarantee a supreme resting environment.'
    },
    {
      id: 'jade-suites',
      name: 'Jade Suites',
      location: '31a Bishop Oluwole St, Off Ahmadu Bello Way, Victoria Island, Lagos',
      price: '28,000',
      tiers: [
        { name: 'Exclusive', price: '57,700' },
        { name: 'Bronze [External Bathroom]', price: '28,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/188cFT_3XOs8GNnf643w3IzgXzzZy_g4O',
        'https://lh3.googleusercontent.com/d/1BBQ181QaS4RV0Vj6sEVqmHYPukDqlDp9'
      ],
      description: 'Enjoy private serenity and stylish lodgings at Jade Suites, ideally situated at Victoria Island, Lagos. Perfect for travelers seeking high-quality stays with options including our budget-friendly Bronze tier and premium Exclusive suites.'
    },
    {
      id: 'de-santos',
      name: 'De Santos Hotel',
      location: '7 Shasha Rd, Akowonjo, Lagos',
      price: '65,000',
      tiers: [
        { name: 'Diamond', price: '95,000' },
        { name: 'Exclusive', price: '84,000' },
        { name: 'Silver', price: '74,000' },
        { name: 'Top Tier', price: '69,000' },
        { name: 'Bronze', price: '65,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/14hQIi58rmnzRNy8zuungb4nFy7nsqxTD',
        'https://lh3.googleusercontent.com/d/146TePf1_bwILKcm2H1MC_NiLFflOG_bz',
        'https://lh3.googleusercontent.com/d/1LBwOGsaXvCuyB4rwHdy7RupTxgt0ayDP'
      ],
      description: 'Discover luxurious relaxation, exceptional event spaces, and warm hospitality at De Santos Hotel, situated at Akowonjo, Lagos. Featuring beautifully customized suites ranging from standard Bronze selections to our elite Diamond executive rooms.'
    },
    {
      id: 'eko-hotel-suites',
      name: 'Eko Hotel & Suites',
      location: '1415 Adetokunbo Ademola St, Victoria Island, Lagos',
      price: '345,000',
      tiers: [
        { name: 'Presidential Suite [Eko Signature]', price: '2,510,000' },
        { name: 'Presidential Suite [Main Building]', price: '2,510,000' },
        { name: 'Signature Suite [Eko Signature]', price: '1,360,000' },
        { name: 'Premium Suite [Eko Signature]', price: '1,160,000' },
        { name: 'Diplomatic Suite [Main Building]', price: '1,110,000' },
        { name: 'Executive Suite [Eko Suites]', price: '1,010,000' },
        { name: 'Classic Suite [Main Building]', price: '790,000' },
        { name: 'Club Suite [Eko Signature]', price: '685,000' },
        { name: 'Studio Suite [Eko Suites]', price: '610,000' },
        { name: 'Eko Queen Room [Main Building]', price: '610,000' },
        { name: 'Eko Atlantic Superior Room [Main Building]', price: '510,000' },
        { name: 'Deluxe Room [Eko Suites]', price: '485,000' },
        { name: 'Eko Classic Superior Room [Main Building]', price: '455,000' },
        { name: 'Eko Garden Superior', price: '380,000' },
        { name: 'Eko Garden Classic', price: '345,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1O7mJ9Lsyrvt5XNNqsnm8inJvtq04e9ES',
        'https://lh3.googleusercontent.com/d/114CmsZqwOYUMWktMSRr8GMGgm2ehwsPn',
        'https://lh3.googleusercontent.com/d/1GWPdfN80SSUWK7oW38M7V6nXYG_h2Q6G',
        'https://lh3.googleusercontent.com/d/1tA64dyDwBX1HI77cWgQI1KZ9_09SrUp3'
      ],
      description: "Nigeria's premier luxury hotel landmark. Experience the grandeur of Eko Hotel & Suites on Adetokunbo Ademola Street, Victoria Island, Lagos. Boasting unparalleled luxury suites, world-class restaurants, and stunning city and ocean views tailored for elite global citizens."
    },
    {
      id: 'safron-hotel',
      name: 'Safron Hotel',
      location: '57 Joel Ogunnaike St, Onigbongbo, Ikeja, Lagos',
      price: '219,000',
      tiers: [
        { name: 'Penthouse', price: '659,000' },
        { name: 'Executive Room', price: '304,000' },
        { name: 'Superior Room', price: '259,000' },
        { name: 'Deluxe Room', price: '239,000' },
        { name: 'Classic Room', price: '219,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1sWESMTDtC8CI0y-BSIHUOLb8TqV8nvit',
        'https://lh3.googleusercontent.com/d/1rcOzSjmvnNgbHdY0tmJfzn149T62uCz4',
        'https://lh3.googleusercontent.com/d/1G9Wp7h_aUUJaGEatnKY8HB5WL6iCHHlF',
        'https://lh3.googleusercontent.com/d/1BQeY22jwNcs5FbwrsItbo1eDiNNqXOSm'
      ],
      description: 'Discover the height of bespoke hotel service and boutique rest at Safron Hotel, elegantly positioned at GRA Ikeja, Lagos. Perfect for executive lodging, featuring gourmet breakfast for two and top-tier amenities.'
    },
    {
      id: 'monty-suites-lagos',
      name: 'Monty Suites',
      location: '16 Adebayo Doherty Rd, Eti-Osa, Lagos',
      price: '146,000',
      tiers: [
        { name: 'Executive Suite', price: '259,000' },
        { name: 'Junior Suite', price: '212,000' },
        { name: 'Deluxe Room', price: '182,000' },
        { name: 'Standard Room', price: '159,000' },
        { name: 'Classic Room', price: '146,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/18EJgcXAkDCKQZwopz2HfEqtaTt4F_3HT',
        'https://lh3.googleusercontent.com/d/14Ggm46xOy-eu1Ut1iqIqYxqSND5A-N68',
        'https://lh3.googleusercontent.com/d/1-qPL5HBrR79Dl9P7qSD6OnhlYdVjgsAo',
        'https://lh3.googleusercontent.com/d/1kcW93WfPvFTbjgvkDGCY8OrfqhYcRRHJ'
      ],
      description: 'Experience state-of-the-art service, contemporary executive comfort, and refined hospitality at Monty Suites, located in Lekki / Eti-Osa, Lagos. Designed perfectly for standard and suite stays of premium grandeur.'
    },
    {
      id: 'royal-jatoz-hotels',
      name: 'Royal Jatoz Hotel',
      location: '9 Rasmon Street, Off Osolo Wy, Ikeja, Lagos',
      price: '46,000',
      tiers: [
        { name: 'Top Tier', price: '54,000' },
        { name: 'Basic', price: '46,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1bW_lVC4TLOpZ_Yvx5CleluPcv0mq2Cx9',
        'https://lh3.googleusercontent.com/d/1qEo4qKQDWAOQcUDNN8CsTV7wePhhX3Rt',
        'https://lh3.googleusercontent.com/d/1fYbVWl-P9YOFkgqrGvLbbkCIb_uBBTZs',
        'https://lh3.googleusercontent.com/d/1ccXLxhgQWTIS9gv_6yG6jIJW7cPckmuJ'
      ],
      description: 'Experience relaxing stays, high-value comfort, and excellent hospitality at Royal Jatoz Hotel on Rasmon Street, off Osolo Way, Ikeja, Lagos. A perfect spot for cozy, convenient lodging.'
    },
    {
      id: 'great-ville-lagos',
      name: 'Great Ville Lagos',
      location: '36/38 Nathan Street, Off Ojuelegba Road, Surulere, Lagos',
      price: '46,000',
      tiers: [
        { name: 'Twin/ Executive', price: '74,000' },
        { name: 'Deluxe', price: '64,000' },
        { name: 'Classic', price: '54,000' },
        { name: 'Standard', price: '46,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/12TjfSMKWl9cLVFKJ2dPYeSmeAzWkLnO1',
        'https://lh3.googleusercontent.com/d/1skH8uAer7aWqkMYBvaWwgGvrCqAcSFYT',
        'https://lh3.googleusercontent.com/d/1RUP6mq9LPhABVxGXxKceMHR6fGdmSpri',
        'https://lh3.googleusercontent.com/d/1760alA-M5uz87rgtKtIstH9aS6I3sUmE'
      ],
      description: 'Discover wonderful convenience and premium lodging at Great Ville Lagos on Nathan Street, off Ojuelegba Road, Surulere, Lagos. Featuring a selection of cozy, comfortable accommodations styled to satisfy every traveler.'
    },
    {
      id: 'the-colossus-hotel',
      name: 'The Colossus Hotel',
      location: '4 Sheraton Link Rd, Maryland, Lagos 101233',
      price: '129,750',
      tiers: [
        { name: 'Presidential Suite', price: '359,750' },
        { name: 'Royal Suite', price: '299,000' },
        { name: 'Continental Suite', price: '269,500' },
        { name: 'Diplomatic Suite', price: '229,250' },
        { name: 'Business Suite', price: '204,000' },
        { name: 'Junior Suite', price: '159,750' },
        { name: 'Executive Room', price: '144,000' },
        { name: 'Standard Room', price: '129,750' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1n41kH1DZpYH9fN1GIHkLFIlR0GZihDLH',
        'https://lh3.googleusercontent.com/d/1QScV-e3nJVcns1RrGk8bg1sdoekKc6Xx',
        'https://lh3.googleusercontent.com/d/1yDrThOOOMC3VgTNkOGt1b4JlJ97i03nL',
        'https://lh3.googleusercontent.com/d/1Q8tU5zxaPv8nNWxhvCXmoNG1dU2Bd61U',
        'https://lh3.googleusercontent.com/d/1u6Ixp5KiXMkx3uQ2TfECuAXXshS3Bh0u',
        'https://lh3.googleusercontent.com/d/1nR_MQpmt_tG1mUV6RYRa2CKymY-Ohmr3'
      ],
      description: 'Experience majestic grandeur and top-tier luxury living at The Colossus Hotel, phenomenally situated at 4 Sheraton Link Road, Maryland, Lagos. Unwind in superb boutique suites fully designed for exquisite luxury, featuring our signature presidential and royal guest suites.'
    },
    {
      id: 'nordic-hotel',
      name: 'Nordic Hotel',
      location: '258 Kofo Abayomi St, Victoria Island, Lagos',
      price: '274,000',
      tiers: [
        { name: 'H.C. Andersen Suite', price: '1,215,000' },
        { name: 'Junior Suite', price: '759,000' },
        { name: 'Executive Room [Double]', price: '529,000' },
        { name: 'Executive Room [Single]', price: '499,000' },
        { name: 'Deluxe Room [Double]', price: '489,000' },
        { name: 'Deluxe Room [Single]', price: '450,000' },
        { name: 'Superior Room [Double]', price: '379,000' },
        { name: 'Superior Room [Single]', price: '349,000' },
        { name: 'Standard Room [Double]', price: '349,000' },
        { name: 'Standard Room [Single]', price: '319,000' },
        { name: 'Economy Room [Single]', price: '274,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1j4F-_Fi7yS5Gmq-AC2oZKaZFaQjxf_o3',
        'https://lh3.googleusercontent.com/d/1uRKq1cOaQY-DkJAlEQ_yM3_Uk0fGqk6O',
        'https://lh3.googleusercontent.com/d/18k_TBvkU_-3SPGCGlm6jx_TmYiTHM5Va',
        'https://lh3.googleusercontent.com/d/1ZAnO1gkeXU2OR5a5_oWODSYrKSeI4TQq',
        'https://lh3.googleusercontent.com/d/1d7wt3RMd0PcwpwDBdRPSheSMhwFIm-mD'
      ],
      description: 'Discover the ultimate luxury and Danish-inspired design at Nordic Hotel, situated in Victoria Island, Lagos. Featuring high-end amenities, superb customer care, and spectacular, tranquil suites engineered for maximum comfort.'
    },
    {
      id: 'greywood-hotel-apartment',
      name: 'Greywood Hotel & Apartment',
      location: 'After Jendor Supermarket, 20 Tijani Bello St, opp. Colors Store, beside Chicken Republic, Ojodu, Ikeja 101233, Lagos',
      price: '43,500',
      tiers: [
        { name: 'Apartment', price: '159,000' },
        { name: 'Suite', price: '95,000' },
        { name: 'Superior Room [Double]', price: '66,500' },
        { name: 'Superior Room [Single]', price: '58,500' },
        { name: 'Super Executive [Double]', price: '56,500' },
        { name: 'Super Executive [Single]', price: '48,500' },
        { name: 'Executive Room [Double]', price: '50,500' },
        { name: 'Executive Room [Single]', price: '43,500' }
      ],
      note: 'Caution fee needed',
      images: [
        'https://lh3.googleusercontent.com/d/1EAqX49tn1Ey3yqyZCWhEVynNrQtO87II',
        'https://lh3.googleusercontent.com/d/1N-1Kme6r_ikG-1hghBm2MShnWFIIbZ-l',
        'https://lh3.googleusercontent.com/d/1oXj9AEmy1c6mm2vPjOUjbDpl1E5RRQd6',
        'https://lh3.googleusercontent.com/d/1r-ynfpvqDqxcyGQdX_FZAzh10XmoCrhU'
      ],
      description: 'Experience stylish apartments and executive rest at Greywood Hotel & Apartment, located at Ojodu, Ikeja. Offering top-quality service, contemporary interiors, and beautiful leisure spaces.'
    },
    {
      id: 'presken-hotel-lekki',
      name: 'Presken Hotel',
      location: '19 Michael Olawale-Cole Dr, Lekki Phase 1, Lekki 100212, Lagos',
      price: '69,750',
      tiers: [
        { name: 'Exclusive', price: '131,000' },
        { name: 'Silver', price: '94,800' },
        { name: 'Top Tier', price: '89,500' },
        { name: 'Bronze', price: '77,550' },
        { name: 'Basic', price: '69,750' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1O053ZxwcCk3b0ZSw4Yhta6P7GrYs71n9',
        'https://lh3.googleusercontent.com/d/1UEZmxjKqxizyf1LiJ_HZhkChHX8r_nmZ',
        'https://lh3.googleusercontent.com/d/12iiEPGfU6i3lpcmmITy870tgpr_Ghb3l'
      ],
      description: 'Relax in stylish, state-of-the-art accommodations at Presken Hotel, perfectly situated in Lekki Phase 1, Lagos. A premium destination for executive business travelers and cozy staycations.'
    },
    {
      id: 'boss-hotel',
      name: 'Boss Hotel',
      location: '14/18 Oseni Agoro St, Oshodi-Isolo, Lagos 100261, Lagos',
      price: '18,000',
      tiers: [
        { name: 'Silver', price: '33,000' },
        { name: 'Top Tier', price: '28,000' },
        { name: 'Bronze', price: '23,000' },
        { name: 'Basic', price: '18,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1qoFoULcnjFPX52Zf7Yk-g9frzawD5Jy1',
        'https://lh3.googleusercontent.com/d/1zw6Haf938Fq4-IROdsvOEiJYdBNqWBeN',
        'https://lh3.googleusercontent.com/d/11wKnpVWtbucc-UfJL-QsME6y339CSNcv'
      ],
      description: 'Experience warm hospitality, clean accommodations, and fantastic value at Boss Hotel, located in Oshodi-Isolo, Lagos. Providing budget-friendly, high-comfort rooms for everyday travelers.'
    },
    {
      id: 'blue-moon-hotel-vi',
      name: 'Blue Moon Hotel',
      location: '317 Akin Ogunlewe Rd, Oniru Rd, Victoria Island, Lagos 106104, Lagos',
      price: '43,000',
      tiers: [
        { name: 'Exclusive', price: '74,000' },
        { name: 'Silver', price: '63,000' },
        { name: 'Top Tier', price: '53,000' },
        { name: 'Bronze', price: '48,000' },
        { name: 'Basic', price: '43,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1ZysS-yYeKI5NANOnNaNAV5PJ9FhPNCDk',
        'https://lh3.googleusercontent.com/d/1973x5b7H4w6M9sOL1hL7Kijrh3wt8Pb_',
        'https://lh3.googleusercontent.com/d/1x3myQ-qxH9Gn4GXecLnF7vCeBjZzmEh0'
      ],
      description: 'Enjoy stellar urban comfort and premium boutique hosting at Blue Moon Hotel, ideally positioned near Oniru Road, Victoria Island, Lagos. A supreme option for premium executive rest.'
    },
    {
      id: 'lilygate-hotel',
      name: 'Lilygate Hotel',
      location: '2 Olubunmi Owa Street, off Admiralty Wy, Lekki Phase 1, Lagos 105102',
      price: '170,500',
      tiers: [
        { name: 'Classic Executive Suite', price: '358,000' },
        { name: 'Classic Business Suite', price: '328,000' },
        { name: 'Deluxe Room', price: '180,500' },
        { name: 'Classic Room', price: '170,500' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1via6EjQYUYtHNerlkr8rHFfS8ffFaWj_',
        'https://lh3.googleusercontent.com/d/19WzKoM7OTYuw2zkM_nluy55AoPWJmx8C',
        'https://lh3.googleusercontent.com/d/1eDdmvgxHTgLWV-iXkWYTUuPUayZ43xNR'
      ],
      description: 'Experience refined service, boutique high-end interiors, and supreme comfort at the stunning Lilygate Hotel in Lekki Phase 1, Lagos. A highly popular option with wonderful luxury suites.'
    },
    {
      id: 'whitechase-hotel-1',
      name: 'Whitechase Hotel 1',
      location: '9, Church Street, off Vulcanizer Bus Stop, Akowonjo, Egbeda, Alimosho, Lagos 100275',
      price: '38,000',
      tiers: [
        { name: 'Top Tier', price: '48,000' },
        { name: 'Bronze', price: '43,000' },
        { name: 'Basic', price: '38,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1_zzxHJFTGx1W-8jHO_YVIZtDwex9zBsT',
        'https://lh3.googleusercontent.com/d/1yTX2Tew_X4iYRluS5_G5WhkMgz9uNmh0',
        'https://lh3.googleusercontent.com/d/1g0Ya3KVoUwGD8as0b2OhbMP7ZzCZC__W',
        'https://lh3.googleusercontent.com/d/1DaSf_HJw0q9MrOQGZxtGvcK243y25GQH'
      ],
      description: 'Unwind at Whitechase Hotel 1, situated in Akowonjo, Alimosho, Lagos. Providing tidy rooms, safe parking, and great amenities for business and personal travel.'
    },
    {
      id: 'mountain-top-hotel',
      name: 'Mountain Top Hotel',
      location: 'Grammar School Bus Stop, 16 Olaleke Taiwo St, off Aina Rd, Ojodu, Ojodu Berger 100213, Lagos',
      price: '38,000',
      tiers: [
        { name: 'Exclusive', price: '58,000' },
        { name: 'Silver', price: '48,000' },
        { name: 'Top Tier', price: '43,000' },
        { name: 'Bronze', price: '38,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1rvgjYdZ3Q_8-GpoS2sx7cECgSO3fW2Sr',
        'https://lh3.googleusercontent.com/d/1oo5m0nIBlk3_Empe6TgFAYY1lO3I4hVL',
        'https://lh3.googleusercontent.com/d/1Ka8jBCipS38BEIQt7u-cn75S6ZVrVGtt'
      ],
      description: 'Experience stunning views and peaceful hospitality at Mountain Top Hotel, located in Ojodu Berger, Lagos. Fully designed for rest, staycations, and delightful customer service.'
    },
    {
      id: 'opera-classic-suite',
      name: 'Opera Classic Suite',
      location: '102, Festac Link Road, by Raji Rasaki Junction, Festac Town, Lagos',
      price: '18,000',
      tiers: [
        { name: 'Silver', price: '53,000' },
        { name: 'Top Tier', price: '43,000' },
        { name: 'Bronze', price: '33,000' },
        { name: 'Basic', price: '18,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1Qwiabm43tpJMKENjZKNWCS5sRuuaK2OS',
        'https://lh3.googleusercontent.com/d/1nZdIMfoXj7H49B2_eyPTCGDv8H1Tpyzo',
        'https://lh3.googleusercontent.com/d/1rXuygLjXbQpLw0eBnmuSA3TyVUKKrEpI'
      ],
      description: 'Experience premium luxury and cozy boutique hospitality at Opera Classic Suite, excellently located in Festac Town, Lagos. Your private gateway to relaxation and delightful city vibes.'
    },
    {
      id: 'apartment-royale',
      name: 'Apartment Royale Hotel',
      location: '13 Wole Ogunjimi St, Allen, Ikeja 100281, Lagos',
      price: '59,000',
      tiers: [
        { name: 'Presidential Royale Suite', price: '479,000' },
        { name: 'Pent Royale', price: '258,000' },
        { name: 'Prestige Royale Deluxe (3 B/R)', price: '248,000' },
        { name: 'Prestige Royale Deluxe (2 B/R)', price: '208,000' },
        { name: 'Family Room', price: '137,000' },
        { name: 'Executive Royale Suite', price: '94,000' },
        { name: 'Executive Royale Family', price: '94,000' },
        { name: 'Executive Mini-Royale', price: '84,000' },
        { name: 'Mini-Royale', price: '79,000' },
        { name: 'Executive Superior Room', price: '74,900' },
        { name: 'Superior Room', price: '67,500' },
        { name: 'Deluxe Room', price: '62,900' },
        { name: 'Classic Room', price: '59,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1r2xOy3KLVr0sp5L971BDaAMnRbc0iEiE',
        'https://lh3.googleusercontent.com/d/1NJ0NRrL5sQkz3-Kw4Zy-O_v_g-8j0pHK',
        'https://lh3.googleusercontent.com/d/1NkLhOKWKna4SvQ620QT3Cl8UIzkVjw3s',
        'https://lh3.googleusercontent.com/d/1R2A-o6Tecy8eD05NR-prnHRSY9nUWKIn'
      ],
      description: 'Discover upscale boutique residences, majestic rooms, and delightful hospitality at Apartment Royale Hotel, nestled at 13 Wole Ogunjimi Street, Allen, Ikeja, Lagos. Perfect for short and long term executive business stays, offering top-tier presidential suites, family suites, and modern penthouses.'
    },
    {
      id: 'pasadena-suites',
      name: 'Pasadena Suites',
      location: 'Plot 1 Block, 54A Rasheed Alaba Williams Street, Lekki Phase I, Lagos',
      price: '54,000',
      tiers: [
        { name: 'Presidential Suite', price: '126,000' },
        { name: 'Executive Suite', price: '84,000' },
        { name: 'King\'s Deluxe Suite', price: '74,000' },
        { name: 'Deluxe Suite', price: '54,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1E_eotBZ5S99SdP5wamrFMzMN9CYFWASo',
        'https://lh3.googleusercontent.com/d/1kFsttGyyvAYdP0VZajGHPX0iqIfa8mEd',
        'https://lh3.googleusercontent.com/d/1emCAN337V_4XkCIzbyi1NXNMhYAuaMlX',
        'https://lh3.googleusercontent.com/d/1VNi3w6rw9EaRCmgmBGdDWx12d8xosdV4'
      ],
      description: 'Unwind in pure serenity and customized premium suites at Pasadena Suites, ideally located along Rasheed Alaba Williams Street, Lekki Phase I, Lagos. Featuring beautifully crafted presidential, executive, and deluxe suite configurations for ultimate relaxation.'
    },
    {
      id: 'skyrock-hotel',
      name: 'Skyrock Hotel',
      location: '24 Ogunsiji Cl, Allen, Ikeja 101233, Lagos',
      price: '43,000',
      tiers: [
        { name: 'Silver', price: '81,000' },
        { name: 'Top Tier', price: '59,000' },
        { name: 'Bronze', price: '46,000' },
        { name: 'Basic', price: '43,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1UQ2IUMjjHkAURpgH2_BE_qifpxjYHA9w',
        'https://lh3.googleusercontent.com/d/1z0Tvfidy-pY5AJQboDzTZCM3uyJOJUGA',
        'https://lh3.googleusercontent.com/d/1g0-MQ7G4HzVSXAj8TEXasT-zieFKgwXN'
      ],
      description: 'Immerse yourself in sleek style and boutique elegance at Skyrock Hotel, conveniently located along Ogunsiji Close, off Allen Avenue, Ikeja, Lagos. Fully tailored for maximum comfort and relaxation, featuring beautifully appointed rooms and premium suites.'
    },
    {
      id: 'the-view-hotel',
      name: 'The View Hotel',
      location: 'Chief Collins Uchidiuno Street, Fola Osibo Road, 1 Godwin Omene St, Lekki Phase 1, Lagos',
      price: '69,000',
      tiers: [
        { name: 'Penthouse Suite [Breakfast Incl.]', price: '136,000' },
        { name: 'Presidential Suite', price: '126,000' },
        { name: 'Executive Room', price: '116,000' },
        { name: 'Deluxe Room [With Breakfast]', price: '105,000' },
        { name: 'Classic Room [With Breakfast]', price: '99,000' },
        { name: 'Deluxe Room [No Breakfast]', price: '89,000' },
        { name: 'Classic Room [No Breakfast]', price: '89,000' },
        { name: 'Standard Room [With Breakfast]', price: '89,000' },
        { name: 'Standard Room [No Breakfast]', price: '69,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1keNB5XY-ERROqFSD4G7ve1YUOXLOCGS_',
        'https://lh3.googleusercontent.com/d/1UNnjZNXFqgIAovR-C0TqsiTUwvgMNuVT',
        'https://lh3.googleusercontent.com/d/1hG2mHHkjEYScHvrRFWZAmU0tulWcFrp7'
      ],
      description: 'Enjoy sweeping cityscapes and premier hospitality at The View Hotel, ideally positioned in Lekki Phase 1, Lagos. A supreme boutique sanctuary featuring deluxe standard rooms, luxurious executive spaces, and breathtaking penthouse suites for the discerning traveler.'
    },
    {
      id: 'ikeja-central-hotel',
      name: 'Ikeja Central Hotel',
      location: '6 Obe Street, Off Adeniyi Jones, Ikeja, Lagos',
      price: '17,000',
      tiers: [
        { name: 'Top Tier', price: '33,000' },
        { name: 'Bronze', price: '22,500' },
        { name: 'Basic', price: '17,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1vp193aKQzZ-l7PyUIHhsjQuE3K9C_DtS',
        'https://lh3.googleusercontent.com/d/1tejXqXSYnRYf8fOzfd3ZmeoMa3l0F59Z',
        'https://lh3.googleusercontent.com/d/1WIxZtWIQIC4gG_Wj0rGimL-MmksAFG62'
      ],
      description: 'Experience excellent hospitality and outstanding value at Ikeja Central Hotel, strategically located on Obe Street, off Adeniyi Jones, Ikeja, Lagos. Perfect for quick stopovers, corporate visits, and comfortable, budget-friendly rests.'
    },
    {
      id: 'citigeight-hotel',
      name: 'CITIGEIGHT Hotel Lagos',
      location: '6 Sheraton Link Rd, Opebi, Ikeja 101233, Lagos',
      price: '89,500',
      tiers: [
        { name: 'Penthouse Suite', price: '155,500' },
        { name: 'Executive Room', price: '109,500' },
        { name: 'Superior Room', price: '99,500' },
        { name: 'Deluxe Room', price: '89,500' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1_zWlNTdTdx3Yrn0j3QYPzNgRu9yccjP8',
        'https://lh3.googleusercontent.com/d/1TGQTeN5I9YUfeLlA_GcGVOK5IiLmgVOy',
        'https://lh3.googleusercontent.com/d/1ZZ_MBU14H8AX9Cnc2XteET4Qzc6CPaM3'
      ],
      description: 'Step into contemporary prestige and elite comfort at CITIGEIGHT Hotel Lagos, perfectly positioned at 6 Sheraton Link Road, Opebi, Ikeja, Lagos. Revel in beautifully furnished deluxe, superior, and executive rooms, or our premier Penthouse suites, designed for top-class relaxation.'
    },
    {
      id: 'westine-hotel-spa',
      name: 'Westine Hotel & SPA',
      location: '16 Babatunde Dabiri St, Lekki Phase I, Lagos 102503, Lagos',
      price: '78,000',
      tiers: [
        { name: 'Exclusive', price: '220,000' },
        { name: 'Silver', price: '177,000' },
        { name: 'Top Tier', price: '128,000' },
        { name: 'Bronze', price: '90,000' },
        { name: 'Basic', price: '78,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1kvfWTbFLRBdZ48tbRxzTXrXzgV8qUyfV',
        'https://lh3.googleusercontent.com/d/1T1mIBshWzMcv7cegHEDQFCYYauA2eoLq',
        'https://lh3.googleusercontent.com/d/1FiZCpPnpI4L9MAwNG5MsLjbOcnuGb_Az',
        'https://lh3.googleusercontent.com/d/142lJnTPhZYQQiAQC-FYQNeeGASjE7lNd'
      ],
      description: 'Indulge in ultimate rejuvenation and sophisticated luxury at Westine Hotel & SPA, located at 16 Babatunde Dabiri Street, Lekki Phase I, Lagos. Our premium wellness facilities, expert SPA services, and beautifully curated guest rooms provide a tranquil sanctuary for both leisure and business stays.'
    },
    {
      id: 'federal-palace-hotel',
      name: 'Federal Palace Hotel',
      location: '6-8 Ahmadu Bello Wy, Victoria Island, Lagos 101241, Lagos',
      price: '287,284',
      tiers: [
        { name: 'Two Bedroom Suite', price: '642,500' },
        { name: 'One Bedroom Suite', price: '468,215' },
        { name: 'Luxury Superior Room [Single Occupancy]', price: '389,281' },
        { name: 'Standard Room [Single Occupancy]', price: '287,284' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1HgcseUXptEY-JHtuVfQ1zqPrQTBenZ15',
        'https://lh3.googleusercontent.com/d/15a2FPVIwtU8tOUU5BTuZQ1FPBH6a1wNn',
        'https://lh3.googleusercontent.com/d/1ABh9RJBqStbaiwwkwfvtFZLE56z1jBG7',
        'https://lh3.googleusercontent.com/d/1A8-6f5ipaZNxWVm0awVde8fo7m3CSzPf'
      ],
      description: 'Experience five-star colonial grandeur and premium resort living at the historic Federal Palace Hotel, situated along Ahmadu Bello Way on Victoria Island, Lagos. Offering world-class casino access, pristine pool complexes, and majestic views of the Atlantic ocean.'
    },
    {
      id: 'jcgold-hotels-apartment',
      name: 'JCGOLD HOTELS & APARTMENT',
      location: '15 Kolawole Shonibare St, off Asa-Afariogun Street, off Airport Road, Isolo, Lagos 102214, Lagos',
      price: '43,000',
      tiers: [
        { name: 'Apartment Flat [Platinum]', price: '155,000' },
        { name: 'Apartment Flat [Gold]', price: '125,000' },
        { name: 'Apartment Flat [Silver]', price: '89,000' },
        { name: 'Executive Suite', price: '89,000' },
        { name: 'Presidential Room', price: '69,000' },
        { name: 'Supreme Room', price: '64,000' },
        { name: 'Executive Room', price: '54,000' },
        { name: 'Standard Room', price: '43,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1lIE2uYfRmgCDxA3fgOUVHjZJTZapQVUz',
        'https://lh3.googleusercontent.com/d/17lzbqokHIY0IUOovSRrKmms7bI0ItoaQ'
      ],
      description: 'Experience modern urban hospitality and cozy apartment-style accommodations at JCGOLD HOTELS & APARTMENT, ideally located on Kolawole Shonibare Street in Isolo, Lagos. Just minutes from the airport, it offers a superb selection of executive suites, supreme rooms, and fully equipped apartment flats perfect for transit and corporate stays.'
    },
    {
      id: 'the-borough-lagos',
      name: 'The Borough Lagos',
      location: '2 Kola Adeyina Cl, Phase 1, Lekki , Lagos',
      price: '74,000',
      tiers: [
        { name: 'Diplomatic Suite', price: '205,000' },
        { name: 'Business Suite', price: '205,000' },
        { name: 'Executive Studio', price: '185,000' },
        { name: 'Executive Suite', price: '185,000' },
        { name: 'Afrocentric Haven', price: '105,000' },
        { name: 'Classic Room', price: '105,000' },
        { name: 'Standard Room', price: '74,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1NztRuoqy7E4mug0CzN0ZhUfBjmEE7B2R',
        'https://lh3.googleusercontent.com/d/11U_Wqc5CnyEZNLxJ7m-75ETVQnJ2Dwqf',
        'https://lh3.googleusercontent.com/d/1b2p-JNTdEzRGcLs8lJfPXwydD3nhzkYy',
        'https://lh3.googleusercontent.com/d/1yBIuEzXZU_W-rK5Y39GAiUs7t0D92SZN'
      ],
      description: 'Experience bespoke hospitality, design-forward elegance, and intimate comfort at The Borough Lagos, situated at 2 Kola Adeyina Close, Lekki Phase 1, Lagos. Combining custom boutique styling with modern luxury suites, it represents the ultimate retreat for discerning travelers in the heart of Lekki.'
    },
    {
      id: 'downtown-royal-hotel',
      name: 'DownTown Royal Hotel',
      location: 'G.R.A, 58b Oladipo Bateye Street, off Works Road, Ikeja GRA, Ikeja 100101, Lagos',
      price: '33,000',
      tiers: [
        { name: 'Top Tier', price: '59,000' },
        { name: 'Bronze', price: '43,500' },
        { name: 'Basic', price: '33,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1VV2BmvO3vcorVnTigS13jAdeIjzC4L2D',
        'https://lh3.googleusercontent.com/d/1rd4eIGPxpxHwsl-GcBQvLa_7Q_pFAxYx',
        'https://lh3.googleusercontent.com/d/1I5igemYAorNH_3UX0OgB6WoBh6L0Fo6s',
        'https://lh3.googleusercontent.com/d/1W1j_4u-oTIGcZW3MvryR2fUxVnD-_APi',
        'https://lh3.googleusercontent.com/d/1Si8AhnqyivsYjV9KxeGWC_KgXDu5N1re'
      ],
      description: 'Unwind in the peaceful, elite surroundings of Ikeja GRA at DownTown Royal Hotel, located at 58b Oladipo Bateye Street. Offering highly secure, quiet, and fully serviced rooms designed to deliver premium relaxation, exquisite dining, and exceptional personalized care.'
    },
    {
      id: 'rollace-hotel',
      name: 'ROLLACE HOTEL',
      location: '46/48 Awoniyi Elemo St, Airport Rd, Ajao Estate, Lagos 102214',
      price: '99,000',
      tiers: [
        { name: 'Gold', price: '257,000' },
        { name: 'Diamond', price: '165,000' },
        { name: 'Exclusive', price: '135,000' },
        { name: 'Silver', price: '115,000' },
        { name: 'Top Tier', price: '110,000' },
        { name: 'Bronze', price: '102,500' },
        { name: 'Basic', price: '99,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1J3LY-XzynS8Gjrk-Azlfw4VdivFxbFkV',
        'https://lh3.googleusercontent.com/d/1JnkIVtS1miTHvX5SOnBGGFZo1D6JHBps',
        'https://lh3.googleusercontent.com/d/1VQfa2wtYwnYQYI9v2xGjSpLWcQaJ5UsN'
      ],
      description: 'Ideally positioned near the international airport in Ajao Estate, ROLLACE HOTEL provides majestic hospitality, deluxe guest lounges, and sophisticated accommodations ranging from high-end executive suites to gold-standard rooms. Perfect for corporate delegations and premium rest.'
    }
  ];

  const lagosShortlets: any[] = [
    {
      id: 'isadora-d-glides',
      name: 'Isadora D Glides',
      location: 'Ikate-Lekki, Lagos',
      price: '110,000',
      cautionFee: '50,000',
      features: ['One-Bedroom Apartment', 'High-Speed WiFi 🛜', 'Smart TV 📺', '24/7 Electricity ⚡', 'Professional Security 🔒'],
      images: [
        '/images/isadora-d-glides/living-1.jpeg',
        '/images/isadora-d-glides/living-2.jpeg',
        '/images/isadora-d-glides/living-3.jpeg',
        '/images/isadora-d-glides/living-4.jpeg',
        '/images/isadora-d-glides/bed-1.jpeg',
        '/images/isadora-d-glides/bed-2.jpeg',
        '/images/isadora-d-glides/kitchen.jpeg',
        '/images/isadora-d-glides/bathroom.jpeg',
        '/images/isadora-d-glides/entrance.jpeg',
        '/images/isadora-d-glides/exterior.jpeg'
      ],
      description: 'Elegant One-Bedroom Apartment in Ikate-Lekki, Lagos, with easy accessibility. Fully furnished and tastefully designed interiors, complete with high-speed WiFi, Smart TVs, 24/7 electricity, and professional security for total comfort and peace of mind. (Refundable caution fee: ₦50,000 | Total initial payment: ₦160,000).'
    },
    {
      id: 'beverly-hills-akoka',
      name: 'Beverly Hills',
      location: 'Akoka Lagos',
      price: '160,000',
      features: ['Studio Apartment', '🍽️ Restaurant & Fine Dining', '🍹 Crafted Cocktails', '🎨 Sip & Paint'],
      images: [
        'https://lh3.googleusercontent.com/d/10gkv7kWQm3cxe99NioOObCi5Fruzx-Ls',
        'https://lh3.googleusercontent.com/d/1eRlKyagLuqXCsaEv9EktQ3geqBCKfEr1',
        'https://lh3.googleusercontent.com/d/1W7gljbcPi-QDNBPPC670APHFOYgbII-x'
      ],
      description: 'Studio Apartment in Akoka, Lagos. Premium luxury shortlet stay featuring fine dining restaurant services, crafted cocktails, and sip & paint experiences.'
    },
    {
      id: 'seychelles-akoka',
      name: 'Seychelles',
      location: 'Akoka Lagos',
      price: '95,000',
      features: ['Studio Apartment', '🍽️ Restaurant & Fine Dining', '🍹 Crafted Cocktails', '🎨 Sip & Paint'],
      images: [
        'https://lh3.googleusercontent.com/d/101aQhAMaomKIEvJScW3YNaERBnsyAkYC',
        'https://lh3.googleusercontent.com/d/1BYTBws1vtcVGcmxGipkRrIy7Ks5RUjsK',
        'https://lh3.googleusercontent.com/d/1kjqTkU_C-rUdumGH2rrEH8QrImUTiKv8'
      ],
      description: 'Charming Studio Apartment in Akoka, Lagos offering restaurant and fine dining services, crafted cocktails, and sip & paint experiences.'
    },
    {
      id: 'santorini-akoka',
      name: 'Santorini',
      location: 'Akoka Lagos',
      price: '95,000',
      features: ['Akoka Shortlet', 'Modern Living', '24/7 Power'],
      images: [
        'https://lh3.googleusercontent.com/d/1dGCksxQd158ALsw7WX8FJJkD2isz8Xz8',
        'https://lh3.googleusercontent.com/d/1aYabFK04_bJjp41b4ra27vteYQPH733s',
        'https://lh3.googleusercontent.com/d/1WyA19Bt_9Ke5deRrq7a75N_P6eB1jmZo'
      ],
      description: 'Exquisite Aegean-inspired shortlet stay in Akoka, Lagos styled with premium comfort and luxury finishes.'
    },
    {
      id: 'monte-carlo-akoka',
      name: 'Monte Carlo',
      location: 'Akoka Lagos',
      price: '85,000',
      features: ['Akoka Shortlet', 'Luxury Interiors', 'Private Retreat'],
      images: [
        'https://lh3.googleusercontent.com/d/1wXt4-wELuV_JnxC5bVswhYAomD6uBBI8',
        'https://lh3.googleusercontent.com/d/1OHUisQCb3dG7FQLoepZJrMZDYp7DCFLe',
        'https://lh3.googleusercontent.com/d/1T6LCV6RAPh__KrTTx_Kyqqty0Ci4FMO7'
      ],
      description: 'Sophisticated luxury shortlet apartment in Akoka, Lagos designed for optimal privacy, comfort, and upscale convenience.'
    },
    {
      id: 'cappadocia-akoka',
      name: 'Cappadocia',
      location: 'Akoka Lagos',
      price: '75,000',
      features: ['Akoka Shortlet', 'Serene Stay', 'Fully Serviced'],
      images: [
        'https://lh3.googleusercontent.com/d/1u7d1BAK_GayVr1MIqUBxhTU5pxMrBRPQ',
        'https://lh3.googleusercontent.com/d/1i2Avi7QSawJ22c1uHBLkn5OeiRRuFv1V',
        'https://lh3.googleusercontent.com/d/1PYk5MSPF9IAq71Ih_Cleptt_Nce67hbZ'
      ],
      description: 'Stylish and serene shortlet residence in Akoka, Lagos equipped with contemporary furnishings and round-the-clock service.'
    },
    {
      id: 'malibu-akoka',
      name: 'Malibu',
      location: 'Akoka Lagos',
      price: '64,000',
      features: ['Studio Apartment', 'Akoka Shortlet', 'Cozy Living'],
      images: [
        'https://lh3.googleusercontent.com/d/1HtY3zimiD5qkA9ZaXdSM9nNc0MqEXl_F',
        'https://lh3.googleusercontent.com/d/19u8heNTEONUkyGglFRw5jT5FSrGDzMxs',
        'https://lh3.googleusercontent.com/d/1Vybo4Tza6NbPSMXWMkmdvDNrb8GgGfL1'
      ],
      description: 'Chic shortlet studio apartment in Akoka, Lagos offering affordable luxury and convenient access.'
    }
  ];
  const abujaShortlets: any[] = [
    {
      id: 'the-aura',
      name: 'The Aura',
      location: 'Jahi, Abuja',
      price: '310,000',
      features: ['Two-Bedroom (Ground Floor)', '24/7 Light ⚡', '24/7 Water Supply 🚿', '24/7 Security 🔒', 'Gym 🏋️', 'Laundry Service 🧺', 'Swimming Pool 🏊', 'Rooftop Jacuzzi 🛁', '24/7 Room Service 🛎️', 'Elevator 🛗', 'WiFi 🛜', 'Standby Generator', 'Smart TV 📺', 'Well-Equipped Kitchen 🍳'],
      images: [
        '/images/the-aura/bed-1.jpeg',
        '/images/the-aura/bed-2.jpeg',
        '/images/the-aura/bed-3.jpeg',
        '/images/the-aura/window.jpeg',
        '/images/the-aura/living-1.jpeg',
        '/images/the-aura/living-2.jpeg',
        '/images/the-aura/living-3.jpeg',
        '/images/the-aura/dining.jpeg',
        '/images/the-aura/entrance.jpeg'
      ],
      description: 'A serene and calm Two-Bedroom ground-floor unit at The Aura, Jahi, Abuja. Fully self-contained with 24/7 light, water, and security, a gym, laundry service, swimming pool, rooftop jacuzzi, 24/7 room service, elevator access, WiFi, standby generator, Smart TV, and a well-equipped kitchen.'
    }
  ];

  const phShortlets = [
    {
      id: 'vintage-studio',
      name: 'Vintage',
      location: 'off Sani Abacha Road, GRA, Port Harcourt',
      price: '90,000',
      cautionFee: '20,000',
      features: ['Studio Apartment', 'Air Conditioning', 'Smart TV 📺', 'Kitchenette', 'Washing Machine'],
      images: [
        '/images/vintage-shortlet/bed-1.jpeg',
        '/images/vintage-shortlet/bed-2.jpeg',
        '/images/vintage-shortlet/living-1.jpeg',
        '/images/vintage-shortlet/living-2.jpeg',
        '/images/vintage-shortlet/tv-area.jpeg',
        '/images/vintage-shortlet/kitchen-1.jpeg',
        '/images/vintage-shortlet/kitchen-2.jpeg',
        '/images/vintage-shortlet/kitchen-3.jpeg',
        '/images/vintage-shortlet/entrance.jpeg',
        '/images/vintage-shortlet/bathroom.jpeg'
      ],
      description: 'A tastefully finished studio apartment located off Sani Abacha Road, GRA, Port Harcourt. Fully self-contained with air conditioning, a smart TV, kitchenette, and washing machine — ideal for a comfortable, private stay. (Refundable caution fee: ₦20,000 | Total initial payment: ₦110,000).'
    },
    {
      id: 'vintage-studio-2',
      name: 'Vintage (Studio 2)',
      location: 'off Sani Abacha Road, GRA, Port Harcourt',
      price: '90,000',
      cautionFee: '20,000',
      features: ['Studio Apartment', 'Air Conditioning', 'Mood Lighting', 'Kitchenette', 'Microwave', 'Washing Machine'],
      images: [
        '/images/vintage-shortlet-2/bed-1.jpeg',
        '/images/vintage-shortlet-2/bed-2.jpeg',
        '/images/vintage-shortlet-2/living-1.jpeg',
        '/images/vintage-shortlet-2/kitchen-1.jpeg',
        '/images/vintage-shortlet-2/kitchen-2.jpeg',
        '/images/vintage-shortlet-2/bathroom-1.jpeg',
        '/images/vintage-shortlet-2/bathroom-2.jpeg'
      ],
      description: 'A second tastefully finished studio apartment at Vintage, off Sani Abacha Road, GRA, Port Harcourt. Fully self-contained with air conditioning, ambient mood lighting, kitchenette with microwave, and washing machine — ideal for a comfortable, private stay. (Refundable caution fee: ₦20,000 | Total initial payment: ₦110,000).'
    },
    {
      id: 'treasure-court-4bed',
      name: 'Treasure Court (4-Bed Duplex)',
      location: 'off Sani Abacha Road, Port Harcourt',
      price: '260,000',
      cautionFee: '50,000',
      features: ['4-Bedroom Duplex', 'Starlink 🛜', 'Netflix ✅', 'Table Tennis 🏓', 'Swimming Pool 🏊', 'Snooker 🎱', 'Card & Board Games 🎮', 'In-House Chef (On Request)', 'Serene & Secure'],
      images: [
        'https://lh3.googleusercontent.com/d/1zP5epVVGrwKzwhQYlelXrvLZus_d5G_D',
        'https://lh3.googleusercontent.com/d/1LzLCZmITUvzdPR4G26ofaZnPCGfAaRFb',
        'https://lh3.googleusercontent.com/d/1hSZh3jXPEp46yn_fnuixBCiNAIYtSb0N'
      ],
      description: 'Exquisite 4-Bedroom Duplex located off Sani Abacha Road, Port Harcourt. Features Starlink WiFi, private swimming pool, snooker table, table tennis, card & board games, Netflix, and in-house chef available on request. Serene & secure environment. (Refundable caution fee: ₦50,000 | Total initial payment: ₦310,000).'
    },
    {
      id: 'treasure-court-3bed',
      name: 'Treasure Court (3-Bed Duplex)',
      location: 'off Sani Abacha Road, Port Harcourt',
      price: '240,000',
      cautionFee: '50,000',
      features: ['3-Bedroom Duplex', 'Starlink 🛜', 'Netflix ✅', 'Table Tennis 🏓', 'Swimming Pool 🏊', 'Snooker 🎱', 'Card & Board Games 🎮', 'In-House Chef (On Request)', 'Serene & Secure'],
      images: [
        'https://lh3.googleusercontent.com/d/16AktMQImOD2u2cYO7c2sKy4tLadAezJR',
        'https://lh3.googleusercontent.com/d/1bo6kDR7SVp8d4XYX1gAKXLBlt6i0FAv5',
        'https://lh3.googleusercontent.com/d/18o5v49dCDmxtoe_th9eoSajcevAWh-ff',
        'https://lh3.googleusercontent.com/d/1i6x003UHUftq2JI1co_OYJhP_fnJadtG',
        'https://lh3.googleusercontent.com/d/1-zEJF6zk6B8QIhWHqo_3NCerB8Zf9uS0'
      ],
      description: 'Luxurious 3-Bedroom Duplex located off Sani Abacha Road, Port Harcourt. Features Starlink WiFi, private swimming pool, snooker, table tennis, card & board games, Netflix, and in-house chef available on request. Serene & secure environment. (Refundable caution fee: ₦50,000 | Total initial payment: ₦290,000).'
    },
    {
      id: 'elite-court-4bed-smart',
      name: 'Elite Court (Smart Home)',
      location: 'Sani Abacha, Port Harcourt',
      price: '360,000',
      cautionFee: '100,000',
      features: ['4-Bedroom Smart Home', '24/7 Power ⚡', 'Swimming Pool 🏊', 'High Speed Internet 🛜', 'DSTV & Netflix 📺', 'Built-in Speakers 🔊', 'Balcony View 🏙️', 'All Rooms En-suite 🛌'],
      images: [
        'https://lh3.googleusercontent.com/d/1m1WgrXeDL_-UczlGODDq1L08mh8ucYoO',
        'https://lh3.googleusercontent.com/d/1dq0eGFz7z6O1Ey3OE61ciXMjb_CWSRV1',
        'https://lh3.googleusercontent.com/d/1AWQJs606k377KLfcycvXOmWOg8g6jpxC',
        'https://lh3.googleusercontent.com/d/1Yt5P6clctjTqf5JaqCgTW7_UDcnY-GVH',
        'https://lh3.googleusercontent.com/d/1E9rwVUapPgJu9icyruW_lGr8RY64A6sq'
      ],
      description: 'Ultra-modern 4 Bedroom Duplex Smart Home in Sani Abacha, Port Harcourt. Features constant electricity, professional housekeeping, swimming pool, purified water system, DSTV & Netflix, round-the-clock security, high speed internet, built-in speakers, balcony view, and all rooms en-suite. (Refundable caution fee: ₦100,000 | Total initial payment: ₦460,000).'
    },
    {
      id: 'elite-court-off-abacha',
      name: 'Elite Court (off Abacha Road)',
      location: 'off Abacha Road, Port Harcourt',
      price: '210,000',
      cautionFee: '50,000',
      features: ['Off Abacha Road', '24/7 Power ⚡', 'Swimming Pool 🏊', 'High Speed Internet 🛜', 'DSTV & Netflix 📺', 'Built-in Speakers 🔊', 'Balcony View 🏙️', 'All Rooms En-suite 🛌'],
      images: [
        'https://lh3.googleusercontent.com/d/14oOxCzj8hd2A4CsFr9in2M1v37DDRGSz',
        'https://lh3.googleusercontent.com/d/1m9Dj86bRDGQFJ2jMSZWTGElA38XC35Om',
        'https://lh3.googleusercontent.com/d/1xrOs3miH1uzvumpyPpGpu1HpMOzpetqn',
        'https://lh3.googleusercontent.com/d/1UPGsyUY3sLX5fuyuxFXpezYr5NiLUw0j',
        'https://lh3.googleusercontent.com/d/1EBQHVwx2cHaAI4dvt3JV6laN_hkaWFQ4'
      ],
      description: 'Exquisite shortlet residence located off Abacha Road, Port Harcourt. Complete with constant electricity, professional housekeeping, swimming pool, purified water system, DSTV & Netflix, round-the-clock security, high speed internet, built-in sound speakers, and serene balcony views. (Refundable caution fee: ₦50,000 | Total initial payment: ₦260,000).'
    },
    {
      id: 'studio-room',
      name: 'Studio room',
      location: 'GRA sani abacha',
      price: '90,000',
      images: [
        'https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MTM5NDIyMDExODcwNjgxMDEwNA%3D%3D/original/5b86c7d8-050a-4693-9b41-02e03f96caeb.jpeg',
        'https://q-xx.bstatic.com/xdata/images/hotel/max500/752608682.jpg?k=5e45e14fb236eb69bdc498816c290a39258906f7994088c2945a0d1cf474fe1e&o=',
        'https://q-xx.bstatic.com/xdata/images/hotel/max500/752608737.jpg?k=f68bdaca4b9a2186e8a5a2cebd0c362accf5f8f747ccc315005bd22a096a83d4&o='
      ],
      description: 'A modern and cozy studio room located in the heart of GRA Sani Abacha, offering comfort and convenience for your stay.'
    },
    {
      id: 'diamond-blue',
      name: 'Diamond Blue',
      location: 'GRA Sani Abacha, Port Harcourt, Rivers',
      price: '180,000',
      images: [
        'https://cf.bstatic.com/xdata/images/hotel/max1024x768/752605403.jpg?k=5a2637b087a9b1fa7b36e49f8f3072d7faa26cc8e61fe4586e64c90600c20bc2&o=&hp=1',
        'https://cf.bstatic.com/xdata/images/hotel/max1024x768/752602965.jpg?k=d72bfd988ae61698a2675e5603610a7ab1c6ae6734e4c4cd40e66ff8e3614142&o=',
        'https://cf.bstatic.com/xdata/images/hotel/max1024x768/752608817.jpg?k=41955275ef9abd252ecd295435196dada9ec0301888cb1df51b0cf6b8ec246fd&o='
      ],
      description: 'Experience unparalleled luxury at Diamond Blue. Tastefully finished 3 bedroom apartments with 24-hour power supply and premium amenities.'
    }
  ];

  const categories = [
    {
      id: 'stays' as const,
      title: 'Hotels',
      subtitle: 'Luxury Stays',
      icon: <Hotel className="w-6 h-6" />,
      image: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1d/19/5f/94/echelon-heights-hotel.jpg?w=1200&h=1200&s=1',
      description: 'Curated collection of the world\'s most prestigious hotels and resorts.'
    },
    {
      id: 'homes' as const,
      title: 'Shortlet',
      subtitle: 'Private Estates',
      icon: <Home className="w-6 h-6" />,
      image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MTM5NDIyMDExODcwNjgxMDEwNA%3D%3D/original/5b86c7d8-050a-4693-9b41-02e03f96caeb.jpeg',
      description: 'Exclusive access to architectural masterpieces and hidden villas.'
    },
    {
      id: 'drive' as const,
      title: 'Car Rentals',
      subtitle: 'Private Fleet',
      icon: <Car className="w-6 h-6" />,
      image: '/images/cars/gx-460.svg',
      description: 'A fleet of exceptional vehicles for your most refined journeys.'
    },
    {
      id: 'jets' as const,
      title: 'Private Jets',
      subtitle: 'Elite Aviation',
      icon: <Plane className="w-6 h-6" />,
      image: '/images/challenger-604/exterior.jpeg',
      description: 'Your destination. Your schedule. Your aircraft.'
    },
    {
      id: 'moving' as const,
      title: 'Moving & Relocation',
      subtitle: 'Elite Logistics',
      icon: <Truck className="w-6 h-6" />,
      image: '/images/moving/hero-graphic.svg',
      description: 'Let us arrange the right vehicle and moving assistance for you.'
    }
  ];

  const handleCategorySelect = (id: Category) => {
    setSelectedCategory(id);
    setStep(1);
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);



  const reset = () => {
    if (window.history.state && typeof window.history.state.depth === 'number' && window.history.state.depth > 0) {
      window.history.go(-window.history.state.depth);
    } else {
      setSelectedCategory(null);
      setSelectedLocation(null);
      setSelectedHotel(null);
      setSelectedShortlet(null);
      setSelectedCar(null);
      setShowBookingOptions(null);
      setShowEmailPopup(false);
      setIsAdminOpen(false);
      setShowJetRequestForm(false);
      setJetRequestPreset(null);
      setShowMovingRequestForm(false);
      setShowCarRequestForm(false);
      setCarRequestVehicle(null);
      setStep(1);
      setFormData({ location: '', dates: '', guests: '', preferences: '' });
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPhoneNumber.trim()) return;

    setEmailSubmitStatus('saving');
    setErrorMessage('');

    const formattedCheckin = formatDateTime(checkinDate);
    const formattedCheckout = formatDateTime(checkoutDate);

    const kindLabel = bookingType === 'reservation' ? 'availability' : 'booking';
    const capKindLabel = bookingType === 'reservation' ? 'Availability' : 'Booking';

    const isHotelBooking = selectedCategory === 'stays' || 
      showBookingOptions?.type === 'hotel' || 
      showBookingOptions?.category === 'stays' || 
      (showBookingOptions && [...phHotels, ...lagosHotels, ...abujaHotels].some((h: any) => h.id === showBookingOptions.id));

    const activePackage = selectedPackage || getEffectiveHotelPackage(showBookingOptions);
    const effectivePrice = activePackage ? activePackage.price : (showBookingOptions.price || '');
    const packageTierText = activePackage ? `${activePackage.name} (₦${activePackage.price})` : '';

    const bookingText = `Hello Elite Bookings Team,

I would like to make an elite ${kindLabel} enquiry. Below are the details of the ${kindLabel}:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPERTY / ASSET DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${showBookingOptions.name}
Location: ${showBookingOptions.location}
Rate: ${effectivePrice ? `₦${effectivePrice}` : 'N/A'}${activePackage ? ` (${activePackage.name} Package)` : ''}${isHotelBooking ? `\nRooms Needed: ${numberOfRooms || '1 Room'}` : ''}${packageTierText ? `\nSelected Package / Tier: ${packageTierText}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${capKindLabel.toUpperCase()} TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Check-in: ${formattedCheckin}
Check-out: ${formattedCheckout}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phone Number: ${userPhoneNumber}

I look forward to your confirmation and details.

Best regards.`;

    const enquiryPayload = {
      propertyName: showBookingOptions.name,
      propertyLocation: showBookingOptions.location,
      price: effectivePrice || showBookingOptions.price || '',
      ...(packageTierText ? { packageTier: packageTierText } : {}),
      checkin: formattedCheckin,
      checkout: formattedCheckout,
      clientPhone: userPhoneNumber,
      type: bookingType,
      ...(isHotelBooking ? { numberOfRooms: numberOfRooms || '1 Room' } : {}),
      createdAt: new Date().toISOString()
    };

    // 1. Save to Firestore database (completely automatic!)
    try {
      await addDoc(collection(db, 'enquiries'), enquiryPayload);
    } catch (dbError) {
      console.warn('Silent database write issue, moving on to send email directly:', dbError);
      // We still try to send email, but we log the error as per security guidelines
      try {
        handleFirestoreError(dbError, OperationType.WRITE, 'enquiries');
      } catch (err) {
        // Suppress print to UI so booking doesn't crash for the customer
      }
    }

    // 2. Automated background email sending via FormSubmit & Web3Forms
    const accessKey = localStorage.getItem('elite_web3forms_key') || (import.meta as any).env.VITE_WEB3FORMS_ACCESS_KEY;
    const targetEmail = localStorage.getItem('elite_notification_email') || 'Elitebooking.ng@gmail.com';

    setEmailSubmitStatus('sending');

    try {
      // Primary: FormSubmit.co instant dispatch (no API key required!)
      const formSubmitPromise = fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `Elite Booking Alert: ${showBookingOptions.name}`,
          _template: 'table',
          "Property / Asset": showBookingOptions.name,
          "Location": showBookingOptions.location,
          "Rate": effectivePrice ? `₦${effectivePrice}` : 'N/A',
          ...(packageTierText ? { "Package / Tier": packageTierText } : {}),
          ...(isHotelBooking ? { "Rooms Needed": numberOfRooms || '1 Room' } : {}),
          "Client Phone Number": userPhoneNumber,
          "Check-In": formattedCheckin,
          "Check-Out": formattedCheckout,
          "Type": capKindLabel,
          "Full Message": bookingText
        })
      });

      // Secondary: Web3Forms if key is present
      const promises: Promise<any>[] = [formSubmitPromise];

      if (accessKey && accessKey.trim() !== '') {
        const web3Promise = fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            access_key: accessKey,
            subject: `Elite Booking Enquiry: ${showBookingOptions.name}`,
            from_name: 'Elite Bookings System',
            to_email: targetEmail,
            message: bookingText,
            phone: userPhoneNumber
          })
        });
        promises.push(web3Promise);
      }

      await Promise.allSettled(promises);
    } catch (emailError) {
      console.error('Error during email auto-transmit:', emailError);
    } finally {
      setEmailSubmitStatus('success');
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  };

  const HotelImageSlider = ({ images, name }: { images: string[], name: string }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
      if (images.length <= 1) return;
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 4000);
      return () => clearInterval(timer);
    }, [images.length]);

    return (
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`${name} ${currentIndex + 1}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        
        {images.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
            {images.map((_, i) => (
              <motion.div 
                key={i} 
                animate={{ 
                  scale: currentIndex === i ? 1.2 : 1,
                  backgroundColor: currentIndex === i ? "#C5A059" : "rgba(255, 255, 255, 0.5)"
                }}
                className="w-1.5 h-1.5 rounded-full" 
              />
            ))}
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="min-h-screen flex flex-col selection:bg-gold/30">
      {/* Seamless Moving Announcement / Assistance Banner */}
      <div className="w-full bg-gold/5 border-b border-gold/15 overflow-hidden relative flex h-10 items-center">
        <style>{`
          @keyframes marquee {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          .animate-marquee {
            animation: marquee 35s linear infinite;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
        `}</style>
        <div className="animate-marquee whitespace-nowrap flex text-[10px] md:text-[11px] font-sans font-medium tracking-[0.25em] uppercase text-charcoal/70 py-1">
          <span className="inline-block px-4">if you need any assistance, we can make the best decision for you, click the whatsapp icon below to contact us</span>
          <span className="inline-block px-4 opacity-40">•</span>
          <span className="inline-block px-4">if you need any assistance, we can make the best decision for you, click the whatsapp icon below to contact us</span>
          <span className="inline-block px-4 opacity-40">•</span>
          {/* Duplicate to enable seamless scrolling infinite loop */}
          <span className="inline-block px-4">if you need any assistance, we can make the best decision for you, click the whatsapp icon below to contact us</span>
          <span className="inline-block px-4 opacity-40">•</span>
          <span className="inline-block px-4">if you need any assistance, we can make the best decision for you, click the whatsapp icon below to contact us</span>
          <span className="inline-block px-4 opacity-40">•</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-4 py-5 sm:px-8 sm:py-7 flex justify-between items-center z-50 max-w-7xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={reset}
          className="text-lg sm:text-2xl font-serif tracking-[0.15em] sm:tracking-[0.2em] uppercase font-light text-charcoal cursor-pointer flex-shrink-0"
        >
          Elite Bookings
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-3 sm:space-x-6 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold text-charcoal/80"
        >
          <button
            onClick={reset}
            className="hover:text-gold transition-colors cursor-pointer hidden sm:inline-block"
          >
            Home
          </button>
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-charcoal/15 flex items-center justify-center text-charcoal hover:border-gold hover:text-gold transition-colors cursor-pointer flex-shrink-0"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsAIConciergeOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-gold via-amber-300 to-gold text-charcoal px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-full border border-gold/60 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer font-bold tracking-wider text-[10px] sm:text-xs uppercase"
          >
            <Sparkles className="w-3.5 h-3.5 text-charcoal fill-charcoal/20" />
            <span className="font-extrabold">AI Concierge</span>
          </button>
        </motion.div>
      </nav>

      <main className="flex-grow flex flex-col items-center px-6 md:px-12">
        <AnimatePresence mode="wait">
          {!selectedCategory ? (
            <motion.section 
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-7xl mt-12 md:mt-24 mb-24"
            >
              <div className="text-center mb-20">
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-[12px] uppercase tracking-[0.5em] text-gold font-bold mb-4 block"
                >
                  Unrivaled Travel Experiences
                </motion.span>
                <h1 className="text-6xl md:text-8xl font-light tracking-tight leading-none mb-8 text-charcoal">
                  The Art of <br />
                  <span className="italic font-serif">Exceptional</span> Travel & Stay
                </h1>
                <p className="text-charcoal/80 max-w-xl mx-auto text-lg font-normal leading-relaxed">
                  Bespoke journeys designed for those who seek the extraordinary. 
                  Where would you like to begin?
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {categories.map((cat, idx) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    whileHover={{ y: -10 }}
                    onClick={() => handleCategorySelect(cat.id)}
                    className="group cursor-pointer relative overflow-hidden rounded-2xl aspect-[4/5] bg-charcoal"
                  >
                    <img 
                      src={cat.image} 
                      alt={cat.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent opacity-80" />
                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                      <div className="mb-4 text-gold/80">{cat.icon}</div>
                      <h3 className="text-3xl text-cream font-serif mb-1">{cat.title}</h3>
                      <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-bold mb-4">{cat.subtitle}</p>
                      <p className="text-cream/90 text-sm font-normal opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {cat.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ) : (selectedCategory === 'jets') ? (
            <motion.section
              key="private-aviation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-6xl mt-12 mb-24 relative"
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className="absolute -top-16 left-0 flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-[11px] uppercase tracking-[0.3em] text-charcoal font-bold shadow-sm hover:bg-gold hover:text-cream transition-all group"
              >
                <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to selection
              </button>

              <div className="relative rounded-[2.5rem] overflow-hidden bg-black min-h-[560px] md:min-h-[620px] flex items-end shadow-2xl">
                <img
                  src="/images/challenger-604/exterior.jpeg"
                  alt="Elite Booking private jet on the tarmac"
                  className="absolute inset-0 w-full h-full object-cover opacity-45"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-slate-900/50" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />

                <div className="relative z-10 p-8 sm:p-12 md:p-16 max-w-2xl">
                  <span className="inline-flex items-center gap-2 text-blue-400 text-[11px] uppercase tracking-[0.5em] font-bold mb-6">
                    <Plane className="w-3.5 h-3.5" /> Private Aviation
                  </span>
                  <h1 className="text-4xl md:text-6xl font-serif font-light text-white leading-tight mb-6">
                    Your Destination. Your Schedule. <span className="italic text-blue-300">Your Aircraft.</span>
                  </h1>
                  <p className="text-white/70 text-base md:text-lg font-normal leading-relaxed mb-8 max-w-xl">
                    Fly privately with Elite Booking. Tell us where you're going, when you're flying and how many people are travelling. We'll source the right aircraft and handle the arrangements for you.
                  </p>
                  <div className="flex w-fit items-center gap-3 bg-white/5 border border-blue-500/30 rounded-2xl px-5 py-3 mb-8">
                    <span className="font-serif text-2xl md:text-3xl text-white font-semibold leading-none">$4,850</span>
                    <span className="text-white/50 text-[10px] uppercase tracking-[0.2em] leading-tight">
                      per hour<br />local trips
                    </span>
                  </div>
                  <button
                    onClick={() => { setJetRequestPreset(null); setShowJetRequestForm(true); }}
                    className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full text-xs uppercase tracking-[0.25em] font-bold shadow-lg shadow-blue-900/40 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer"
                  >
                    Request a Private Jet Quote <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-white/40 text-xs mt-5 tracking-wide">
                    Rates from $4,850/hour for local trips. Final pricing is confirmed per route, aircraft, date and passenger count.
                  </p>
                </div>
              </div>

              {/* AIRCRAFT GALLERY */}
              <div className="relative rounded-[2.5rem] overflow-hidden bg-[#0A0A0A] border border-white/10 mt-8 p-8 sm:p-12 shadow-2xl">
                <span className="inline-flex items-center gap-2 text-blue-400 text-[11px] uppercase tracking-[0.5em] font-bold mb-2">
                  <Plane className="w-3.5 h-3.5" /> Inside The Cabin
                </span>
                <h2 className="text-2xl md:text-3xl font-serif font-light text-white leading-snug mb-6">
                  A Glimpse of the Experience
                </h2>
                <div className="overflow-hidden -mx-8 sm:-mx-12">
                  <div className="animate-gallery-slide flex gap-4 w-fit px-8 sm:px-12">
                    {[
                      { src: '/images/challenger-604/cabin-aisle-wide.jpeg', alt: 'Private jet cabin aisle with club seating' },
                      { src: '/images/challenger-604/cabin-suite.jpeg', alt: 'Private jet cabin seat and table suite' },
                      { src: '/images/challenger-604/seat-detail.jpeg', alt: 'Quilted leather cabin seat detail' },
                      { src: '/images/challenger-604/cabin-refreshments.jpeg', alt: 'Cabin table with onboard refreshments' },
                      { src: '/images/challenger-604/rear-bench.jpeg', alt: 'Rear cabin bench seating' },
                      { src: '/images/challenger-604/exterior-side-profile.jpeg', alt: 'Elite Booking private jet on the tarmac' },
                      { src: '/images/challenger-604/exterior-tail-detail.jpeg', alt: 'Private jet tail and engine detail' },
                      // Duplicated to enable the seamless -50% looping slide.
                      { src: '/images/challenger-604/cabin-aisle-wide.jpeg', alt: 'Private jet cabin aisle with club seating' },
                      { src: '/images/challenger-604/cabin-suite.jpeg', alt: 'Private jet cabin seat and table suite' },
                      { src: '/images/challenger-604/seat-detail.jpeg', alt: 'Quilted leather cabin seat detail' },
                      { src: '/images/challenger-604/cabin-refreshments.jpeg', alt: 'Cabin table with onboard refreshments' },
                      { src: '/images/challenger-604/rear-bench.jpeg', alt: 'Rear cabin bench seating' },
                      { src: '/images/challenger-604/exterior-side-profile.jpeg', alt: 'Elite Booking private jet on the tarmac' },
                      { src: '/images/challenger-604/exterior-tail-detail.jpeg', alt: 'Private jet tail and engine detail' },
                    ].map((img, idx) => (
                      <div key={`${img.src}-${idx}`} className="relative flex-shrink-0 w-64 sm:w-72 h-48 sm:h-52 rounded-2xl overflow-hidden">
                        <img
                          src={img.src}
                          alt={img.alt}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-white/30 text-[11px] mt-4">
                  Sample cabin and aircraft photography — the aircraft assigned to your trip is confirmed at the time of booking.
                </p>
              </div>

              {/* EMPTY LEG CHARTER */}
              <div className="relative rounded-[2.5rem] overflow-hidden bg-[#0A0A0A] border border-white/10 mt-8 p-8 sm:p-12 md:p-14 shadow-2xl">
                <div className="grid md:grid-cols-5 gap-10 md:gap-12 items-start">
                  <div className="md:col-span-3">
                    <span className="inline-flex items-center gap-2 text-blue-400 text-[11px] uppercase tracking-[0.5em] font-bold mb-5">
                      <Sparkles className="w-3.5 h-3.5" /> Empty Leg Charter
                    </span>
                    <h2 className="text-2xl md:text-3xl font-serif font-light text-white leading-snug mb-4">
                      Private Aviation, at a Preferred Rate
                    </h2>
                    <p className="text-white/60 text-sm md:text-base leading-relaxed mb-4">
                      Access private jet travel at significantly reduced rates when an aircraft repositions without passengers. An empty leg becomes available when a jet is already scheduled to fly to another destination or return to base — rather than fly that route empty, we offer the same aircraft for the trip at a preferred rate.
                    </p>
                    <p className="text-white/40 text-xs leading-relaxed mb-8">
                      Ideal for flexible travelers seeking genuine private aviation value without compromising on comfort or service.
                    </p>
                    <button
                      onClick={() => { setJetRequestPreset('Empty Leg Charter'); setShowJetRequestForm(true); }}
                      className="inline-flex items-center gap-3 border border-blue-500/40 hover:bg-blue-600 hover:border-blue-600 text-white px-7 py-3.5 rounded-full text-xs uppercase tracking-[0.25em] font-bold transition-all duration-300 cursor-pointer"
                    >
                      Enquire About Empty Legs <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="md:col-span-2 bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                    <p className="text-white/40 text-[10px] uppercase tracking-[0.25em] font-bold mb-4">What to Expect</p>
                    <ul className="space-y-3.5">
                      {[
                        'Substantial cost savings compared to standard charter',
                        'Same aircraft quality and onboard experience',
                        'Fixed route and departure schedule',
                        'Limited availability — first come, first served',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          <span className="text-white/70 text-sm leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* CO-SHARE CHARTER */}
              <div className="relative rounded-[2.5rem] overflow-hidden bg-[#0A0A0A] border border-white/10 mt-8 p-8 sm:p-12 md:p-14 shadow-2xl">
                <div className="grid md:grid-cols-5 gap-10 md:gap-12 items-start">
                  <div className="md:col-span-3">
                    <span className="inline-flex items-center gap-2 text-blue-400 text-[11px] uppercase tracking-[0.5em] font-bold mb-5">
                      <Users className="w-3.5 h-3.5" /> Co-Share Charter
                    </span>
                    <h2 className="text-2xl md:text-3xl font-serif font-light text-white leading-snug mb-4">
                      Private Aviation, Shared Efficiently
                    </h2>
                    <p className="text-white/60 text-sm md:text-base leading-relaxed mb-4">
                      Share a private jet flight with other vetted passengers travelling on the same route and schedule. Co-share access gives you the comfort, discretion and efficiency of private aviation at a lower individual cost — structured, pre-scheduled and coordinated so every passenger is aligned on departure time and destination.
                    </p>
                    <p className="text-white/40 text-xs leading-relaxed mb-8">
                      An efficient alternative for clients who value private travel but are open to sharing the journey.
                    </p>
                    <button
                      onClick={() => { setJetRequestPreset('Co-Share Charter'); setShowJetRequestForm(true); }}
                      className="inline-flex items-center gap-3 border border-blue-500/40 hover:bg-blue-600 hover:border-blue-600 text-white px-7 py-3.5 rounded-full text-xs uppercase tracking-[0.25em] font-bold transition-all duration-300 cursor-pointer"
                    >
                      Enquire About Co-Sharing <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="md:col-span-2 bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                    <p className="text-white/40 text-[10px] uppercase tracking-[0.25em] font-bold mb-4">What to Expect</p>
                    <ul className="space-y-3.5">
                      {[
                        'Reduced cost compared to full aircraft charter',
                        'Shared cabin with a limited number of passengers',
                        'Fixed route and departure schedule',
                        'Private terminal experience',
                        'Curated passenger matching',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          <span className="text-white/70 text-sm leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.section>
          ) : (selectedCategory === 'moving') ? (
            <motion.section
              key="moving-relocation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-6xl mt-12 mb-24 relative"
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className="absolute -top-16 left-0 flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-[11px] uppercase tracking-[0.3em] text-charcoal font-bold shadow-sm hover:bg-gold hover:text-cream transition-all group"
              >
                <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to selection
              </button>

              <div className="relative rounded-[2.5rem] overflow-hidden bg-black min-h-[560px] md:min-h-[620px] flex items-end shadow-2xl">
                <img
                  src="/images/moving/hero-graphic.svg"
                  alt="Elite Booking moving and relocation"
                  className="absolute inset-0 w-full h-full object-cover opacity-70"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-slate-900/50" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />

                <div className="relative z-10 p-8 sm:p-12 md:p-16 max-w-2xl">
                  <span className="inline-flex items-center gap-2 text-blue-400 text-[11px] uppercase tracking-[0.5em] font-bold mb-6">
                    <Truck className="w-3.5 h-3.5" /> Moving &amp; Relocation
                  </span>
                  <h1 className="text-4xl md:text-6xl font-serif font-light text-white leading-tight mb-6">
                    Your Move. Your Schedule. <span className="italic text-blue-300">Your Vehicle.</span>
                  </h1>
                  <p className="text-white/70 text-base md:text-lg font-normal leading-relaxed mb-8 max-w-xl">
                    Moving to a new home, office or location? Let us arrange the right vehicle and moving assistance for you.
                  </p>
                  <button
                    onClick={() => setShowMovingRequestForm(true)}
                    className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full text-xs uppercase tracking-[0.25em] font-bold shadow-lg shadow-blue-900/40 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer"
                  >
                    Request a Move <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-white/40 text-xs mt-5 tracking-wide">
                    Tell us what you're moving, and we'll arrange the right vehicle for your move.
                  </p>
                </div>
              </div>
            </motion.section>
          ) : (selectedCategory === 'drive' && !selectedLocation) ? (
            <motion.section
              key="car-rentals-landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-6xl mt-12 mb-24 relative"
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className="absolute -top-16 left-0 flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-[11px] uppercase tracking-[0.3em] text-charcoal font-bold shadow-sm hover:bg-gold hover:text-cream transition-all group"
              >
                <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to selection
              </button>

              <div className="relative rounded-[2.5rem] overflow-hidden bg-[#0A0A0A] border border-white/10 p-8 sm:p-12 md:p-16 shadow-2xl">
                <div className="text-center max-w-2xl mx-auto mb-14">
                  <span className="inline-flex items-center gap-2 text-blue-400 text-[11px] uppercase tracking-[0.5em] font-bold mb-6">
                    <Car className="w-3.5 h-3.5" /> Car Rentals
                  </span>
                  <h1 className="text-4xl md:text-6xl font-serif font-light text-white leading-tight mb-6">
                    The Right Car for <span className="italic text-blue-300">Every Journey.</span>
                  </h1>
                  <p className="text-white/60 text-base md:text-lg font-normal leading-relaxed">
                    Choose from premium vehicles for business travel, personal trips, airport transfers, events and more.
                  </p>
                </div>

                <div className="max-w-3xl mx-auto">
                  <p className="text-center text-white/40 text-[11px] uppercase tracking-[0.3em] font-bold mb-6">Where do you need a car?</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Lagos', value: 'Lagos, Lagos State' },
                      { label: 'Abuja', value: 'Abuja, Federal Capital Territory' },
                      { label: 'Port Harcourt', value: 'Port Harcourt, Rivers State' },
                      { label: 'Other Locations', value: 'Other Locations' },
                    ].map((loc) => (
                      <motion.button
                        key={loc.label}
                        whileHover={{ y: -4 }}
                        onClick={() => setSelectedLocation(loc.value)}
                        className="flex flex-col items-center justify-center gap-3 bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-white/[0.08] rounded-2xl px-4 py-8 text-center transition-all cursor-pointer group"
                      >
                        <MapPin className="w-5 h-5 text-blue-400" />
                        <span className="text-white text-sm font-serif">{loc.label}</span>
                        <span className="text-white/30 text-[9px] uppercase tracking-[0.2em] group-hover:text-blue-300 transition-colors">View Fleet</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          ) : ((selectedCategory === 'stays' || selectedCategory === 'homes') && !selectedLocation) ? (
            <motion.section
              key="location-landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-5xl mt-12 mb-24 relative"
            >
              <button
                onClick={() => setSelectedCategory(null)}
                className="absolute -top-16 left-0 flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-[11px] uppercase tracking-[0.3em] text-charcoal font-bold shadow-sm hover:bg-gold hover:text-cream transition-all group"
              >
                <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to selection
              </button>

              <div className="text-center mb-16">
                <span className="text-[12px] uppercase tracking-[0.5em] text-gold font-bold mb-4 block">Select Your Destination</span>
                <h2 className="text-5xl md:text-7xl font-light tracking-tight mb-6">
                  {selectedCategory === 'stays' ? 'Hotels' : 'Shortlets'} in <span className="italic font-serif">Nigeria</span>
                </h2>
                <p className="text-charcoal/60 max-w-lg mx-auto font-normal">
                  Explore our curated selection of ultra-luxury {selectedCategory === 'stays' ? 'stays' : 'private estates'} in the most exclusive regions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Port Harcourt */}
                <motion.div
                  whileHover={{ y: -10 }}
                  onClick={() => {
                    setSelectedLocation('Port Harcourt, Rivers State');
                  }}
                  className="group cursor-pointer relative overflow-hidden rounded-3xl aspect-[4/3] bg-charcoal shadow-2xl shadow-gold/10"
                >
                  <img 
                    src={portHarcourtImg} 
                    alt="Port Harcourt Landmark"
                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-1000 ease-out"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent opacity-80" />
                  <div className="absolute inset-0 p-8 flex flex-col justify-end items-center text-center">
                    <h3 className="text-3xl md:text-4xl text-cream font-serif mb-1">Port Harcourt</h3>
                    <p className="text-gold text-[10px] uppercase tracking-[0.4em] font-bold">Rivers State</p>
                    <div className="mt-6 flex items-center text-cream/40 text-[9px] uppercase tracking-[0.2em] group-hover:text-gold transition-colors">
                      Explore Properties <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>

                {/* Lagos */}
                <motion.div
                  whileHover={{ y: -10 }}
                  onClick={() => {
                    setSelectedLocation('Lagos, Lagos State');
                  }}
                  className="group cursor-pointer relative overflow-hidden rounded-3xl aspect-[4/3] bg-charcoal shadow-2xl shadow-gold/10"
                >
                  <img 
                    src={lagosImg} 
                    alt="Lagos Landmark"
                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-1000 ease-out"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent opacity-80" />
                  <div className="absolute inset-0 p-8 flex flex-col justify-end items-center text-center">
                    <h3 className="text-3xl md:text-4xl text-cream font-serif mb-1">Lagos</h3>
                    <p className="text-gold text-[10px] uppercase tracking-[0.4em] font-bold">Lagos State</p>
                    <div className="mt-6 flex items-center text-cream/40 text-[9px] uppercase tracking-[0.2em] group-hover:text-gold transition-colors">
                      Explore Properties <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>

                {/* Abuja */}
                <motion.div
                  whileHover={{ y: -10 }}
                  onClick={() => {
                    setSelectedLocation('Abuja, Federal Capital Territory');
                  }}
                  className="group cursor-pointer relative overflow-hidden rounded-3xl aspect-[4/3] bg-charcoal shadow-2xl shadow-gold/10"
                >
                  <img 
                    src={abujaImg} 
                    alt="Abuja Landmark"
                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-1000 ease-out"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent opacity-80" />
                  <div className="absolute inset-0 p-8 flex flex-col justify-end items-center text-center">
                    <h3 className="text-3xl md:text-4xl text-cream font-serif mb-1">Abuja</h3>
                    <p className="text-gold text-[10px] uppercase tracking-[0.4em] font-bold">Federal Capital Territory</p>
                    <div className="mt-6 flex items-center text-cream/40 text-[9px] uppercase tracking-[0.2em] group-hover:text-gold transition-colors">
                      Explore Properties <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="mt-16 grid grid-cols-1 gap-6 opacity-30 pointer-events-none max-w-[280px] mx-auto">
                {['Enugu'].map(city => (
                  <div key={city} className="border border-charcoal/10 rounded-2xl p-8 text-center grayscale">
                    <span className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold mb-2 block">Coming Soon</span>
                    <h4 className="text-xl font-serif text-charcoal/60">{city}</h4>
                  </div>
                ))}
              </div>
            </motion.section>
          ) : (selectedCategory === 'stays' && selectedLocation && !selectedHotel) ? (
            <motion.section 
              key="hotel-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-6xl mt-12 mb-24 relative"
            >
              <button 
                onClick={() => {
                  setSelectedLocation(null);
                  setSearchQuery('');
                }}
                className="absolute -top-16 left-0 flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-[11px] uppercase tracking-[0.3em] text-charcoal font-bold shadow-sm hover:bg-gold hover:text-cream transition-all group cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to locations
              </button>

              <div className="mb-10 text-center md:text-left">
                <span className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold block mb-2 font-sans">Our Stays</span>
                <h2 className="text-4xl md:text-5xl font-serif text-charcoal font-light">
                  Luxury Hotels &amp; Suites
                </h2>
                <p className="text-sm text-charcoal/50 mt-1 max-w-lg font-sans">
                  Curated premium rooms and executive spaces in {selectedLocation && selectedLocation.includes('Lagos') ? 'Lagos' : selectedLocation && selectedLocation.includes('Abuja') ? 'Abuja' : 'Port Harcourt'}.
                </p>
              </div>

              {renderSearchBar('stays')}

              {getFilteredHotels().length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[2rem] border border-charcoal/5 shadow-2xl shadow-gold/5 font-sans mb-12">
                  <Search className="w-10 h-10 text-gold mx-auto mb-4 opacity-50 animate-pulse" />
                  <h1 className="text-2xl font-serif text-charcoal mb-2 font-light">No Matching Hotels Found</h1>
                  <p className="text-sm text-charcoal/50 max-w-md mx-auto px-4">
                    We couldn&rsquo;t find any hotels matching &ldquo;{searchQuery}&rdquo;. Try using other search keywords or explore other categories below.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-12">
                  {getFilteredHotels().map((hotel, idx) => {
                    const selectedPkg = hotelSelectedPackageMap[hotel.id] || null;
                    return (
                      <motion.div
                        key={hotel.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-gold/5 flex flex-col lg:flex-row group hover:shadow-2xl transition-all duration-500"
                      >
                        <div className="lg:w-1/2 relative overflow-hidden aspect-video lg:aspect-auto h-[350px] lg:h-auto font-sans">
                          <HotelImageSlider images={hotel.images} name={hotel.name} />
                        </div>
                        <div className="lg:w-1/2 p-10 md:p-16 flex flex-col justify-center">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h3 className="text-3xl md:text-4xl font-serif text-charcoal mb-2">{hotel.name}</h3>
                              <div className="flex items-center text-charcoal/40 text-sm">
                                <MapPin className="w-4 h-4 mr-2 text-gold" />
                                {hotel.location}
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <span className="text-[10px] uppercase tracking-widest text-gold font-bold block mb-1">
                                {selectedPkg ? `${selectedPkg.name} Rate` : 'Starting From'}
                              </span>
                              <span className="text-3xl font-serif text-charcoal block">
                                ₦{selectedPkg ? selectedPkg.price : hotel.price}
                              </span>
                            </div>
                          </div>

                          <p className={(hotel as any).note ? "text-charcoal/60 font-normal leading-relaxed mb-4 max-w-md" : "text-charcoal/60 font-normal leading-relaxed mb-6 max-w-md"}>
                            {hotel.description}
                          </p>

                          {(hotel as any).tiers && (
                            <div className="mb-6 p-4 rounded-2xl bg-gold/5 border border-gold/20 font-sans max-w-md">
                              <div className="flex items-center justify-between mb-2.5">
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gold flex items-center gap-1.5">
                                  <Crown className="w-3.5 h-3.5 text-gold" /> Select Package / Room Tier:
                                </span>
                                {selectedPkg && (
                                  <span className="text-[10px] font-bold text-charcoal bg-gold/20 px-2.5 py-0.5 rounded-full">
                                    {selectedPkg.name} Selected
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {(hotel as any).tiers.map((tier: any) => {
                                  const isTierSelected = selectedPkg?.name === tier.name;
                                  return (
                                    <button
                                      key={tier.name}
                                      type="button"
                                      onClick={() => {
                                        const pkg = { name: tier.name, price: tier.price };
                                        setHotelSelectedPackageMap(prev => ({ ...prev, [hotel.id]: pkg }));
                                        setSelectedPackage(pkg);
                                      }}
                                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 border ${
                                        isTierSelected
                                          ? 'bg-gold text-charcoal font-bold border-gold shadow-md ring-2 ring-gold/30 scale-[1.02]'
                                          : 'bg-white border-charcoal/10 text-charcoal/80 hover:border-gold/50 hover:bg-gold/10'
                                      }`}
                                    >
                                      <span>{tier.name}</span>
                                      <span className={isTierSelected ? 'text-charcoal font-bold' : 'text-gold'}>₦{tier.price}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {(hotel as any).note && (
                            <div className="mb-6 p-4 rounded-xl bg-gold/5 border border-gold/20 flex items-center gap-3 max-w-md font-sans">
                              <Sparkles className="w-4 h-4 text-gold flex-shrink-0 animate-pulse" />
                              <span className="text-xs text-charcoal/80 font-medium italic">
                                {(hotel as any).note}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-col gap-4">
                            <div className="p-3 bg-gold/5 border border-gold/15 rounded-2xl max-w-md font-sans">
                              <label className="block text-[10px] uppercase tracking-wider font-bold text-gold mb-1.5 flex items-center gap-1.5">
                                <BedDouble className="w-3.5 h-3.5" /> Rooms Needed (Optional):
                              </label>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {['1 Room', '2 Rooms', '3 Rooms', '4+ Rooms'].map((roomOpt) => {
                                  const isSelected = (hotelRoomsMap[hotel.id] || '1 Room') === roomOpt;
                                  return (
                                    <button
                                      key={roomOpt}
                                      type="button"
                                      onClick={() => {
                                        setHotelRoomsMap(prev => ({ ...prev, [hotel.id]: roomOpt }));
                                        setNumberOfRooms(roomOpt);
                                      }}
                                      className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-gold text-charcoal font-bold shadow-xs'
                                          : 'bg-white border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/10'
                                      }`}
                                    >
                                      {roomOpt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-4">
                              <button 
                                onClick={() => {
                                  const selectedRooms = hotelRoomsMap[hotel.id] || '1 Room';
                                  setNumberOfRooms(selectedRooms);
                                  setSelectedPackage(getEffectiveHotelPackage(hotel));
                                  setBookingType('booking');
                                  setShowBookingOptions(hotel);
                                }}
                                className="bg-charcoal text-cream px-10 py-4 rounded-full text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-gold transition-colors shadow-lg shadow-charcoal/10 inline-block cursor-pointer font-sans"
                              >
                                Book Now
                              </button>
                              <button 
                                onClick={() => {
                                  const selectedRooms = hotelRoomsMap[hotel.id] || '1 Room';
                                  setNumberOfRooms(selectedRooms);
                                  setSelectedPackage(getEffectiveHotelPackage(hotel));
                                  setBookingType('reservation');
                                  setShowBookingOptions(hotel);
                                }}
                                className="bg-cream text-charcoal border border-charcoal/20 px-10 py-4 rounded-full text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-gold hover:text-cream hover:border-gold transition-all duration-300 shadow-md inline-block cursor-pointer font-sans"
                              >
                                Check Availability
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {renderOtherCategoryMatches('stays')}
            </motion.section>
          ) : (selectedCategory === 'homes' && selectedLocation && !selectedShortlet) ? (
            <motion.section 
              key="shortlet-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-6xl mt-12 mb-24 relative"
            >
              <button 
                onClick={() => {
                  setSelectedLocation(null);
                  setSearchQuery('');
                }}
                className="absolute -top-16 left-0 flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-[11px] uppercase tracking-[0.3em] text-charcoal font-bold shadow-sm hover:bg-gold hover:text-cream transition-all group cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to locations
              </button>

              <div className="mb-10 text-center md:text-left">
                <span className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold block mb-2 font-sans">Our Apartments</span>
                <h2 className="text-4xl md:text-5xl font-serif text-charcoal font-light">
                  Private Shortlet Estates
                </h2>
                <p className="text-sm text-charcoal/50 mt-1 max-w-lg font-sans">
                  Architectural masterpieces and high-end living in {selectedLocation && selectedLocation.includes('Lagos') ? 'Lagos' : selectedLocation && selectedLocation.includes('Abuja') ? 'Abuja' : 'Port Harcourt'}.
                </p>
              </div>

              {renderSearchBar('homes')}

              {getFilteredShortlets().length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[2rem] border border-charcoal/5 shadow-2xl shadow-gold/5 font-sans mb-12">
                  <Search className="w-10 h-10 text-gold mx-auto mb-4 opacity-50 animate-pulse" />
                  <h1 className="text-2xl font-serif text-charcoal mb-2 font-light">No Matching Shortlets Found</h1>
                  <p className="text-sm text-charcoal/50 max-w-md mx-auto px-4">
                    We couldn&rsquo;t find any shortlets matching &ldquo;{searchQuery}&rdquo;. Try using other search keywords or explore other categories below.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-12">
                  {getFilteredShortlets().map((shortlet, idx) => (
                    <motion.div
                      key={shortlet.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-gold/5 flex flex-col lg:flex-row group hover:shadow-2xl transition-all duration-500"
                    >
                      <div className="lg:w-1/2 relative overflow-hidden aspect-video lg:aspect-auto h-[350px] lg:h-auto font-sans">
                        <HotelImageSlider images={shortlet.images} name={shortlet.name} />
                      </div>
                      <div className="lg:w-1/2 p-10 md:p-16 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-6 font-sans">
                          <div>
                            <h3 className="text-3xl md:text-4xl font-serif text-charcoal mb-2">{shortlet.name}</h3>
                            <div className="flex items-center text-charcoal/40 text-sm">
                              <MapPin className="w-4 h-4 mr-2 text-gold" />
                              {shortlet.location}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase tracking-widest text-gold font-bold block mb-1">Per Night</span>
                            <span className="text-2xl font-serif text-charcoal">₦{shortlet.price}</span>
                            {shortlet.cautionFee && (
                              <span className="text-[10px] text-charcoal/60 font-mono block mt-0.5 font-bold">
                                + ₦{shortlet.cautionFee} Caution Fee
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-charcoal/60 font-normal leading-relaxed mb-6 max-w-md font-sans">
                          {shortlet.description}
                        </p>
                        {shortlet.features && shortlet.features.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-8">
                            {shortlet.features.map((feat: string, fIdx: number) => (
                              <span
                                key={fIdx}
                                className="text-[10px] font-bold px-3.5 py-1.5 rounded-full tracking-wider flex items-center gap-1 font-sans bg-gold/10 text-gold border border-gold/20 shadow-xs"
                              >
                                {feat}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-4 font-sans">
                          <button 
                            onClick={() => {
                              setBookingType('booking');
                              setShowBookingOptions(shortlet);
                            }}
                            className="bg-charcoal text-cream px-10 py-4 rounded-full text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-gold transition-colors shadow-lg shadow-charcoal/10 inline-block cursor-pointer font-sans"
                          >
                            Book Now
                          </button>
                          <button 
                            onClick={() => {
                              setBookingType('reservation');
                              setShowBookingOptions(shortlet);
                            }}
                            className="bg-cream text-charcoal border border-charcoal/20 px-10 py-4 rounded-full text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-gold hover:text-cream hover:border-gold transition-all duration-300 shadow-md inline-block cursor-pointer font-sans"
                          >
                            Check Availability
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {renderOtherCategoryMatches('homes')}
            </motion.section>
          ) : (selectedCategory === 'drive' && selectedLocation && !selectedCar) ? (
            <CarFleetBrowser
              location={selectedLocation}
              locationLabel={selectedLocation.split(',')[0]}
              onBack={() => {
                setSelectedLocation(null);
                setSearchQuery('');
              }}
              onSelectVehicle={(vehicle) => setSelectedCar(vehicle)}
            />
          ) : (selectedCategory === 'drive' && selectedLocation && selectedCar) ? (
            <CarDetailView
              vehicle={selectedCar}
              onBack={() => setSelectedCar(null)}
              onRequestVehicle={(vehicle) => {
                setCarRequestVehicle(vehicle);
                setShowCarRequestForm(true);
              }}
            />
          ) : (
            <motion.section
              key="enquiry"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-4xl mt-12 mb-24 relative"
            >
              <button 
                onClick={() => {
                  if (selectedCategory === 'stays' && selectedHotel) {
                    setSelectedHotel(null);
                  } else if (selectedCategory === 'homes' && selectedShortlet) {
                    setSelectedShortlet(null);
                  } else if (selectedCategory === 'drive' && selectedCar) {
                    setSelectedCar(null);
                  } else if ((selectedCategory === 'stays' || selectedCategory === 'homes' || selectedCategory === 'drive') && selectedLocation) {
                    setSelectedLocation(null);
                  } else {
                    setSelectedCategory(null);
                  }
                }}
                className="absolute -top-16 left-0 flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-[11px] uppercase tracking-[0.3em] text-charcoal font-bold shadow-sm hover:bg-gold hover:text-cream transition-all group"
              >
                <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to {selectedHotel || selectedShortlet || selectedCar ? (selectedCategory === 'stays' ? 'hotels' : selectedCategory === 'homes' ? 'shortlets' : 'cars') : selectedLocation ? 'locations' : 'selection'}
              </button>

              <div className="bg-white rounded-3xl shadow-2xl shadow-gold/5 overflow-hidden min-h-[600px] flex flex-col md:flex-row">
                {/* Left Panel - Context */}
                <div className="md:w-1/3 bg-charcoal p-12 flex flex-col justify-between text-cream">
                  <div>
                    <div className="text-gold mb-8">
                      {categories.find(c => c.id === selectedCategory)?.icon}
                    </div>
                    <h2 className="text-4xl font-serif mb-4">
                      {categories.find(c => c.id === selectedCategory)?.title}
                    </h2>
                    <p className="text-cream/80 text-sm font-normal leading-relaxed">
                      Tell us about your vision. Our concierge team will craft a proposal tailored to your exact requirements.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Step indicators removed as requested */}
                  </div>
                </div>

                {/* Right Panel - Form */}
                <div className="flex-grow p-12 md:p-20 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`step-${step}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-12"
                    >
                      {step === 1 && (
                        <div className="space-y-8">
                          <label className="block">
                            <span className="text-[12px] uppercase tracking-[0.3em] text-gold font-bold mb-4 block">Destination</span>
                            <div className="relative">
                              <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
                              <input 
                                autoFocus
                                type="text"
                                placeholder="Where are you dreaming of?"
                                className="w-full bg-transparent border-b border-charcoal/30 py-4 pl-8 focus:outline-none focus:border-gold transition-colors text-2xl font-serif placeholder:text-charcoal/30 text-charcoal"
                                value={formData.location}
                                onChange={e => setFormData({...formData, location: e.target.value})}
                              />
                            </div>
                          </label>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-8">
                        {step > 1 ? (
                          <button 
                            onClick={handleBack}
                            className="text-[11px] uppercase tracking-[0.3em] text-charcoal/60 hover:text-charcoal font-bold transition-colors flex items-center"
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                          </button>
                        ) : <div />}
                        
                        {/* Enquiry steps removed as requested. Waiting for new content. */}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Booking Options Modal */}
        <AnimatePresence>
          {showBookingOptions && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-charcoal/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowBookingOptions(null)}
                className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl p-6 md:p-10 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl z-10"
              >
                <button 
                  onClick={() => setShowBookingOptions(null)}
                  className="absolute top-6 right-6 text-charcoal/40 hover:text-charcoal transition-colors z-20"
                >
                  <X className="w-6 h-6" />
                </button>
                
                {showEmailPopup ? (
                  <div>
                    {emailSubmitStatus === 'idle' && (
                      <div className="text-center font-sans">
                        <h3 className="text-2xl font-serif text-charcoal mb-2">Almost Done!</h3>
                        <p className="text-charcoal/60 text-sm mb-6">Provide your phone number to complete your booking request.</p>

                        <form onSubmit={handleEmailSubmit} className="space-y-6">
                          <div className="text-left font-sans">
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gold mb-2">My Mobile Phone Number</label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                              <input
                                required
                                type="tel"
                                placeholder="e.g. +234 801 234 5678"
                                className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-gold transition-colors text-sm font-semibold text-charcoal"
                                value={userPhoneNumber}
                                onChange={(e) => setUserPhoneNumber(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Optional Rooms Selector for Hotels in Email Popup */}
                          {(selectedCategory === 'stays' || showBookingOptions?.type === 'hotel' || showBookingOptions?.category === 'stays' || (showBookingOptions && [...phHotels, ...lagosHotels, ...abujaHotels].some((h: any) => h.id === showBookingOptions.id))) && (
                            <div className="text-left font-sans space-y-2">
                              <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-gold flex items-center gap-1.5">
                                <BedDouble className="w-3.5 h-3.5" /> Number of Rooms Needed (Optional)
                              </label>
                              <div className="flex items-center gap-1.5">
                                {['1 Room', '2 Rooms', '3 Rooms', '4+ Rooms'].map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      setNumberOfRooms(opt);
                                      if (showBookingOptions?.id) {
                                        setHotelRoomsMap(prev => ({ ...prev, [showBookingOptions.id]: opt }));
                                      }
                                    }}
                                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                      numberOfRooms === opt
                                        ? 'bg-gold text-charcoal font-bold shadow-xs'
                                        : 'bg-charcoal/5 border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/10'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                              <input
                                type="text"
                                placeholder="Or specify custom rooms (e.g. 2 Deluxe + 1 Suite)..."
                                className="w-full bg-charcoal/5 border border-charcoal/10 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-gold transition-colors text-xs font-semibold text-charcoal placeholder:font-normal placeholder:text-charcoal/30"
                                value={numberOfRooms}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNumberOfRooms(val);
                                  if (showBookingOptions?.id) {
                                    setHotelRoomsMap(prev => ({ ...prev, [showBookingOptions.id]: val }));
                                  }
                                }}
                              />
                            </div>
                          )}

                          <div className="space-y-3 pt-4">
                            <button
                              type="submit"
                              className="flex items-center justify-center space-x-3 w-full bg-gold text-charcoal py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/20 transition-all duration-300 cursor-pointer shadow-md"
                            >
                              <Send className="w-4 h-4" />
                              <span>Submit Inquiry</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowEmailPopup(false)}
                              className="w-full bg-charcoal/5 border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/10 hover:text-charcoal py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" /> Go Back
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {(emailSubmitStatus === 'saving' || emailSubmitStatus === 'sending') && (
                      <div className="flex flex-col items-center justify-center py-10 text-center font-sans">
                        <Loader className="w-10 h-10 text-gold animate-spin mb-4" />
                        <h3 className="text-xl font-serif text-charcoal mb-2">
                          Sending Inquiry...
                        </h3>
                        <p className="text-charcoal/60 text-sm max-w-xs leading-relaxed">
                          Your request is being processed and sent to Elite Booking...
                        </p>
                      </div>
                    )}

                    {emailSubmitStatus === 'success' && (
                      <div className="flex flex-col items-center justify-center py-2 text-center font-sans">
                        <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mb-3.5 ring-8 ring-emerald-500/5">
                          <Check className="w-7 h-7 stroke-[2.5]" />
                        </div>
                        
                        <h3 className="text-2xl font-serif font-semibold text-charcoal mb-1">
                          Inquiry Sent Successfully!
                        </h3>
                        
                        <p className="text-gold font-serif text-sm italic mb-4">
                          Thank you for choosing Elite Booking.
                        </p>

                        <div className="bg-charcoal/5 border border-charcoal/10 rounded-2xl p-4 text-left w-full mb-5 text-xs text-charcoal/80 space-y-3 font-sans">
                          <p className="leading-relaxed">
                            We’ve received your booking request and our team is confirming availability with <strong className="text-charcoal font-semibold">{showBookingOptions.name}</strong>.
                          </p>

                          <div className="border-t border-charcoal/10 pt-3">
                            <p className="font-bold uppercase tracking-wider text-[10px] text-gold mb-1.5">
                              What happens next?
                            </p>
                            <div className="flex items-start gap-2 text-charcoal/90 font-medium">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>We’ll contact you within <strong>5–15 minutes</strong> via WhatsApp or phone call.</span>
                            </div>
                          </div>

                          <div className="border-t border-charcoal/10 pt-2.5 text-[11px] text-charcoal/60">
                            If you don’t hear from us, contact us directly:
                            <div className="flex items-center gap-2 mt-1 text-charcoal font-bold">
                              <span className="text-emerald-600 font-bold">WhatsApp:</span> +234 707 225 3857
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 w-full">
                          <a
                            href={`https://wa.me/2347072253857?text=${encodeURIComponent(`Hello Elite Booking, I just submitted a booking inquiry for ${showBookingOptions.name}.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 px-6 rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                          >
                            <svg className="w-5 h-5 fill-white flex-shrink-0" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            <span>💬 Chat with us on WhatsApp</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              setShowEmailPopup(false);
                              setShowBookingOptions(null);
                            }}
                            className="w-full bg-charcoal text-cream py-3.5 px-6 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-gold hover:text-cream transition-all duration-300 cursor-pointer shadow-sm"
                          >
                            Continue Browsing Hotels
                          </button>
                        </div>
                      </div>
                    )}


                  </div>
                ) : bookingStep === 1 ? (
                  <div className="flex flex-col h-full">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-serif text-charcoal mb-1">Select Dates &amp; Times</h3>
                      <p className="text-charcoal/50 text-xs text-balance">Choose your desired check-in and check-out date and time for {showBookingOptions.name}</p>
                    </div>

                    {/* One combined date + time control per field — no separate calendar step or AM/PM dropdowns */}
                    <div className="space-y-5 mb-8">
                      <div>
                        <label className="block text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Check-in
                        </label>
                        <input
                          type="datetime-local"
                          value={toDateTimeLocalValue(checkinDate)}
                          min={toDateTimeLocalValue(new Date())}
                          onChange={(e) => handleCheckinDateTimeChange(e.target.value)}
                          className="w-full bg-charcoal/5 hover:bg-charcoal/10 transition-colors border border-charcoal/10 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-gold text-charcoal cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-[0.2em] text-gold font-bold mb-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Check-out
                        </label>
                        <input
                          type="datetime-local"
                          value={toDateTimeLocalValue(checkoutDate)}
                          min={toDateTimeLocalValue(checkinDate) || toDateTimeLocalValue(new Date())}
                          onChange={(e) => handleCheckoutDateTimeChange(e.target.value)}
                          className="w-full bg-charcoal/5 hover:bg-charcoal/10 transition-colors border border-charcoal/10 rounded-xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-gold text-charcoal cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Selected Summary & Next Button */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 bg-gold/5 border border-gold/15 rounded-xl p-3.5 text-center">
                        <div>
                          <p className="text-[10px] text-gold uppercase tracking-wider font-bold mb-0.5">Check-in</p>
                          <p className="text-[11px] font-semibold text-charcoal">
                            {formatShortDateTime(checkinDate)}
                          </p>
                        </div>
                        <div className="border-l border-gold/15">
                          <p className="text-[10px] text-gold uppercase tracking-wider font-bold mb-0.5">Check-out</p>
                          <p className={`text-[11px] font-semibold ${checkoutDate ? 'text-charcoal' : 'text-red-500 font-bold animate-pulse'}`}>
                            {checkoutDate ? formatShortDateTime(checkoutDate) : 'Selection Required'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBookingStep(2)}
                        disabled={!checkinDate || !checkoutDate}
                        className={`w-full py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2 transition-all duration-300
                          ${(checkinDate && checkoutDate)
                            ? 'bg-charcoal text-cream hover:bg-gold hover:shadow-lg hover:shadow-gold/20 cursor-pointer'
                            : 'bg-charcoal/20 text-charcoal/40 cursor-not-allowed'
                          }
                        `}
                      >
                        <span>Next: Confirm {bookingType === 'reservation' ? 'Availability' : 'Booking'}</span> <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <h3 className="text-2xl font-serif text-charcoal mb-2">{bookingType === 'reservation' ? 'Availability Summary' : 'Booking Summary'}</h3>
                    <p className="text-charcoal/60 text-sm mb-6">Confirm your elite {bookingType === 'reservation' ? 'availability' : 'booking'} details for <span className="font-semibold text-charcoal">{showBookingOptions.name}</span></p>

                    <div className="bg-charcoal/5 border border-charcoal/10 rounded-2xl p-6 mb-8 text-left space-y-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-charcoal/40 block mb-0.5">Property / Asset</span>
                        <span className="text-base font-serif text-charcoal font-medium">{showBookingOptions.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-t border-charcoal/10 pt-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-charcoal/40 block mb-0.5">Check-in</span>
                          <span className="text-xs font-bold text-charcoal block">
                            {checkinDate ? checkinDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </span>
                          <span className="text-[11px] text-charcoal/60 mt-0.5 block">{checkinDate ? checkinDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}</span>
                        </div>
                        <div className="border-l border-charcoal/10 pl-4">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-charcoal/40 block mb-0.5">Check-out</span>
                          <span className="text-xs font-bold text-charcoal block">
                            {checkoutDate ? checkoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </span>
                          <span className="text-[11px] text-charcoal/60 mt-0.5 block">{checkoutDate ? checkoutDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}</span>
                        </div>
                      </div>
                      {selectedPackage ? (
                        <div className="border-t border-charcoal/10 pt-4 flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-gold block flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5 text-gold" /> Selected Package Rate
                          </span>
                          <span className="text-base font-serif font-semibold text-gold">
                            ₦{selectedPackage.price} <span className="text-[10px] font-sans text-charcoal/60">({selectedPackage.name})</span>
                          </span>
                        </div>
                      ) : showBookingOptions.price ? (
                        <div className="border-t border-charcoal/10 pt-4 flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-charcoal/40 block">Rate starting from</span>
                          <span className="text-base font-serif font-semibold text-gold">₦{showBookingOptions.price}</span>
                        </div>
                      ) : null}
                      {(selectedCategory === 'stays' || showBookingOptions?.type === 'hotel' || showBookingOptions?.category === 'stays' || (showBookingOptions && [...phHotels, ...lagosHotels, ...abujaHotels].some((h: any) => h.id === showBookingOptions.id))) && (
                        <div className="border-t border-charcoal/10 pt-4 flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-gold block flex items-center gap-1">
                            <BedDouble className="w-3.5 h-3.5" /> Rooms Needed
                          </span>
                          <span className="text-xs font-bold text-charcoal">{numberOfRooms || '1 Room'}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          setUserPhoneNumber('');
                          setShowEmailPopup(true);
                        }}
                        className="flex items-center justify-center space-x-3 w-full bg-gold text-charcoal py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/20 transition-all duration-300 cursor-pointer shadow-md"
                      >
                        <Send className="w-4 h-4" />
                        <span>Submit</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setBookingStep(1)}
                        className="w-full bg-charcoal/5 border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/10 hover:text-charcoal py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" /> Change Dates & Time
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>

      <footer className="p-12 border-t border-charcoal/10 flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
        <div className="text-[11px] uppercase tracking-[0.3em] text-charcoal/60 font-medium">
          &copy; 2026 Elite Bookings Luxury Travel. All rights reserved.
        </div>
        <div className="flex items-center space-x-12 text-[12px] uppercase tracking-[0.3em] text-charcoal/80 font-bold">
          <div className="flex items-center space-x-6">
            <span className="text-[11px] text-charcoal/60 font-bold uppercase tracking-widest">Connect:</span>
            <a href="https://www.tiktok.com/@elitebooking.ng" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors transform hover:scale-110" title="TikTok">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.03 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-3.48.01-6.96.01-10.44z"/></svg>
            </a>
            <a href="https://www.instagram.com/elitebooking.ng" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors transform hover:scale-110" title="Instagram">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Floating AI Concierge Quick Trigger (Bottom-Left) */}
      {!isAIConciergeOpen && (
        <div className="fixed bottom-4 left-3 sm:bottom-6 sm:left-6 z-50 max-w-[48vw]">
          <motion.button
            onClick={() => setIsAIConciergeOpen(true)}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex items-center gap-1.5 sm:gap-2.5 bg-charcoal text-gold px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-full shadow-[0_8px_30px_rgba(212,175,55,0.35)] hover:shadow-[0_12px_36px_rgba(212,175,55,0.5)] border border-gold/60 transition-all duration-300 group cursor-pointer hover:scale-105 active:scale-95 font-bold text-[10px] sm:text-xs uppercase tracking-wider"
          >
            <Sparkles className="w-4 h-4 text-gold fill-gold/30 animate-pulse flex-shrink-0" />
            <span className="font-extrabold whitespace-nowrap">AI Concierge</span>
          </motion.button>
        </div>
      )}

      {/* Floating WhatsApp Assistance Button (Bottom-Right) */}
      <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-50 flex flex-col items-end max-w-[48vw]">
          <motion.a
            id="whatsapp-assistance-button"
            href="https://wa.me/2347072253857?text=Hello%2C%20I%20need%20some%20assistance%20with%20a%20booking."
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex items-center gap-2 bg-[#25D366] text-white px-3.5 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-3.5 rounded-full shadow-[0_8px_32px_rgba(37,211,102,0.3)] hover:shadow-[0_12px_40px_rgba(37,211,102,0.45)] border border-emerald-400/30 transition-all duration-300 group cursor-pointer hover:scale-105 active:scale-95"
          >
            {/* Subtle pulse effect */}
            <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-20 group-hover:scale-110 transition-transform duration-500 animate-ping -z-10" />
            
            <span className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider whitespace-nowrap drop-shadow-sm font-sans">
              <span className="hidden sm:inline">Need Assistance</span>
              <span className="sm:hidden">Assistance</span>
            </span>
            <div className="bg-white/20 p-1 rounded-full flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
          </motion.a>
      </div>

      {/* Elegant Floating Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            id="back-to-top-button"
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-18 right-3 sm:bottom-22 sm:right-6 md:bottom-28 md:right-8 z-50 bg-charcoal text-gold hover:bg-gold hover:text-charcoal p-3 sm:p-3.5 rounded-full shadow-[0_8px_32px_rgba(212,175,55,0.25)] border border-gold/40 transition-all duration-300 group cursor-pointer"
            aria-label="Back to Top"
          >
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-y-1 transition-all duration-300" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Admin Dashboard Modal */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => handleNavigateBack(() => setIsAdminOpen(false))}
      />

      {/* AI Concierge Modal */}
      <AIConciergeModal
        isOpen={isAIConciergeOpen}
        onClose={() => handleNavigateBack(() => setIsAIConciergeOpen(false))}
      />

      {/* Private Jet Request Modal */}
      <PrivateJetRequestModal
        isOpen={showJetRequestForm}
        onClose={() => setShowJetRequestForm(false)}
        defaultRequirement={jetRequestPreset}
      />

      {/* Moving & Relocation Request Modal */}
      <MovingRequestModal
        isOpen={showMovingRequestForm}
        onClose={() => setShowMovingRequestForm(false)}
      />

      {/* Car Rental Request Modal */}
      <CarRequestModal
        isOpen={showCarRequestForm}
        onClose={() => setShowCarRequestForm(false)}
        vehicle={carRequestVehicle}
        location={selectedLocation ? selectedLocation.split(',')[0] : ''}
      />
    </div>
  );
}
