export interface CatalogItem {
  id: string;
  name: string;
  category: 'Hotel' | 'Shortlet' | 'Car Rental' | 'Experience';
  city: 'Abuja' | 'Lagos' | 'Port Harcourt' | string;
  location: string;
  price: string;
  badge?: string;
  image: string;
  highlights: string[];
  description: string;
  tiers?: { name: string; price: string }[];
}

export const CATALOG_ITEMS: CatalogItem[] = [
  // ABUJA HOTELS
  {
    id: 'tranquila-hotels-and-suites-abuja',
    name: 'Tranquila Hotels and Suites',
    category: 'Hotel',
    city: 'Abuja',
    location: 'Plot 1731 off Ahmadu Bello Wy, Mabushi, Abuja',
    price: '79,000',
    badge: 'Best Value',
    image: 'https://lh3.googleusercontent.com/d/1QJhB8sDrwy67XfkYOGyXNqmO6Fa8i_Ii',
    highlights: ['Deluxe & Royal Suites', '24/7 Power & Security', 'Gourmet Dining'],
    description: 'Tranquil luxury and serene ambiance on Ahmadu Bello Way in Mabushi.',
    tiers: [
      { name: 'Deluxe Room', price: '79,000' },
      { name: 'Executive Room', price: '88,000' },
      { name: 'Super Executive Room', price: '99,000' },
      { name: 'Diamond Suite', price: '105,000' },
      { name: 'Royal Suite', price: '116,000' },
      { name: 'Royal Suite Plus', price: '135,000' }
    ]
  },
  {
    id: 'yellow-trumpet-hotel-abuja',
    name: 'Yellow Trumpet Hotel',
    category: 'Hotel',
    city: 'Abuja',
    location: '51 Euphrates Cres, Wuse, Abuja',
    price: '109,000',
    badge: 'Boutique Choice',
    image: 'https://lh3.googleusercontent.com/d/1FWEd22GIHLV0KbZ7JAlH5Vp2pm4GduPZ',
    highlights: ['Boutique Elegance', 'Euphrates Crescent Location', 'Fine Dining'],
    description: 'Boutique elegance and contemporary luxury in the heart of Wuse.',
    tiers: [
      { name: 'Deluxe Room', price: '109,000' },
      { name: 'Superior Room', price: '123,000' },
      { name: 'Executive Room', price: '144,000' },
      { name: 'Suite', price: '223,000' }
    ]
  },
  {
    id: 'power-mike-hotel-abuja',
    name: 'Power Mike Hotel',
    category: 'Hotel',
    city: 'Abuja',
    location: 'Area 1, 9 Argungu Close, off Benue Cres, Garki, Abuja',
    price: '28,000',
    badge: 'Budget Friendly',
    image: 'https://lh3.googleusercontent.com/d/1IkVa_ndAm9MwwiZ3mEHHd1nk-cLuMgie',
    highlights: ['Affordable Stay', 'Garki Area 1 Location', 'Cozy Atmosphere'],
    description: 'Cozy hospitality and convenient, accessible comfort in Garki Area 1.',
    tiers: [
      { name: 'Standard Room', price: '28,000' },
      { name: 'Executive Room', price: '31,000' }
    ]
  },
  {
    id: 'knightsbridge-hotel-suites-abuja',
    name: 'Knightsbridge Hotel & Suites',
    category: 'Hotel',
    city: 'Abuja',
    location: '32A Katsina-Ala St, Maitama, Abuja',
    price: '127,000',
    badge: 'Top Luxury',
    image: 'https://lh3.googleusercontent.com/d/1ppw9s1z5HPboWPksJCsmznbsbZH0XSU2',
    highlights: ['Maitama Prestige Address', 'Ambassador Suites', '1 Bed Apartments'],
    description: 'British-inspired luxury and refined elegance in Maitama.',
    tiers: [
      { name: 'Standard Room', price: '127,000' },
      { name: 'Deluxe Room', price: '147,000' },
      { name: 'Junior Suite', price: '167,000' },
      { name: 'Ambassador Suite', price: '187,000' },
      { name: 'Studio Apartment', price: '239,000' },
      { name: '1 Bedroom Apartment', price: '289,000' }
    ]
  },
  {
    id: 'hawthorn-suite-by-wyndham-abuja',
    name: 'Hawthorn Suite by Wyndham',
    category: 'Hotel',
    city: 'Abuja',
    location: '1 Uke St, Garki 2, Abuja',
    price: '142,000',
    badge: 'International Brand',
    image: 'https://lh3.googleusercontent.com/d/1C3LMdBx3WLYZ2M0N8LtD_NROlIQRqWWL',
    highlights: ['Studio Efficiencies', 'Presidential Suite (116 SQM)', 'Pool & Gym'],
    description: 'World-class hospitality and spacious executive suites in Garki 2.',
    tiers: [
      { name: 'Queen Bed Efficiency (Studio) 37 SQM', price: '142,000' },
      { name: 'Queen Bed Suite (1 Bedroom Deluxe) 43 SQM', price: '162,000' },
      { name: 'King Bed Suite (1 Bedroom Premium) 55 SQM', price: '176,000' },
      { name: 'King Bed VIP Suite (1 Bedroom Executive) 59 SQM', price: '204,000' },
      { name: 'Queen Bed Suite (2 Bedroom Premium) 50 SQM', price: '235,000' },
      { name: 'King Bed Suite (2 Bedroom Executive) 69 SQM', price: '260,000' },
      { name: 'Presidential Suite (116 SQM)', price: '385,000' }
    ]
  },
  {
    id: 'berbera-palace-royale-abuja',
    name: 'Berbera Palace Royale',
    category: 'Hotel',
    city: 'Abuja',
    location: 'Zone 6, 2 Berbera St, Wuse, Abuja',
    price: '38,000',
    badge: 'Great Value',
    image: 'https://lh3.googleusercontent.com/d/1VGNBPX9IwiGkHa25VABih8oba8K1I9IV',
    highlights: ['Wuse Zone 6 Location', 'Executive Rooms', '24/7 Security'],
    description: 'Royal comfort and peaceful relaxation in central Wuse Zone 6.',
    tiers: [
      { name: 'Standard Room', price: '38,000' },
      { name: 'Deluxe Room', price: '43,000' },
      { name: 'Executive Room', price: '48,000' }
    ]
  },
  {
    id: 'jasmines-place-suites',
    name: "Jasmine's Place & Suites",
    category: 'Hotel',
    city: 'Abuja',
    location: '82 Ralph Shodeinde St, Central Business District, Abuja',
    price: '43,000',
    badge: 'CBD Location',
    image: 'https://lh3.googleusercontent.com/d/1B4I8XeHzy6FLmTfP902WOQUPf0rsmLAl',
    highlights: ['IMO Liaison Complex', 'Diplomatic Enclave', 'Boutique Class'],
    description: 'Sanctuary of peace and modern elegance in Abuja CBD.',
    tiers: [
      { name: 'Standard Room (Basic)', price: '43,000' },
      { name: 'Deluxe Room (Standard)', price: '59,000' },
      { name: 'Deluxe Suites (Premium)', price: '207,000' }
    ]
  },
  {
    id: 'the-destination-by-gidanka',
    name: 'The Destination by Gidanka',
    category: 'Hotel',
    city: 'Abuja',
    location: '20 N Djamena Crescent, Wuse, Abuja',
    price: '96,000',
    badge: 'Ultra Modern',
    image: 'https://lh3.googleusercontent.com/d/1K91S1lDqppleAsYRcaP-oVYNJsrueKqw',
    highlights: ['Bespoke Kitchens', 'Architectural Masterpiece', 'Family Suites'],
    description: 'Pinnacle of luxury hospitality and high-end suites in Wuse.',
    tiers: [
      { name: 'Basic (2 Persons)', price: '96,000' },
      { name: 'Bronze Suite', price: '226,000' },
      { name: 'Deluxe 8 Adults Family Suite', price: '910,000' }
    ]
  },

  // LAGOS HOTELS
  {
    id: 'nordic-hotel-lagos',
    name: 'Nordic Hotel Lagos',
    category: 'Hotel',
    city: 'Lagos',
    location: '258 Kofo Abayomi St, Victoria Island, Lagos',
    price: '274,000',
    badge: 'Luxury Boutique',
    image: 'https://lh3.googleusercontent.com/d/1j4F-_Fi7yS5Gmq-AC2oZKaZFaQjxf_o3',
    highlights: ['Danish Architecture', 'VI Premium Location', 'Tranquil Gardens'],
    description: 'Ultimate luxury and Scandinavian minimalist design in Victoria Island.',
    tiers: [
      { name: 'Economy Room', price: '274,000' },
      { name: 'Standard Room', price: '349,000' },
      { name: 'Executive Room', price: '529,000' },
      { name: 'H.C. Andersen Suite', price: '1,215,000' }
    ]
  },
  {
    id: 'the-colossus-hotel-lagos',
    name: 'The Colossus Hotel',
    category: 'Hotel',
    city: 'Lagos',
    location: '4 Sheraton Link Rd, Maryland, Lagos',
    price: '129,750',
    badge: 'Boutique Luxury',
    image: 'https://lh3.googleusercontent.com/d/1n41kH1DZpYH9fN1GIHkLFIlR0GZihDLH',
    highlights: ['Presidential Suites', 'Maryland Business Hub', 'Fine Dining'],
    description: 'Majestic grandeur and boutique suite luxury in Maryland.',
    tiers: [
      { name: 'Standard Room', price: '129,750' },
      { name: 'Executive Room', price: '144,000' },
      { name: 'Presidential Suite', price: '359,750' }
    ]
  },
  {
    id: 'great-ville-lagos',
    name: 'Great Ville Lagos',
    category: 'Hotel',
    city: 'Lagos',
    location: '36/38 Nathan Street, Surulere, Lagos',
    price: '46,000',
    badge: 'Cozy & Central',
    image: 'https://lh3.googleusercontent.com/d/12TjfSMKWl9cLVFKJ2dPYeSmeAzWkLnO1',
    highlights: ['Surulere Central Location', 'Executive Rooms', 'Top Comfort'],
    description: 'Convenience and high value lodging off Ojuelegba Road.',
    tiers: [
      { name: 'Standard', price: '46,000' },
      { name: 'Deluxe', price: '64,000' },
      { name: 'Twin Executive', price: '74,000' }
    ]
  },

  // PORT HARCOURT HOTELS & SHORTLETS
  {
    id: 'golden-tulip-port-harcourt',
    name: 'Golden Tulip Port Harcourt',
    category: 'Hotel',
    city: 'Port Harcourt',
    location: '1C Evo Road, GRA Phase 2, Port Harcourt',
    price: '115,000',
    badge: '4-Star Luxury',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
    highlights: ['GRA Phase 2 Location', 'Outdoor Pool', 'Corporate Boardrooms'],
    description: 'International 4-star comfort in GRA Phase 2 with prime accessibility.',
    tiers: [
      { name: 'Superior Room', price: '115,000' },
      { name: 'Executive Suite', price: '185,000' }
    ]
  },
  {
    id: 'ph-executive-garden-villa',
    name: 'Executive 3-Bed Garden Villa PH',
    category: 'Shortlet',
    city: 'Port Harcourt',
    location: 'GRA Phase 2 Extension, Port Harcourt',
    price: '150,000',
    badge: 'Private Shortlet',
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=80&w=800',
    highlights: ['Private Courtyard', 'Smart Automation', '24/7 Security & Power'],
    description: 'Spacious 3-bedroom luxury shortlet villa with private pool access and dedicated chef service in GRA Phase 2.'
  },

  // SHORTLETS / HOMES
  {
    id: 'the-monarch-penthouse-lekki',
    name: 'The Monarch 4-Bed Penthouse',
    category: 'Shortlet',
    city: 'Lagos',
    location: 'Lekki Phase 1, Lagos',
    price: '250,000',
    badge: 'Luxury Shortlet',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800',
    highlights: ['Private Ocean View', 'Smart Automation', 'In-house Chef'],
    description: 'Panoramic views and ultra-luxury 4-bedroom shortlet duplex in Lekki Phase 1.'
  },
  {
    id: 'asokoro-diplomatic-villa-abuja',
    name: 'Asokoro Diplomatic 3-Bed Villa',
    category: 'Shortlet',
    city: 'Abuja',
    location: 'Asokoro Extension, Abuja',
    price: '180,000',
    badge: 'Private Villa',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
    highlights: ['High Security', 'Private Pool', 'Fitted Kitchen'],
    description: 'Serene 3-bedroom luxury villa in Asokoro with maximum privacy.'
  },

  // CAR RENTALS
  {
    id: 'toyota-prado-txr-chauffeur',
    name: 'Toyota Land Cruiser Prado TXL',
    category: 'Car Rental',
    city: 'Abuja',
    location: 'Abuja & Lagos Airport Pickup Available',
    price: '120,000',
    badge: 'Chauffeur Driven',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
    highlights: ['VIP Chauffeur Included', 'Armed Escort Available', 'Leather Interior'],
    description: 'Premium executive SUV with trained armed chauffeur for escort or airport transfers.'
  },
  {
    id: 'mercedes-benz-g63-amg',
    name: 'Mercedes-Benz G63 AMG Wagon',
    category: 'Car Rental',
    city: 'Lagos',
    location: 'Lagos VIP Fleet',
    price: '350,000',
    badge: 'Ultra VIP Fleet',
    image: 'https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&q=80&w=800',
    highlights: ['V8 Biturbo Power', 'VIP Escort Package', 'Prestige Red Carpet'],
    description: 'Ultimate status vehicle for red carpet arrivals and VIP luxury transport.'
  }
];
