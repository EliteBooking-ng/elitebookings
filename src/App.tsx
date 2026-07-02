/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Hotel, 
  Home, 
  Car, 
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
  Phone,
  Check,
  Copy,
  Loader,
  Search,
  Sliders,
  Filter,
  ArrowUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from './firebase';
import { 
  doc,
  getDocFromServer,
  collection,
  addDoc
} from 'firebase/firestore';
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

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

type Category = 'stays' | 'homes' | 'drive' | null;

interface EnquiryData {
  location: string;
  dates: string;
  guests: string;
  preferences: string;
}

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<Category>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<any | null>(null);
  const [selectedShortlet, setSelectedShortlet] = useState<any | null>(null);
  const [selectedCar, setSelectedCar] = useState<any | null>(null);

  // Luxury unified search states and helper functions
  const [searchQuery, setSearchQuery] = useState('');

  const getFilteredHotels = () => {
    const query = searchQuery.trim().toLowerCase();
    const sourceHotels = selectedLocation && selectedLocation.toLowerCase().includes('lagos')
      ? lagosHotels
      : phHotels;
    if (!query) return sourceHotels;
    return sourceHotels.filter(hotel => 
      hotel.name.toLowerCase().includes(query) ||
      hotel.location.toLowerCase().includes(query) ||
      hotel.description.toLowerCase().includes(query) ||
      ((hotel as any).note && (hotel as any).note.toLowerCase().includes(query)) ||
      'hotels'.includes(query) ||
      'stays'.includes(query)
    );
  };

  const getFilteredShortlets = () => {
    const query = searchQuery.trim().toLowerCase();
    const sourceShortlets = selectedLocation && selectedLocation.toLowerCase().includes('lagos')
      ? lagosShortlets
      : phShortlets;
    if (!query) return sourceShortlets;
    return sourceShortlets.filter(shortlet => 
      shortlet.name.toLowerCase().includes(query) ||
      shortlet.location.toLowerCase().includes(query) ||
      shortlet.description.toLowerCase().includes(query) ||
      'shortlets'.includes(query) ||
      'estates'.includes(query) ||
      'apartments'.includes(query) ||
      'villas'.includes(query) ||
      'homes'.includes(query)
    );
  };

  const getFilteredCars = () => {
    const query = searchQuery.trim().toLowerCase();
    const sourceCars = selectedLocation && selectedLocation.toLowerCase().includes('lagos')
      ? lagosCars
      : phCars;
    if (!query) return sourceCars;
    return sourceCars.filter(car => 
      car.name.toLowerCase().includes(query) ||
      car.location.toLowerCase().includes(query) ||
      car.description.toLowerCase().includes(query) ||
      'cars'.includes(query) ||
      'rentals'.includes(query) ||
      'fleet'.includes(query) ||
      'drive'.includes(query) ||
      'vehicles'.includes(query) ||
      'transport'.includes(query) ||
      'truck'.includes(query) ||
      'bus'.includes(query)
    );
  };

  const renderSearchBar = (currentCategory: 'stays' | 'homes' | 'drive') => {
    const catLabels = {
      stays: { singular: 'hotel', plural: 'hotels' },
      homes: { singular: 'shortlet', plural: 'shortlets' },
      drive: { singular: 'car rental', plural: 'car rentals' }
    };

    return (
      <div className="w-full mb-10 bg-white border border-charcoal/5 rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-gold/5 font-sans">
        <div className="flex flex-col gap-4">
          <label className="block text-[10px] uppercase tracking-[0.25em] font-medium text-gold mb-1">
            Search {selectedLocation && selectedLocation.includes('Lagos') ? 'Lagos' : 'Port Harcourt'} Listings
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

            {currentCategory === 'homes' && [
              { label: 'GRA Sani Abacha', value: 'Sani Abacha' },
              { label: 'Studio Room', value: 'Studio' },
              { label: 'Diamond Blue', value: 'Diamond' }
            ].map(tag => (
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

            {currentCategory === 'drive' && [
              { label: 'Lexus GX 460', value: 'GX' },
              { label: 'Range Rover Velar', value: 'Velar' },
              { label: 'Luxury Bus', value: 'bus' },
              { label: 'Delivery Trucks', value: 'truck' }
            ].map(tag => (
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

  const renderOtherCategoryMatches = (activeCat: 'stays' | 'homes' | 'drive') => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.trim();
    const otherHotels = activeCat !== 'stays' ? getFilteredHotels() : [];
    const otherShortlets = activeCat !== 'homes' ? getFilteredShortlets() : [];
    const otherCars = activeCat !== 'drive' ? getFilteredCars() : [];

    const totalMatches = otherHotels.length + otherShortlets.length + otherCars.length;
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
          {otherHotels.map((hotel) => (
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
                    <span className="text-[9px] uppercase tracking-widest text-gold font-bold block">From</span>
                    <span className="text-xl font-serif text-charcoal">₦{hotel.price}</span>
                  </div>
                </div>
                <p className="text-charcoal/60 text-xs font-normal leading-relaxed mb-6 line-clamp-2">
                  {hotel.description}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
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
          ))}

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

          {otherCars.map((car) => (
            <motion.div
              key={`other-car-${car.id}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 border border-charcoal/5 rounded-[2rem] overflow-hidden shadow-lg flex flex-col md:flex-row group hover:shadow-2xl hover:bg-white transition-all duration-500"
            >
              <div className="md:w-2/5 relative overflow-hidden aspect-video md:aspect-auto h-[240px] md:h-auto font-sans">
                <HotelImageSlider images={car.images} name={car.name} />
                <span className="absolute top-4 left-4 bg-cream border border-gold/40 text-gold text-[9px] uppercase tracking-[0.25em] font-bold px-3 py-1.5 rounded-full z-10 shadow-md">
                  Luxury Fleet
                </span>
              </div>
              <div className="md:w-3/5 p-8 flex flex-col justify-center font-sans font-sans">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-2xl font-serif text-charcoal mb-1">{car.name}</h4>
                    <div className="flex items-center text-charcoal/40 text-xs">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-gold" />
                      {car.location}
                    </div>
                  </div>
                  {car.price && (
                    <div className="text-right font-sans">
                      <span className="text-[9px] uppercase tracking-widest text-gold font-bold block">Per Day</span>
                      <span className="text-xl font-serif text-charcoal">₦{car.price}</span>
                    </div>
                  )}
                </div>
                <p className="text-charcoal/60 text-xs font-normal leading-relaxed mb-6 line-clamp-2">
                  {car.description}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
                      setSelectedCategory('drive');
                      setBookingType('booking');
                      setShowBookingOptions(car);
                    }}
                    className="bg-charcoal text-cream px-6 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-gold transition-colors shadow-md inline-block cursor-pointer font-sans"
                  >
                    Rent Vehicle
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedCategory('drive');
                      setBookingType('reservation');
                      setShowBookingOptions(car);
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
  const [bookingType, setBookingType] = useState<'booking' | 'reservation'>('booking');
  const [bookingStep, setBookingStep] = useState<1 | 2>(1); // 1 = Date/Time, 2 = WhatsApp Options
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [userPhoneNumber, setUserPhoneNumber] = useState('');
  const [emailSubmitStatus, setEmailSubmitStatus] = useState<'idle' | 'saving' | 'sending' | 'success' | 'manual_fallback'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [checkinDate, setCheckinDate] = useState<Date | null>(null);
  const [checkinHour, setCheckinHour] = useState<string>('12');
  const [checkinMinute, setCheckinMinute] = useState<string>('00');
  const [checkinPeriod, setCheckinPeriod] = useState<string>('PM');
  const [checkoutDate, setCheckoutDate] = useState<Date | null>(null);
  const [checkoutHour, setCheckoutHour] = useState<string>('12');
  const [checkoutMinute, setCheckoutMinute] = useState<string>('00');
  const [checkoutPeriod, setCheckoutPeriod] = useState<string>('PM');
  const [activeDateTab, setActiveDateTab] = useState<'checkin' | 'checkout'>('checkin');
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [showBackToTop, setShowBackToTop] = useState(false);

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
      setActiveDateTab('checkin');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCheckinDate(tomorrow);
      setCheckinHour('12');
      setCheckinMinute('00');
      setCheckinPeriod('PM');

      setCheckoutDate(null);
      setCheckoutHour('12');
      setCheckoutMinute('00');
      setCheckoutPeriod('PM');

      setCurrentMonth(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1));
      setShowEmailPopup(false);
      setUserPhoneNumber('');
      setEmailSubmitStatus('idle');
      setErrorMessage('');
    }
  }, [showBookingOptions]);

  const handleCheckinDateChange = (date: Date) => {
    setCheckinDate(date);
    if (checkoutDate && date >= checkoutDate) {
      setCheckoutDate(null);
    }
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
        'https://lh3.googleusercontent.com/d/1_QjzozOTFjdhUxbG0cX5xo-LCxJTXbOo'
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
      id: 'rollace-hotel',
      name: 'Rollace Hotel',
      location: '46/48 Awoniyi Elemo St, Airport Rd, Ajao Estate, Lagos',
      price: '65,000',
      tiers: [
        { name: 'Royal Suite', price: '180,000' },
        { name: 'Executive Suite', price: '120,000' },
        { name: 'Deluxe Room', price: '95,000' },
        { name: 'Superior Room', price: '75,000' },
        { name: 'Standard Room', price: '65,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/19CHYIe3o0lZSv6y0c0hXGwAZFdTLUIZ4',
        'https://lh3.googleusercontent.com/d/1uowT5nX1ZM84JFRAw70B-_BkVsoSpyjO',
        'https://lh3.googleusercontent.com/d/15byRKs1l6HmRz5dsEb8LVoU82QzeqhDM',
        'https://lh3.googleusercontent.com/d/1pmud0XksIwTEbWfGU5u6CzKqX9yThs4a'
      ],
      description: 'Experience first-class hospitality, tranquil stays, and premium dining at Rollace Hotel, perfectly located at Ajao Estate, Lagos (near the Airport). Offering premium comfort for international travelers and staycationers alike.'
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
      name: 'ROYAL JATOZ HOTELS Lagos',
      location: '9 Rasmon Street, Off Osolo Wy, Ikeja, Lagos',
      price: '46,000',
      tiers: [
        { name: 'Silver', price: '54,000' },
        { name: 'Bronze', price: '46,000' }
      ],
      images: [
        'https://lh3.googleusercontent.com/d/1rExuarv7I5gQViY6q7-CbFPjsCrj4Q1g',
        'https://lh3.googleusercontent.com/d/1w5TO0OzBc1DX0NxSHk89gg4GFwqwHY5f',
        'https://lh3.googleusercontent.com/d/1NZKm-5An50njrxa8UGWfxvVlB91iHS_J'
      ],
      description: 'Experience relaxing stays, high-value comfort, and excellent hospitality at Royal Jatoz Hotels on Rasmon Street, off Osolo Way, Ikeja, Lagos. A perfect spot for cozy, convenient lodging.'
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
    }
  ];

  const lagosShortlets: any[] = [];
  const lagosCars: any[] = [];

  const phShortlets = [
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

  const phCars = [
    {
      id: 'gx-460',
      name: 'GX 460',
      location: 'Port Harcourt, Rivers State',
      price: '',
      images: [
        'https://images.dealersync.com/2174/Photos/826466/20220510223658719_IMG_6371.jpg?_=743cb49fa9df567a3ddcfc880d45e73cbc146174',
        'https://img.nigeriacarmart.com/upload/25/8p/iz7d/2015-lexus-gx-gx-460-jd.webp'
      ],
      description: 'Commanding presence and peerless luxury. Perfect for navigating the city in absolute comfort.'
    },
    {
      id: 'range-rover-velar',
      name: 'Range Rover velar',
      location: 'Port Harcourt, Rivers State',
      price: '',
      images: [
        'https://www.autocollectionofmurfreesboro.com/imagetag/17619/main/l/Used-2018-Land-Rover-Range-Rover-Velar-P380-FIRST-EDITION-W94K-MSRP!!-1718852884.jpg',
        'https://images.cars.ng/images/cars-ng/product_ca603791s_foreign_used_2018_range_rover_velar_p250_s_for_sale_in_lagos_1771920743850_5gi5jj_5eeb1c_4_500x500.jpg'
      ],
      description: 'The ultimate blend of reliability and luxury. Ideal for both city drives and longer journeys.'
    },
    {
      id: 'luxury-bus',
      name: '43 seater luxury bus',
      location: 'Port Harcourt, Rivers State',
      price: '',
      images: [
        'https://s.alicdn.com/@sc04/kf/He3c64517b48a4684b9369555a8fa9a08g/Best-Selling-Used-Youtong-Second-Hand-Bus-49-Seats-Bus-Transports-Coach-Buss-for-Sale.jpg'
      ],
      description: 'Premium group travel experience with maximum comfort, climate control, and spacious seating for large delegations.'
    },
    {
      id: 'delivery-trucks',
      name: 'Delivery Trucks',
      location: 'Port Harcourt, Rivers State',
      price: '',
      images: [
        'https://www.truck1.com.ng/img/xxl/7117/Scania-P-270-6x2-manual-9-85-box-Netherlands_7117_312397052339.jpg',
        'https://www.daibau.ng/showfile.php?id=23861'
      ],
      description: 'Reliable logistics and haulage solutions for all your delivery needs. Professional service for safe and timely transport.'
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
      image: 'https://images.dealersync.com/2174/Photos/826466/20220510223658719_IMG_6371.jpg?_=743cb49fa9df567a3ddcfc880d45e73cbc146174',
      description: 'A fleet of exceptional vehicles for your most refined journeys.'
    }
  ];

  const handleCategorySelect = (id: Category) => {
    setSelectedCategory(id);
    setStep(1);
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);



  const reset = () => {
    setSelectedCategory(null);
    setSelectedLocation(null);
    setSelectedHotel(null);
    setSelectedShortlet(null);
    setSelectedCar(null);
    setStep(1);
    setFormData({ location: '', dates: '', guests: '', preferences: '' });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPhoneNumber.trim()) return;

    setEmailSubmitStatus('saving');
    setErrorMessage('');

    const formattedCheckin = checkinDate 
      ? `${checkinDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${checkinHour}:${checkinMinute} ${checkinPeriod}` 
      : 'N/A';

    const formattedCheckout = checkoutDate 
      ? `${checkoutDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${checkoutHour}:${checkoutMinute} ${checkoutPeriod}` 
      : 'N/A';

    const kindLabel = bookingType === 'reservation' ? 'availability' : 'booking';
    const capKindLabel = bookingType === 'reservation' ? 'Availability' : 'Booking';

    const bookingText = `Hello Elite Bookings Team,

I would like to make an elite ${kindLabel} enquiry. Below are the details of the ${kindLabel}:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPERTY / ASSET DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${showBookingOptions.name}
Location: ${showBookingOptions.location}
Rate: ${showBookingOptions.price ? `₦${showBookingOptions.price}` : 'N/A'}

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
      price: showBookingOptions.price || '',
      checkin: formattedCheckin,
      checkout: formattedCheckout,
      clientPhone: userPhoneNumber,
      type: bookingType,
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

    // 2. Automated background email sending
    const accessKey = (import.meta as any).env.VITE_WEB3FORMS_ACCESS_KEY;

    const triggerMailtoDirectly = () => {
      const subject = `Elite ${capKindLabel} Enquiry: ${showBookingOptions.name}`;
      const mailtoUrl = `mailto:Elitebooking.ng@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bookingText)}`;
      
      // Auto-trigger native mail composer
      window.location.href = mailtoUrl;

      // Delightful feedback
      confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.6 }
      });

      // Instantly dismiss modal and clean state
      setShowEmailPopup(false);
      setShowBookingOptions(null);
    };

    if (accessKey && accessKey.trim() !== '') {
      setEmailSubmitStatus('sending');
      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            access_key: accessKey,
            subject: `Elite Booking Enquiry: ${showBookingOptions.name}`,
            from_name: 'Elite Bookings System',
            to_email: 'Elitebooking.ng@gmail.com',
            message: bookingText,
            phone: userPhoneNumber
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setEmailSubmitStatus('success');
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        } else {
          console.error('Web3Forms email delivery error:', data);
          triggerMailtoDirectly();
        }
      } catch (emailError) {
        console.error('Network error during email auto-transmit:', emailError);
        triggerMailtoDirectly();
      }
    } else {
      // Direct instant redirection to the mail client - exactly as requested!
      triggerMailtoDirectly();
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

  const renderCalendar = (mode: 'checkin' | 'checkout') => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const handleMonthChange = (direction: 'prev' | 'next') => {
      setCurrentMonth(prev => {
        const newMonth = new Date(prev);
        if (direction === 'prev') {
          newMonth.setMonth(newMonth.getMonth() - 1);
        } else {
          newMonth.setMonth(newMonth.getMonth() + 1);
        }
        return newMonth;
      });
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="w-full">
        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-6">
          <button 
            type="button"
            onClick={() => handleMonthChange('prev')}
            className="p-2 border border-charcoal/10 rounded-full hover:bg-gold/10 hover:border-gold transition-colors text-charcoal cursor-pointer flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h4 className="font-serif text-charcoal font-medium text-base md:text-lg leading-none">
            {monthNames[month]} {year}
          </h4>
          <button 
            type="button"
            onClick={() => handleMonthChange('next')}
            className="p-2 border border-charcoal/10 rounded-full hover:bg-gold/10 hover:border-gold transition-colors text-charcoal cursor-pointer flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-3">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <span key={day} className="text-[10px] uppercase font-mono tracking-wider font-semibold text-charcoal/40">
              {day}
            </span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {days.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const targetDate = mode === 'checkin' ? checkinDate : checkoutDate;
            const isSelected = targetDate && 
              date.getDate() === targetDate.getDate() &&
              date.getMonth() === targetDate.getMonth() &&
              date.getFullYear() === targetDate.getFullYear();

            let isPast = date < today;
            if (mode === 'checkout' && checkinDate) {
              const checkinCompare = new Date(checkinDate);
              checkinCompare.setHours(0, 0, 0, 0);
              isPast = isPast || date < checkinCompare;
            }

            return (
              <button
                key={`day-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${idx}`}
                type="button"
                disabled={isPast}
                onClick={() => {
                  if (mode === 'checkin') {
                    handleCheckinDateChange(date);
                    setTimeout(() => {
                      setActiveDateTab('checkout');
                    }, 180);
                  } else {
                    setCheckoutDate(date);
                  }
                }}
                className={`
                  aspect-square flex items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer
                  ${isPast 
                    ? 'text-charcoal/20 cursor-not-allowed hover:bg-transparent' 
                    : isSelected 
                      ? 'bg-gold text-white font-bold scale-105 shadow-md shadow-gold/25' 
                      : 'text-charcoal hover:bg-gold/10 hover:text-gold'
                  }
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
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
      <nav className="p-8 flex justify-between items-center z-50">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-serif tracking-[0.2em] uppercase font-light text-charcoal"
        >
          Elite Bookings
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:flex space-x-12 text-[11px] uppercase tracking-[0.3em] font-semibold text-charcoal/80"
        >
          <button onClick={reset} className="hover:text-gold transition-colors">Home</button>
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
          ) : ((selectedCategory === 'stays' || selectedCategory === 'homes' || selectedCategory === 'drive') && !selectedLocation) ? (
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
                  {selectedCategory === 'stays' ? 'Hotels' : selectedCategory === 'homes' ? 'Shortlets' : 'Car Rentals'} in <span className="italic font-serif">Nigeria</span>
                </h2>
                <p className="text-charcoal/60 max-w-lg mx-auto font-normal">
                  Explore our curated selection of ultra-luxury {selectedCategory === 'stays' ? 'stays' : selectedCategory === 'homes' ? 'private estates' : 'private fleet'} in the most exclusive regions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Port Harcourt */}
                <motion.div
                  whileHover={{ y: -10 }}
                  onClick={() => {
                    setSelectedLocation('Port Harcourt, Rivers State');
                  }}
                  className="group cursor-pointer relative overflow-hidden rounded-3xl aspect-[4/3] bg-charcoal shadow-2xl shadow-gold/10"
                >
                  <img 
                    src="https://media.premiumtimesng.com/wp-content/files/2019/11/Port-Harcourt-Rivers-State.jpg" 
                    alt="Port Harcourt"
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000 ease-out"
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
                    src="https://images.unsplash.com/photo-1618245341355-d2a2c1490216?q=80&w=800&auto=format&fit=crop" 
                    alt="Lagos"
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000 ease-out"
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
              </div>

              <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 opacity-30 pointer-events-none max-w-2xl mx-auto">
                {['Abuja', 'Enugu'].map(city => (
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
                  Curated premium rooms and executive spaces in {selectedLocation && selectedLocation.includes('Lagos') ? 'Lagos' : 'Port Harcourt'}.
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
                  {getFilteredHotels().map((hotel, idx) => (
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
                            <span className="text-[10px] uppercase tracking-widest text-gold font-bold block mb-1">From</span>
                            <span className="text-3xl font-serif text-charcoal block mb-6">₦{hotel.price}</span>
                            
                            {(hotel as any).tiers && (
                              <div className="w-full min-w-[180px] space-y-2.5 pt-6 border-t border-charcoal/5 font-sans">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-charcoal/30 font-bold mb-4">Available Tiers</p>
                                {(hotel as any).tiers.map((tier: any) => (
                                  <div key={tier.name} className="flex justify-between items-center gap-6">
                                    <span className="text-[10px] uppercase tracking-widest text-charcoal/50 font-bold">{tier.name}</span>
                                    <span className="text-sm font-serif text-gold">₦{tier.price}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className={(hotel as any).note ? "text-charcoal/60 font-normal leading-relaxed mb-4 max-w-md" : "text-charcoal/60 font-normal leading-relaxed mb-10 max-w-md"}>
                          {hotel.description}
                        </p>
                        {(hotel as any).note && (
                          <div className="mb-6 p-4 rounded-xl bg-gold/5 border border-gold/20 flex items-center gap-3 max-w-md font-sans">
                            <Sparkles className="w-4 h-4 text-gold flex-shrink-0 animate-pulse" />
                            <span className="text-xs text-charcoal/80 font-medium italic">
                              {(hotel as any).note}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-4">
                          <button 
                            onClick={() => {
                              setBookingType('booking');
                              setShowBookingOptions(hotel);
                            }}
                            className="bg-charcoal text-cream px-10 py-4 rounded-full text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-gold transition-colors shadow-lg shadow-charcoal/10 inline-block cursor-pointer font-sans"
                          >
                            Book Now
                          </button>
                          <button 
                            onClick={() => {
                              setBookingType('reservation');
                              setShowBookingOptions(hotel);
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
                  Architectural masterpieces and high-end living in {selectedLocation && selectedLocation.includes('Lagos') ? 'Lagos' : 'Port Harcourt'}.
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
                          </div>
                        </div>
                        <p className="text-charcoal/60 font-normal leading-relaxed mb-10 max-w-md font-sans">
                          {shortlet.description}
                        </p>
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
            <motion.section 
              key="car-list"
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
                <span className="text-[10px] uppercase tracking-[0.4em] text-gold font-bold block mb-2 font-sans">Our Fleet</span>
                <h2 className="text-4xl md:text-5xl font-serif text-charcoal font-light">
                  Car Rentals &amp; Private Fleet
                </h2>
                <p className="text-sm text-charcoal/50 mt-1 max-w-lg font-sans">
                  Premium luxury saloons and off-road SUVs for exquisite journeys.
                </p>
              </div>

              {renderSearchBar('drive')}

              {getFilteredCars().length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[2rem] border border-charcoal/5 shadow-2xl shadow-gold/5 font-sans mb-12">
                  <Search className="w-10 h-10 text-gold mx-auto mb-4 opacity-50 animate-pulse" />
                  <h1 className="text-2xl font-serif text-charcoal mb-2 font-light">No Matching Cars Found</h1>
                  <p className="text-sm text-charcoal/50 max-w-md mx-auto px-4">
                    We couldn&rsquo;t find any rental vehicles matching &ldquo;{searchQuery}&rdquo;. Try using other search keywords or explore other categories below.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-12">
                  {getFilteredCars().map((car, idx) => (
                    <motion.div
                      key={car.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-gold/5 flex flex-col lg:flex-row group hover:shadow-2xl transition-all duration-500"
                    >
                      <div className="lg:w-1/2 relative overflow-hidden aspect-video lg:aspect-auto h-[350px] lg:h-auto font-sans">
                        <HotelImageSlider images={car.images} name={car.name} />
                      </div>
                      <div className="lg:w-1/2 p-10 md:p-16 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-6 font-sans">
                          <div>
                            <h3 className="text-3xl md:text-4xl font-serif text-charcoal mb-2">{car.name}</h3>
                            <div className="flex items-center text-charcoal/40 text-sm">
                              <MapPin className="w-4 h-4 mr-2 text-gold" />
                              {car.location}
                            </div>
                          </div>
                          <div className="text-right font-sans">
                            {car.price && (
                              <>
                                <span className="text-[10px] uppercase tracking-widest text-gold font-bold block mb-1">Per Day</span>
                                <span className="text-2xl font-serif text-charcoal">₦{car.price}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-charcoal/60 font-normal leading-relaxed mb-10 max-w-md font-sans">
                          {car.description}
                        </p>
                        <div className="flex flex-wrap gap-4 font-sans">
                          <button 
                            onClick={() => {
                              setBookingType('booking');
                              setShowBookingOptions(car);
                            }}
                            className="bg-charcoal text-cream px-10 py-4 rounded-full text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-gold transition-colors shadow-lg shadow-charcoal/10 inline-block cursor-pointer font-sans"
                          >
                            Rent Now
                          </button>
                          <button 
                            onClick={() => {
                              setBookingType('reservation');
                              setShowBookingOptions(car);
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

              {renderOtherCategoryMatches('drive')}
            </motion.section>
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
                className="relative bg-white rounded-3xl p-6 md:p-10 max-w-lg w-full shadow-2xl z-10 overflow-hidden"
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
                        <p className="text-charcoal/60 text-sm mb-6">Provide your phone number to complete your {bookingType === 'reservation' ? 'availability' : 'booking'} enquiry via email.</p>

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

                          <div className="space-y-3 pt-4">
                            <button
                              type="submit"
                              className="flex items-center justify-center space-x-3 w-full bg-charcoal text-cream py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-gold hover:text-cream hover:shadow-lg hover:shadow-gold/20 transition-all duration-300 cursor-pointer"
                            >
                              <Mail className="w-5 h-5" />
                              <span>{bookingType === 'reservation' ? 'Send Availability Request via Email' : 'Send Booking via Email'}</span>
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
                          {emailSubmitStatus === 'saving' ? (bookingType === 'reservation' ? 'Saving Enquiry...' : 'Saving Booking...') : 'Sending Email...'}
                        </h3>
                        <p className="text-charcoal/60 text-sm max-w-xs leading-relaxed">
                          {emailSubmitStatus === 'saving' 
                            ? `Adding your ${bookingType === 'reservation' ? 'availability' : 'booking'} request details securely into the elite cloud database...`
                            : 'Delivering notification instantly to the Elite Bookings Team...'}
                        </p>
                      </div>
                    )}

                    {emailSubmitStatus === 'success' && (
                      <div className="flex flex-col items-center justify-center py-6 text-center font-sans">
                        <div className="w-16 h-16 bg-gold/10 text-gold rounded-full flex items-center justify-center mb-4">
                          <Check className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-serif text-charcoal mb-2 font-medium">Enquiry Automated!</h3>
                        <p className="text-charcoal/60 text-sm mb-6 max-w-xs leading-relaxed">
                          Your {bookingType === 'reservation' ? 'availability check request' : 'booking'} for <strong className="text-charcoal">{showBookingOptions.name}</strong> was recorded in the database and delivered to the desk at <span className="text-gold font-medium">Elitebooking.ng@gmail.com</span>.
                        </p>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setShowEmailPopup(false);
                            setShowBookingOptions(null);
                          }}
                          className="w-full bg-charcoal text-cream py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-gold hover:text-cream transition-all duration-300 cursor-pointer"
                        >
                          Completed Successfully
                        </button>
                      </div>
                    )}


                  </div>
                ) : bookingStep === 1 ? (
                  <div className="flex flex-col h-full">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-serif text-charcoal mb-1">Select Dates &amp; Times</h3>
                      <p className="text-charcoal/50 text-xs text-balance">Choose your desired check-in and check-out dates and times to check availability for {showBookingOptions.name}</p>
                    </div>

                    {/* Tabs for Check-in / Check-out */}
                    <div className="flex bg-charcoal/5 p-1 rounded-xl mb-6">
                      <button
                        type="button"
                        onClick={() => setActiveDateTab('checkin')}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer
                          ${activeDateTab === 'checkin'
                            ? 'bg-white text-charcoal shadow-sm'
                            : 'text-charcoal/60 hover:text-charcoal'
                          }
                        `}
                      >
                        Check-in
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDateTab('checkout')}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer
                          ${activeDateTab === 'checkout'
                            ? 'bg-white text-charcoal shadow-sm'
                            : 'text-charcoal/60 hover:text-charcoal'
                          }
                        `}
                      >
                        Check-out
                      </button>
                    </div>

                    <div className="mb-6">
                      {renderCalendar(activeDateTab)}
                    </div>

                    {/* Time Selector */}
                    <div className="mb-6 border-t border-charcoal/5 pt-5">
                      <label className="block text-center mb-3">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold flex items-center justify-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {activeDateTab === 'checkin' ? 'Check-in Time' : 'Check-out Time'}
                        </span>
                      </label>
                      <div className="flex justify-center items-center gap-2">
                        {/* Hour */}
                        <div className="relative">
                          <select
                            value={activeDateTab === 'checkin' ? checkinHour : checkoutHour}
                            onChange={(e) => activeDateTab === 'checkin' ? setCheckinHour(e.target.value) : setCheckoutHour(e.target.value)}
                            className="appearance-none bg-charcoal/5 hover:bg-charcoal/10 transition-colors border border-charcoal/10 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-gold text-charcoal pr-8 cursor-pointer"
                          >
                            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal/40 text-[10px]">▼</div>
                        </div>

                        <span className="text-charcoal/40 font-bold">:</span>

                        {/* Minute */}
                        <div className="relative">
                          <select
                            value={activeDateTab === 'checkin' ? checkinMinute : checkoutMinute}
                            onChange={(e) => activeDateTab === 'checkin' ? setCheckinMinute(e.target.value) : setCheckoutMinute(e.target.value)}
                            className="appearance-none bg-charcoal/5 hover:bg-charcoal/10 transition-colors border border-charcoal/10 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-gold text-charcoal pr-8 cursor-pointer"
                          >
                            {['00', '15', '30', '45'].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal/40 text-[10px]">▼</div>
                        </div>

                        {/* Period AM/PM */}
                        <div className="relative">
                          <select
                            value={activeDateTab === 'checkin' ? checkinPeriod : checkoutPeriod}
                            onChange={(e) => activeDateTab === 'checkin' ? setCheckinPeriod(e.target.value) : setCheckoutPeriod(e.target.value)}
                            className="appearance-none bg-charcoal/5 hover:bg-charcoal/10 transition-colors border border-charcoal/10 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-gold text-charcoal pr-8 cursor-pointer"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal/40 text-[10px]">▼</div>
                        </div>
                      </div>
                    </div>

                    {/* Selected Summary & Next Button */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 bg-gold/5 border border-gold/15 rounded-xl p-3.5 text-center">
                        <div>
                          <p className="text-[10px] text-gold uppercase tracking-wider font-bold mb-0.5">Check-in</p>
                          <p className="text-[11px] font-semibold text-charcoal">
                            {checkinDate ? checkinDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Select'} at {checkinHour}:{checkinMinute} {checkinPeriod}
                          </p>
                        </div>
                        <div className="border-l border-gold/15">
                          <p className="text-[10px] text-gold uppercase tracking-wider font-bold mb-0.5">Check-out</p>
                          <p className={`text-[11px] font-semibold ${checkoutDate ? 'text-charcoal' : 'text-red-500 font-bold animate-pulse'}`}>
                            {checkoutDate 
                              ? `${checkoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${checkoutHour}:${checkoutMinute} ${checkoutPeriod}` 
                              : 'Selection Required'
                            }
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
                          <span className="text-[11px] text-charcoal/60 mt-0.5 block">{checkinHour}:{checkinMinute} {checkinPeriod}</span>
                        </div>
                        <div className="border-l border-charcoal/10 pl-4">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-charcoal/40 block mb-0.5">Check-out</span>
                          <span className="text-xs font-bold text-charcoal block">
                            {checkoutDate ? checkoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </span>
                          <span className="text-[11px] text-charcoal/60 mt-0.5 block">{checkoutHour}:{checkoutMinute} {checkoutPeriod}</span>
                        </div>
                      </div>
                      {showBookingOptions.price && (
                        <div className="border-t border-charcoal/10 pt-4 flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-charcoal/40 block">Rate starting from</span>
                          <span className="text-base font-serif font-semibold text-gold">₦{showBookingOptions.price}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <a 
                        href={`https://wa.me/2347072253857?text=${encodeURIComponent(
                          `Hello, I would like to ${bookingType === 'reservation' ? 'check availability for' : 'book'} ${showBookingOptions.name}.\n\n` +
                          `📅 Check-in: ${checkinDate ? checkinDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'} at ${checkinHour}:${checkinMinute} ${checkinPeriod}\n` +
                          `🔑 Check-out: ${checkoutDate ? checkoutDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'} at ${checkoutHour}:${checkoutMinute} ${checkoutPeriod}\n` +
                          `📍 Location: ${showBookingOptions.location}` +
                          `${showBookingOptions.price ? `\n💳 Base Price: ₦${showBookingOptions.price}` : ''}` +
                          `${showBookingOptions.note ? `\n✨ Note: ${showBookingOptions.note}` : ''}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-3 w-full bg-[#25D366] text-white py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold hover:opacity-90 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.35-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <span>Connect on WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setUserPhoneNumber('');
                          setShowEmailPopup(true);
                        }}
                        className="flex items-center justify-center space-x-3 w-full bg-charcoal text-cream py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-gold hover:text-cream hover:shadow-lg hover:shadow-gold/20 transition-all duration-300 cursor-pointer"
                      >
                        <Mail className="w-5 h-5" />
                        <span>Connect via Email</span>
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

      {/* Floating WhatsApp Assistance Button */}
      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-55 flex flex-col items-end pointer-events-none">
        <motion.a
          id="whatsapp-assistance-button"
          href="https://wa.me/2347072253857?text=Hello%2C%20I%20need%20some%20assistance%20with%20a%20booking."
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="pointer-events-auto flex items-center gap-2.5 bg-[#25D366] text-white pl-4 pr-4 py-3 md:pl-5 md:pr-5 md:py-3.5 rounded-full shadow-[0_8px_32px_rgba(37,211,102,0.3)] hover:shadow-[0_12px_40px_rgba(37,211,102,0.45)] border border-emerald-400/20 transition-all duration-300 group cursor-pointer hover:scale-105 active:scale-95"
        >
          {/* Subtle pulse effect */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-20 group-hover:scale-110 transition-transform duration-500 animate-ping -z-10" />
          
          <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider whitespace-nowrap drop-shadow-sm font-sans">
            need any assistance
          </span>
          <div className="bg-white/15 p-1 rounded-full">
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
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
            className="fixed bottom-24 right-6 md:bottom-28 md:right-8 z-50 bg-charcoal text-gold hover:bg-gold hover:text-charcoal p-4 rounded-full shadow-[0_8px_32px_rgba(212,175,55,0.25)] border border-gold/30 transition-all duration-300 group cursor-pointer"
            aria-label="Back to Top"
          >
            <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-all duration-300" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
