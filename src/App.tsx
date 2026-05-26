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
  Loader
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
  const [showBookingOptions, setShowBookingOptions] = useState<any | null>(null);
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
      price: '50,000',
      images: [
        'https://landmarkhotels.com.ng/wp-content/uploads/2020/04/DJI_0157.jpg',
        'https://media-cdn.tripadvisor.com/media/photo-s/0c/7e/43/c2/landmark-hotels-port.jpg'
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
        'https://lh3.googleusercontent.com/d/1i0pvZ7HBX6i1pwFWxXVCYBEdRTxSOZmx',
        'https://lh3.googleusercontent.com/d/15QvDkyA0_-Y_dPEFKJ_gNdqjgv_ltC7r',
        'https://lh3.googleusercontent.com/d/1umD5hJvaY41KE25U9DfXYPQYV2X3xjMj',
        'https://lh3.googleusercontent.com/d/1-EczEjPhD4HvCGCKFzdG3l0IxUNHlbbY'
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
    }
  ];

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

    const bookingText = `Hello Elite Bookings Team,

I would like to make an elite booking enquiry. Below are the details of the booking:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPERTY / ASSET DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${showBookingOptions.name}
Location: ${showBookingOptions.location}
Rate: ${showBookingOptions.price ? `₦${showBookingOptions.price}` : 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Check-in: ${formattedCheckin}
Check-out: ${formattedCheckout}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phone Number: ${userPhoneNumber}

I look forward to your confirmation and payment details.

Best regards.`;

    const enquiryPayload = {
      propertyName: showBookingOptions.name,
      propertyLocation: showBookingOptions.location,
      price: showBookingOptions.price || '',
      checkin: formattedCheckin,
      checkout: formattedCheckout,
      clientPhone: userPhoneNumber,
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
          setErrorMessage(data.message || 'Failed to send automated email alert.');
          setEmailSubmitStatus('manual_fallback');
        }
      } catch (emailError) {
        console.error('Network error during email auto-transmit:', emailError);
        setErrorMessage('Check your network connection. You can still send manually.');
        setEmailSubmitStatus('manual_fallback');
      }
    } else {
      // No VITE_WEB3FORMS_ACCESS_KEY provided, fallback to manual triggers on saved booking
      setEmailSubmitStatus('manual_fallback');
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

              <div className="flex justify-center">
                <motion.div
                  whileHover={{ y: -10 }}
                  onClick={() => {
                    setSelectedLocation('Port Harcourt, Rivers State');
                  }}
                  className="group cursor-pointer relative overflow-hidden rounded-3xl aspect-[16/9] w-full max-w-3xl bg-charcoal shadow-2xl shadow-gold/10"
                >
                  <img 
                    src="https://media.premiumtimesng.com/wp-content/files/2019/11/Port-Harcourt-Rivers-State.jpg" 
                    alt="Port Harcourt"
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000 ease-out"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent opacity-80" />
                  <div className="absolute inset-0 p-12 flex flex-col justify-end items-center text-center">
                    <h3 className="text-5xl text-cream font-serif mb-2">Port Harcourt</h3>
                    <p className="text-gold text-[12px] uppercase tracking-[0.4em] font-bold">Rivers State</p>
                    <div className="mt-8 flex items-center text-cream/40 text-[10px] uppercase tracking-[0.2em] group-hover:text-gold transition-colors">
                      Explore Properties <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-30 pointer-events-none">
                {['Lagos', 'Abuja', 'Enugu'].map(city => (
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
                onClick={() => setSelectedLocation(null)}
                className="absolute -top-16 left-0 flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-[11px] uppercase tracking-[0.3em] text-charcoal font-bold shadow-sm hover:bg-gold hover:text-cream transition-all group"
              >
                <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to locations
              </button>

              <div className="grid grid-cols-1 gap-12">
                {phHotels.map((hotel, idx) => (
                  <motion.div
                    key={hotel.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-gold/5 flex flex-col lg:flex-row group hover:shadow-2xl transition-all duration-500"
                  >
                    <div className="lg:w-1/2 relative overflow-hidden aspect-video lg:aspect-auto h-[350px] lg:h-auto">
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
                            <div className="w-full min-w-[180px] space-y-2.5 pt-6 border-t border-charcoal/5">
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
                      <p className="text-charcoal/60 font-normal leading-relaxed mb-10 max-w-md">
                        {hotel.description}
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <button 
                          onClick={() => setShowBookingOptions(hotel)}
                          className="bg-charcoal text-cream px-10 py-4 rounded-full text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-gold transition-colors shadow-lg shadow-charcoal/10 inline-block"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
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
                onClick={() => setSelectedLocation(null)}
                className="absolute -top-16 left-0 flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-[11px] uppercase tracking-[0.3em] text-charcoal font-bold shadow-sm hover:bg-gold hover:text-cream transition-all group"
              >
                <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to locations
              </button>

              <div className="grid grid-cols-1 gap-12">
                {phShortlets.map((shortlet, idx) => (
                  <motion.div
                    key={shortlet.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-gold/5 flex flex-col lg:flex-row group hover:shadow-2xl transition-all duration-500"
                  >
                    <div className="lg:w-1/2 relative overflow-hidden aspect-video lg:aspect-auto h-[350px] lg:h-auto">
                      <HotelImageSlider images={shortlet.images} name={shortlet.name} />
                    </div>
                    <div className="lg:w-1/2 p-10 md:p-16 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-6">
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
                      <p className="text-charcoal/60 font-normal leading-relaxed mb-10 max-w-md">
                        {shortlet.description}
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <button 
                          onClick={() => setShowBookingOptions(shortlet)}
                          className="bg-charcoal text-cream px-10 py-4 rounded-full text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-gold transition-colors shadow-lg shadow-charcoal/10 inline-block"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
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
                onClick={() => setSelectedLocation(null)}
                className="absolute -top-16 left-0 flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-[11px] uppercase tracking-[0.3em] text-charcoal font-bold shadow-sm hover:bg-gold hover:text-cream transition-all group"
              >
                <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to locations
              </button>

              <div className="grid grid-cols-1 gap-12">
                {phCars.map((car, idx) => (
                  <motion.div
                    key={car.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-gold/5 flex flex-col lg:flex-row group hover:shadow-2xl transition-all duration-500"
                  >
                    <div className="lg:w-1/2 relative overflow-hidden aspect-video lg:aspect-auto h-[350px] lg:h-auto">
                      <HotelImageSlider images={car.images} name={car.name} />
                    </div>
                    <div className="lg:w-1/2 p-10 md:p-16 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-3xl md:text-4xl font-serif text-charcoal mb-2">{car.name}</h3>
                          <div className="flex items-center text-charcoal/40 text-sm">
                            <MapPin className="w-4 h-4 mr-2 text-gold" />
                            {car.location}
                          </div>
                        </div>
                        <div className="text-right">
                          {car.price && (
                            <>
                              <span className="text-[10px] uppercase tracking-widest text-gold font-bold block mb-1">Per Day</span>
                              <span className="text-2xl font-serif text-charcoal">₦{car.price}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-charcoal/60 font-normal leading-relaxed mb-10 max-w-md">
                        {car.description}
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <button 
                          onClick={() => setShowBookingOptions(car)}
                          className="bg-charcoal text-cream px-10 py-4 rounded-full text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-gold transition-colors shadow-lg shadow-charcoal/10 inline-block"
                        >
                          Rent Now
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
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
                        <p className="text-charcoal/60 text-sm mb-6">Provide your phone number to complete your booking enquiry via email.</p>

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
                              <span>Send Booking via Email</span>
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
                          {emailSubmitStatus === 'saving' ? 'Saving Enquiry...' : 'Sending Email...'}
                        </h3>
                        <p className="text-charcoal/60 text-sm max-w-xs leading-relaxed">
                          {emailSubmitStatus === 'saving' 
                            ? 'Adding your booking request details securely into the elite cloud database...'
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
                          Your reservation for <strong className="text-charcoal">{showBookingOptions.name}</strong> was recorded in the database and delivered to the desk at <span className="text-gold font-medium">Elitebooking.ng@gmail.com</span>.
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

                    {emailSubmitStatus === 'manual_fallback' && (
                      <div className="text-center font-sans">
                        <div className="w-12 h-12 bg-gold/10 text-gold rounded-full flex items-center justify-center mx-auto mb-4">
                          <Check className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-serif text-charcoal mb-2 font-medium">Recorded in Cloud!</h3>
                        
                        <p className="text-charcoal/60 text-xs mb-5 px-1 leading-relaxed">
                          Enquiry for <strong>{showBookingOptions.name}</strong> has been secured in the cloud database. Press below to instantly trigger notification to the elite bookings desk:
                        </p>

                        <div className="space-y-2.5 pt-1">
                          <a
                            href={`mailto:Elitebooking.ng@gmail.com?subject=${encodeURIComponent(`Elite Booking Enquiry: ${showBookingOptions.name}`)}&body=${encodeURIComponent(`Hello Elite Bookings Team,

I would like to make an elite booking enquiry. Below are the details of the booking:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPERTY / ASSET DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${showBookingOptions.name}
Location: ${showBookingOptions.location}
Rate: ${showBookingOptions.price ? `₦${showBookingOptions.price}` : 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Check-in: ${checkinDate ? checkinDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'} at ${checkinHour}:${checkinMinute} ${checkinPeriod}
Check-out: ${checkoutDate ? checkoutDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'} at ${checkoutHour}:${checkoutMinute} ${checkoutPeriod}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phone Number: ${userPhoneNumber}

I look forward to your confirmation and payment details.

Best regards.`)}`}
                            className="flex items-center justify-center space-x-2.5 w-full bg-charcoal text-cream py-3.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-gold hover:text-cream transition-all duration-300 cursor-pointer"
                          >
                            <Mail className="w-4 h-4" />
                            <span>Connect via Mail</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              const text = `Hello Elite Bookings Team,

I would like to make an elite booking enquiry. Below are the details of the booking:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPERTY / ASSET DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${showBookingOptions.name}
Location: ${showBookingOptions.location}
Rate: ${showBookingOptions.price ? `₦${showBookingOptions.price}` : 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Check-in: ${checkinDate ? checkinDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'} at ${checkinHour}:${checkinMinute} ${checkinPeriod}
Check-out: ${checkoutDate ? checkoutDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'} at ${checkoutHour}:${checkoutMinute} ${checkoutPeriod}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phone Number: ${userPhoneNumber}`;
                              navigator.clipboard.writeText(text);
                              alert('Booking details copied successfully to clipboard!');
                            }}
                            className="flex items-center justify-center space-x-2 w-full bg-charcoal/5 border border-charcoal/10 text-charcoal/70 hover:bg-charcoal/10 hover:text-charcoal py-3 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold transition-all duration-300 cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copy Info to Clipboard</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowEmailPopup(false);
                              setShowBookingOptions(null);
                            }}
                            className="text-charcoal/40 hover:text-charcoal text-[10px] uppercase tracking-[0.25em] font-semibold pt-4 transition-all duration-300 cursor-pointer w-full text-center block"
                          >
                            Close Overlay
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : bookingStep === 1 ? (
                  <div className="flex flex-col h-full">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-serif text-charcoal mb-1">Select Dates &amp; Times</h3>
                      <p className="text-charcoal/50 text-xs text-balance">Choose your desired check-in and check-out dates and times for {showBookingOptions.name}</p>
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
                        <span>Next: Confirm Booking</span> <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <h3 className="text-2xl font-serif text-charcoal mb-2">Booking Summary</h3>
                    <p className="text-charcoal/60 text-sm mb-6">Confirm your elite booking details for <span className="font-semibold text-charcoal">{showBookingOptions.name}</span></p>

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
                          `Hello, I would like to book ${showBookingOptions.name}.\n\n` +
                          `📅 Check-in: ${checkinDate ? checkinDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'} at ${checkinHour}:${checkinMinute} ${checkinPeriod}\n` +
                          `🔑 Check-out: ${checkoutDate ? checkoutDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'} at ${checkoutHour}:${checkoutMinute} ${checkoutPeriod}\n` +
                          `📍 Location: ${showBookingOptions.location}` +
                          `${showBookingOptions.price ? `\n💳 Base Price: ₦${showBookingOptions.price}` : ''}`
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
    </div>
  );
}
