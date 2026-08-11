// Vehicle inventory for the Car Rentals section.
// A vehicle is stored once and lists every city it serves in `locations` —
// it must never be duplicated per-city (that creates duplicate records/images).

export type VehicleType = 'Sedan' | 'SUV' | 'Luxury' | 'Van' | 'Bus' | 'Pickup';
export type Transmission = 'Automatic' | 'Manual';
export type DriverOption = 'With Driver' | 'Self Drive';
export type PricingType = 'hour' | 'day' | 'trip' | 'airport-transfer' | 'custom-quote';
export type VehicleStatus = 'Available' | 'On Request' | 'Unavailable';

export interface Vehicle {
  id: string;
  name: string;
  category: string;
  type: VehicleType;
  transmission: Transmission;
  seats: number;
  airConditioning: boolean;
  driverOptions: DriverOption[];
  locations: string[];
  primaryImage: string;
  additionalImages: string[];
  description: string;
  pricingType: PricingType;
  startingPrice: number | null;
  startingPriceDiscountPercent?: number | null;
  // "Inter-State" is a trip characteristic, not a second base location — these
  // vehicles remain based in Port Harcourt but cost more for trips that cross
  // state lines. A vehicle with no interStatePrice simply has no inter-state
  // rate on file; it's still a legitimate manual-quote case for admin.
  interStatePrice?: number | null;
  interStatePriceDiscountPercent?: number | null;
  // Full duration-based rate card (e.g. 1hr/5hrs/6hrs/8hrs/12hrs/24hrs) for
  // vehicles priced by the hour rather than a single day/inter-state pair.
  // Purely additive display data for CarDetailView — startingPrice above
  // still drives the compact card, filters, and request-modal estimate.
  rateCard?: { label: string; price: number }[];
  // Flat airport pickup/drop-off rates (Abuja's Nnamdi Azikiwe Airport has
  // separate Domestic and International wings, so some vehicles quote both).
  airportTransfer?: { label: string; price: number }[];
  // The partner agency that actually owns/supplies this vehicle — admin-facing
  // only (shown in AdminDashboard car requests), never rendered to customers.
  agency?: string;
  status: VehicleStatus;
}

export const LOCATIONS = ['Lagos', 'Abuja', 'Port Harcourt'] as const;
export const VEHICLE_TYPES: VehicleType[] = ['Sedan', 'SUV', 'Luxury', 'Van', 'Bus', 'Pickup'];

// NOTE on the first 4 vehicles: migrated from the previous flat car listing
// (previously Port-Harcourt-only, with empty price fields). primaryImage points
// to original custom graphics (public/images/cars/*.svg) rather than the
// previous hotlinked dealer stock photos.
//
// The 9 vehicles from `lamborghini-urus` onward were added with real fleet
// pricing supplied by the business owner (Port Harcourt day-rate + a separate,
// higher Inter-State day-rate for trips that cross state lines). A few specs
// are reasonable assumptions rather than confirmed facts — flagged inline:
// - Hilux transmission: no real basis given, defaulted to Automatic to match
//   the rest of the fleet's positioning; confirm and correct if it's Manual.
// - Bulletproof Land Cruiser (5 seats) vs Soft-Skin Land Cruiser (7 seats):
//   armored conversions commonly lose a row to door/floor plating, but this
//   isn't confirmed per-unit.
// - Exotic/armored vehicles (Urus, Bulletproof LC) are set to "With Driver"
//   only, not self-drive — a judgment call, easy to change.
export const VEHICLES: Vehicle[] = [
  {
    id: 'gx-460',
    name: 'Lexus GX 460',
    category: 'Executive SUV',
    type: 'SUV',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Port Harcourt'],
    primaryImage: '/images/cars/gx-460.svg',
    additionalImages: [],
    description: 'Commanding presence and peerless luxury. Perfect for navigating the city in absolute comfort.',
    pricingType: 'day',
    startingPrice: null,
    status: 'On Request',
  },
  {
    id: 'range-rover-velar',
    name: 'Range Rover Velar',
    category: 'Luxury SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Port Harcourt'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/8/82/2018_Land_Rover_Range_Rover_Velar_R-Dynamic_S_D24_2.0.jpg',
    additionalImages: [],
    description: 'The ultimate blend of reliability and luxury. Ideal for both city drives and longer journeys.',
    pricingType: 'day',
    startingPrice: 615000,
    interStatePrice: 815000,
    status: 'On Request',
  },
  {
    id: 'luxury-bus',
    name: '43-Seater Luxury Bus',
    category: 'Group Transport',
    type: 'Bus',
    transmission: 'Automatic',
    seats: 43,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Port Harcourt'],
    primaryImage: '/images/cars/luxury-bus.svg',
    additionalImages: [],
    description: 'Premium group travel experience with maximum comfort, climate control, and spacious seating for large delegations.',
    pricingType: 'trip',
    startingPrice: null,
    status: 'On Request',
  },
  {
    id: 'delivery-trucks',
    name: 'Delivery Trucks',
    category: 'Logistics & Haulage',
    type: 'Van',
    transmission: 'Manual',
    seats: 2,
    airConditioning: false,
    driverOptions: ['With Driver'],
    locations: ['Port Harcourt'],
    primaryImage: '/images/cars/delivery-trucks.svg',
    additionalImages: [],
    description: 'Reliable logistics and haulage solutions for all your delivery needs. Professional service for safe and timely transport.',
    pricingType: 'custom-quote',
    startingPrice: null,
    status: 'On Request',
  },
  {
    id: 'lamborghini-urus',
    name: 'Lamborghini Urus',
    category: 'Exotic SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Port Harcourt'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Lamborghini_Urus_red_%281%29.jpg',
    additionalImages: [],
    description: 'An exotic super-SUV built to turn heads and command attention. Chauffeured for clients who expect nothing less than the extraordinary.',
    pricingType: 'day',
    startingPrice: 5100000,
    startingPriceDiscountPercent: 5,
    interStatePrice: 5100000,
    interStatePriceDiscountPercent: 5,
    status: 'On Request',
  },
  {
    id: 'mercedes-gle-450',
    name: 'Mercedes-Benz GLE 450',
    category: 'Luxury SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Port Harcourt'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Mercedes-Benz_GLE_%28W167%29.jpg',
    additionalImages: [],
    description: 'German engineering with effortless road presence. A refined choice for executive travel and special occasions.',
    pricingType: 'day',
    startingPrice: 615000,
    interStatePrice: 815000,
    status: 'On Request',
  },
  {
    id: 'land-cruiser-bulletproof',
    name: 'Toyota Land Cruiser (Bulletproof)',
    category: 'Armored SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Port Harcourt'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/2023_Toyota_Land_Cruiser_J300_3.4_GR_Sport_V6_Twin_Turbo_in_Attitude_Black_Mica%2C_front_left%2C_05-24-2024.jpg',
    additionalImages: [],
    description: 'Factory-grade armored protection wrapped in flagship Land Cruiser comfort. Built for clients who need discreet, professional security on the move.',
    pricingType: 'day',
    startingPrice: 1600000,
    startingPriceDiscountPercent: 6,
    interStatePrice: 1600000,
    interStatePriceDiscountPercent: 5,
    status: 'On Request',
  },
  {
    id: 'lexus-lx-570',
    name: 'Lexus LX 570',
    category: 'Luxury SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 7,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Port Harcourt'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/0/03/2021_Lexus_LX_570_%28URJ201R%29_wagon_%282023-12-03%29.jpg',
    additionalImages: [],
    description: "Lexus's flagship SUV — spacious, powerful, and finished to the highest standard. A commanding presence for airport runs and long-distance travel.",
    pricingType: 'day',
    startingPrice: 615000,
    interStatePrice: 815000,
    status: 'On Request',
  },
  {
    id: 'land-cruiser-soft-skin',
    name: 'White Toyota Land Cruiser (Soft Skin)',
    category: 'Executive SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 7,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Port Harcourt'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/2021_Toyota_Land_Cruiser_300_%28Russia%29_front_view.jpg',
    additionalImages: [],
    description: 'The full-size Land Cruiser experience without the armor — spacious, dependable, and ready for both city and highway trips.',
    pricingType: 'day',
    startingPrice: 515000,
    interStatePrice: 715000,
    status: 'On Request',
  },
  {
    id: 'hilux',
    name: 'Toyota Hilux',
    category: 'Pickup Truck',
    type: 'Pickup',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Port Harcourt'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/2020_Toyota_Hilux_Revo_4x4_Double-Cab_2.8_Rocco.jpg',
    additionalImages: [],
    description: 'A rugged, dependable pickup built for logistics, site visits, and journeys that demand durability over delicacy.',
    pricingType: 'day',
    startingPrice: 515000,
    interStatePrice: 715000,
    status: 'On Request',
  },
  {
    id: 'prado-white',
    name: 'White Toyota Prado',
    category: 'Executive SUV',
    type: 'SUV',
    transmission: 'Automatic',
    seats: 7,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Port Harcourt'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Toyota_Land_Cruiser_Prado_TJA250_2.4_Turbo_White_Pearl_Mica.jpg',
    additionalImages: [],
    description: 'A trusted 7-seater SUV that balances comfort and capability. Ideal for family trips, group travel, and everyday executive use.',
    pricingType: 'day',
    startingPrice: 210000,
    interStatePrice: 260000,
    status: 'On Request',
  },
  {
    id: 'prado-black',
    name: 'Black Toyota Prado',
    category: 'Executive SUV',
    type: 'SUV',
    transmission: 'Automatic',
    seats: 7,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Port Harcourt'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Toyota_Land_Cruiser_Prado_TJA250_2.4_Turbo_Black_Mica_-_front.jpg',
    additionalImages: [],
    description: 'A trusted 7-seater SUV that balances comfort and capability. Ideal for family trips, group travel, and everyday executive use.',
    pricingType: 'day',
    startingPrice: 160000,
    interStatePrice: 260000,
    status: 'On Request',
  },
  // --- Lagos / Abuja fleet ---
  // Real pricing supplied by the business owner: the lower number is the "within
  // state" rate, the higher number is the "outside state" (inter-state) rate —
  // same startingPrice/interStatePrice convention as Port Harcourt, just a second
  // set of cities. Kept as separate listings from the Port Harcourt entries above
  // (even where the model is the same, e.g. Prado/Hilux/LX570/GX460/Land Cruiser/
  // GLE 450) since Lagos/Abuja pricing is genuinely different — per the owner's
  // choice, simpler and safer than retrofitting per-city pricing onto one record.
  // A few assumptions worth confirming: Rolls-Royce Ghost's rate had a third
  // number (₦1.3M) beyond the usual pair — noted in its description rather than
  // forced into a field that doesn't exist yet. Bus/van seat counts and the
  // "Bulletproof Bus"/Honda/Coaster model identities are reasonable estimates,
  // not confirmed facts.
  {
    id: 'prado-lagos-abuja',
    name: 'Toyota Prado',
    category: 'Executive SUV',
    type: 'SUV',
    transmission: 'Automatic',
    seats: 7,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/2025_Toyota_Land_Cruiser_Prado_2.4_TXL_(Colombia)_front_view.png',
    additionalImages: [],
    description: 'A trusted 7-seater SUV that balances comfort and capability. Ideal for family trips, group travel, and everyday executive use.',
    pricingType: 'day',
    startingPrice: 150000,
    interStatePrice: 210000,
    status: 'On Request',
  },
  {
    id: 'hilux-lagos-abuja',
    name: 'Toyota Hilux',
    category: 'Pickup Truck',
    type: 'Pickup',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/2020_Toyota_Hilux_Revo_4x4_Double-Cab_2.8_Rocco.jpg',
    additionalImages: [],
    description: 'A rugged, dependable pickup built for logistics, site visits, and journeys that demand durability over delicacy.',
    pricingType: 'day',
    startingPrice: 150000,
    interStatePrice: 210000,
    status: 'On Request',
  },
  {
    id: 'lexus-lx570-lagos-abuja',
    name: 'Lexus LX 570',
    category: 'Luxury SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 7,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/0/03/2021_Lexus_LX_570_%28URJ201R%29_wagon_%282023-12-03%29.jpg',
    additionalImages: [],
    description: "Lexus's flagship SUV — spacious, powerful, and finished to the highest standard. A commanding presence for airport runs and long-distance travel.",
    pricingType: 'day',
    startingPrice: 310000,
    interStatePrice: 610000,
    status: 'On Request',
  },
  {
    id: 'lexus-gx460-lagos-abuja',
    name: 'Lexus GX 460',
    category: 'Executive SUV',
    type: 'SUV',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/2022_Lexus_GX_460.jpg',
    additionalImages: [],
    description: 'Commanding presence and peerless luxury. Perfect for navigating the city in absolute comfort.',
    pricingType: 'day',
    startingPrice: 125000,
    interStatePrice: 260000,
    status: 'On Request',
  },
  {
    id: 'lexus-rx350',
    name: 'Lexus RX 350',
    category: 'Luxury SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/2016_Lexus_RX350,_Front_Left,_04-05-2021.jpg',
    additionalImages: [],
    description: 'A refined crossover blending Lexus comfort with everyday practicality. A smart choice for business trips and city travel alike.',
    pricingType: 'day',
    startingPrice: 165000,
    interStatePrice: 210000,
    status: 'On Request',
  },
  {
    id: 'land-cruiser-lagos-abuja',
    name: 'Toyota Land Cruiser',
    category: 'Executive SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 7,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/2021_Toyota_Land_Cruiser_300_%28Russia%29_front_view.jpg',
    additionalImages: [],
    description: 'The full-size Land Cruiser experience — spacious, dependable, and ready for both city and highway trips.',
    pricingType: 'day',
    startingPrice: 210000,
    interStatePrice: 560000,
    status: 'On Request',
  },
  {
    id: 'land-cruiser-bulletproof-lagos-abuja',
    name: 'Toyota Land Cruiser (Bulletproof)',
    category: 'Armored SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/2023_Toyota_Land_Cruiser_J300_3.4_GR_Sport_V6_Twin_Turbo_in_Attitude_Black_Mica%2C_front_left%2C_05-24-2024.jpg',
    additionalImages: [],
    description: 'Factory-grade armored protection wrapped in flagship Land Cruiser comfort. Built for clients who need discreet, professional security on the move.',
    pricingType: 'day',
    startingPrice: 460000,
    interStatePrice: 715000,
    status: 'On Request',
  },
  {
    id: 'bulletproof-bus',
    name: 'Armored Bus',
    category: 'Armored Bus',
    type: 'Bus',
    transmission: 'Automatic',
    seats: 25,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/Toyota_Coaster_(53596942126).jpg',
    additionalImages: [],
    description: 'Armored group transport for VIP movements and high-profile events. Combines discreet protection with comfortable seating for larger parties.',
    pricingType: 'day',
    startingPrice: 510000,
    interStatePrice: 815000,
    status: 'On Request',
  },
  {
    id: 'mercedes-g-wagon',
    name: 'Mercedes-Benz G-Wagon',
    category: 'Exotic SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mercedes-Benz_G_Class_W463.jpg',
    additionalImages: [],
    description: 'An unmistakable icon of status and performance. Chauffeured for clients who want to arrive in complete confidence.',
    pricingType: 'day',
    startingPrice: 460000,
    interStatePrice: 915000,
    status: 'On Request',
  },
  {
    id: 'toyota-camry-lagos-abuja',
    name: 'Toyota Camry',
    category: 'Executive Sedan',
    type: 'Sedan',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/2021_Toyota_Camry_TRD_V6.jpg',
    additionalImages: [],
    description: 'A dependable, comfortable sedan for business meetings, airport runs, and everyday city travel.',
    pricingType: 'day',
    startingPrice: 85000,
    status: 'On Request',
  },
  {
    id: 'honda-accord',
    name: 'Honda Accord',
    category: 'Executive Sedan',
    type: 'Sedan',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/2020_Honda_Accord_1.5_TC-P_57.jpg',
    additionalImages: [],
    description: 'A smooth, reliable sedan offering great comfort for city trips and daily executive use.',
    pricingType: 'day',
    startingPrice: 125000,
    status: 'On Request',
  },
  {
    id: 'hiace-bus',
    name: 'Toyota Hiace Bus',
    category: 'Group Transport',
    type: 'Van',
    transmission: 'Automatic',
    seats: 14,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/2019_Toyota_HiAce_(front).jpg',
    additionalImages: [],
    description: 'A practical group shuttle for staff transport, airport runs, and event logistics.',
    pricingType: 'day',
    startingPrice: 155000,
    interStatePrice: 210000,
    status: 'On Request',
  },
  {
    id: 'coaster-bus',
    name: 'Toyota Coaster Bus',
    category: 'Group Transport',
    type: 'Bus',
    transmission: 'Automatic',
    seats: 30,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/Toyota_Coaster_Mini_Bus_2015.jpg',
    additionalImages: [],
    description: 'A mid-size coach for larger groups — conferences, church trips, and corporate outings.',
    pricingType: 'day',
    startingPrice: 155000,
    interStatePrice: 210000,
    status: 'On Request',
  },
  {
    id: 'bentley-flying-spur',
    name: 'Bentley Flying Spur',
    category: 'Exotic Sedan',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bentley_Flying_Spur_W12_Speed_(2019)_1X7A1636.jpg',
    additionalImages: [],
    description: 'British craftsmanship and effortless power in a true grand tourer. Reserved for clients who expect the extraordinary.',
    pricingType: 'day',
    startingPrice: 660000,
    interStatePrice: 815000,
    status: 'On Request',
  },
  {
    id: 'rolls-royce-ghost',
    name: 'Rolls-Royce Ghost',
    category: 'Exotic Sedan',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rolls-Royce_Ghost_II_IAA_2021_1X7A0005.jpg',
    additionalImages: [],
    description: 'The pinnacle of chauffeured luxury. For weddings, red-carpet arrivals, and moments that call for nothing but the best. A premium/extended-hire rate is also available from ₦1.3M — ask us for details.',
    pricingType: 'day',
    startingPrice: 715000,
    interStatePrice: 815000,
    status: 'On Request',
  },
  {
    id: 'mercedes-sprinter',
    name: 'Mercedes-Benz Sprinter',
    category: 'Group Transport',
    type: 'Van',
    transmission: 'Automatic',
    seats: 14,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/2019_Mercedes-Benz_Sprinter_314_CDi_2.1.jpg',
    additionalImages: [],
    description: 'A spacious, comfortable van for group and VIP transport, corporate shuttles, and airport transfers.',
    pricingType: 'day',
    startingPrice: 410000,
    interStatePrice: 560000,
    status: 'On Request',
  },
  {
    id: 'mercedes-gle450-lagos-abuja',
    name: 'Mercedes-Benz GLE 450',
    category: 'Luxury SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Mercedes-Benz_GLE_%28W167%29.jpg',
    additionalImages: [],
    description: 'German engineering with effortless road presence. A refined choice for executive travel and special occasions.',
    pricingType: 'day',
    startingPrice: 360000,
    interStatePrice: 610000,
    status: 'On Request',
  },
  {
    id: 'mercedes-gle350',
    name: 'Mercedes-Benz GLE 350',
    category: 'Luxury SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mercedes-Benz_GLE_350_d_4MATIC_AMG_Line_(V_167)_%E2%80%93_f_09022020.jpg',
    additionalImages: [],
    description: 'A refined, comfortable SUV that blends German engineering with everyday versatility.',
    pricingType: 'day',
    startingPrice: 360000,
    interStatePrice: 610000,
    status: 'On Request',
  },
  {
    id: 'toyota-highlander',
    name: 'Toyota Highlander',
    category: 'Executive SUV',
    type: 'SUV',
    transmission: 'Automatic',
    seats: 7,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/2020_Toyota_Highlander_XLE_AWD,_front.jpg',
    additionalImages: [],
    description: 'A spacious, family-friendly SUV built for comfort on longer journeys and everyday city driving.',
    pricingType: 'day',
    startingPrice: 105000,
    interStatePrice: 195000,
    status: 'On Request',
  },
  {
    id: 'toyota-venza',
    name: 'Toyota Venza',
    category: 'Executive SUV',
    type: 'SUV',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Lagos', 'Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/2021_Toyota_Venza_XLE,_front_right,_07-05-2024.jpg',
    additionalImages: [],
    description: 'A stylish, comfortable crossover suited to both business travel and everyday city use.',
    pricingType: 'day',
    startingPrice: 106000,
    interStatePrice: 156000,
    status: 'On Request',
  },
  // --- Abuja fleet (Cooperate Foot) ---
  // Supplied directly by the business owner: each vehicle carries a full
  // duration-based rate card (1hr/5hrs/6hrs/8hrs/12hrs/24hrs, varying by
  // vehicle) plus separate Domestic/International Wing airport transfer
  // rates — Abuja's Nnamdi Azikiwe Airport has two physically separate
  // terminal buildings, hence the two figures. `startingPrice` is always
  // the lowest tier on file (usually the 1-hour rate) so the existing card
  // grid/filter/request-modal estimate logic works unmodified; the full
  // breakdown lives in `rateCard`/`airportTransfer` and only renders on the
  // detail page. Vehicles with no 1-hour rate (G-Wagon, Rolls-Royce, Hilux,
  // the two buses, Sprinter) use `pricingType: 'trip'` instead of `'hour'`
  // so their flat package price never displays with a misleading "/hour"
  // suffix. `agency: 'Cooperate Foot'` is the supplying partner named by
  // the owner — kept for admin identification only, never shown to
  // customers (see AdminDashboard's car request views).
  // A few honest flags: the Rolls-Royce's exact model wasn't specified, so
  // it's listed generically (not as "Ghost", which already exists at a very
  // different price point elsewhere in the fleet) with a Cullinan photo used
  // as a representative image. Land Cruiser (2024) below is priced notably
  // higher than the other 2024 Land Cruiser despite fewer rate tiers — kept
  // as a separate "Premium" listing rather than guessing they're duplicates.
  // Three figures repeat identically across different tiers in the source
  // data (Land Cruiser Black 2024's 6hr/Domestic Wing/International Wing all
  // read ₦210,000; ML 350's Domestic and International Wing both read
  // ₦160,000) — entered as given, worth a quick double-check with the owner.
  {
    id: 'prado-2023-abuja',
    name: 'Toyota Prado (2023)',
    category: 'Executive SUV',
    type: 'SUV',
    transmission: 'Automatic',
    seats: 7,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Toyota_Land_Cruiser_Prado_VX-L_2023_%2853971462159%29.jpg',
    additionalImages: [],
    description: 'A dependable, comfortable 7-seater SUV finished for both business and leisure. Flexible hourly rates make it easy to book for exactly as long as you need.',
    pricingType: 'hour',
    startingPrice: 38000,
    rateCard: [
      { label: '1 Hour', price: 38000 },
      { label: '5 Hours', price: 125000 },
      { label: '6 Hours', price: 145000 },
      { label: '8 Hours', price: 165000 },
      { label: '12 Hours', price: 210000 },
      { label: '24 Hours', price: 360000 },
    ],
    airportTransfer: [
      { label: 'Domestic Wing', price: 110000 },
      { label: 'International Wing', price: 120000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'land-cruiser-2024-black-abuja',
    name: 'Toyota Land Cruiser (2024) — Black',
    category: 'Executive SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 7,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Moscow%2C_Toyota_Land_Cruiser_black%2C_Sept_2025_01.jpg',
    additionalImages: [],
    description: 'The latest-generation Land Cruiser in commanding black — spacious, powerful, and built for long-distance comfort. Priced by the hour, from quick city runs to full-day hire.',
    pricingType: 'hour',
    startingPrice: 45000,
    rateCard: [
      { label: '1 Hour', price: 45000 },
      { label: '5 Hours', price: 185000 },
      { label: '6 Hours', price: 210000 },
      { label: '8 Hours', price: 260000 },
      { label: '12 Hours', price: 310000 },
      { label: '24 Hours', price: 560000 },
    ],
    airportTransfer: [
      { label: 'Domestic Wing', price: 210000 },
      { label: 'International Wing', price: 210000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'mercedes-ml350-abuja',
    name: 'Mercedes-Benz ML 350 (2014)',
    category: 'Luxury SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Mercedes-Benz_ML_350_BlueTEC_4MATIC_%28W_166%29_%E2%80%93_Frontansicht%2C_8._September_2013%2C_B%C3%B6sensell.jpg',
    additionalImages: [],
    description: 'A proven, comfortable Mercedes-Benz SUV offering effortless road presence for city travel. Flexible hourly booking for meetings, errands, or full-day use.',
    pricingType: 'hour',
    startingPrice: 45000,
    rateCard: [
      { label: '1 Hour', price: 45000 },
      { label: '5 Hours', price: 150000 },
      { label: '6 Hours', price: 170000 },
      { label: '8 Hours', price: 210000 },
      { label: '12 Hours', price: 250000 },
      { label: '24 Hours', price: 460000 },
    ],
    airportTransfer: [
      { label: 'Domestic Wing', price: 160000 },
      { label: 'International Wing', price: 160000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'toyota-avalon-abuja',
    name: 'Toyota Avalon (2018)',
    category: 'Executive Sedan',
    type: 'Sedan',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Toyota_Avalon_XX50_Hybrid_03_China_2019-03-28.jpg',
    additionalImages: [],
    description: 'A refined, spacious sedan built for smooth executive travel and airport runs. Flexible hourly rates for meetings, events, or day-long hire.',
    pricingType: 'hour',
    startingPrice: 39000,
    rateCard: [
      { label: '1 Hour', price: 39000 },
      { label: '5 Hours', price: 130000 },
      { label: '6 Hours', price: 150000 },
      { label: '8 Hours', price: 170000 },
      { label: '12 Hours', price: 210000 },
      { label: '24 Hours', price: 360000 },
    ],
    airportTransfer: [
      { label: 'Domestic Wing', price: 110000 },
      { label: 'International Wing', price: 120000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'toyota-camry-2018-abuja',
    name: 'Toyota Camry (2018)',
    category: 'Executive Sedan',
    type: 'Sedan',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/TOYOTA_CAMRY_HYBRID_%28XV70%29_China_%282%29_%28cropped%29.jpg',
    additionalImages: [],
    description: 'A dependable, comfortable sedan for business meetings and everyday city travel. Priced by the hour for maximum flexibility.',
    pricingType: 'hour',
    startingPrice: 39000,
    rateCard: [
      { label: '1 Hour', price: 39000 },
      { label: '5 Hours', price: 130000 },
      { label: '6 Hours', price: 150000 },
      { label: '8 Hours', price: 170000 },
      { label: '12 Hours', price: 220000 },
      { label: '24 Hours', price: 370000 },
    ],
    airportTransfer: [
      { label: 'Domestic Wing', price: 110000 },
      { label: 'International Wing', price: 120000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'toyota-corolla-2017-abuja',
    name: 'Toyota Corolla (2017)',
    category: 'Compact Sedan',
    type: 'Sedan',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/2017_Toyota_Corolla_Altis_1.8_V_%28front%29%2C_Pandaan%2C_Pasuruan.jpg',
    additionalImages: [],
    description: 'A reliable, fuel-efficient sedan ideal for everyday city trips and errands. Flexible hourly booking for straightforward, affordable transport.',
    pricingType: 'hour',
    startingPrice: 24000,
    rateCard: [
      { label: '1 Hour', price: 24000 },
      { label: '5 Hours', price: 74000 },
      { label: '6 Hours', price: 84000 },
      { label: '8 Hours', price: 109000 },
      { label: '12 Hours', price: 119000 },
      { label: '24 Hours', price: 230000 },
    ],
    airportTransfer: [
      { label: 'Domestic Wing', price: 64000 },
      { label: 'International Wing', price: 70000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'toyota-corolla-2015-abuja',
    name: 'Toyota Corolla (2015)',
    category: 'Compact Sedan',
    type: 'Sedan',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/2018_Toyota_Corolla_Altis_%28E170%29_1.8_V_%28front%29%2C_East_Surabaya.jpg',
    additionalImages: [],
    description: 'A dependable, budget-friendly sedan for quick city trips and daily transport. Flexible hourly booking at one of our most affordable rates.',
    pricingType: 'hour',
    startingPrice: 19000,
    rateCard: [
      { label: '1 Hour', price: 19000 },
      { label: '5 Hours', price: 64000 },
      { label: '6 Hours', price: 74000 },
      { label: '8 Hours', price: 95000 },
      { label: '12 Hours', price: 109000 },
      { label: '24 Hours', price: 210000 },
    ],
    airportTransfer: [
      { label: 'Domestic Wing', price: 54000 },
      { label: 'International Wing', price: 64000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'toyota-corolla-2013-abuja',
    name: 'Toyota Corolla (2013)',
    category: 'Compact Sedan',
    type: 'Sedan',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/2013_FAW-Toyota_Corolla_EX_%28front%29.jpg',
    additionalImages: [],
    description: 'An economical, easy-to-book sedan for short trips and everyday errands around the city. Our most affordable hourly rate.',
    pricingType: 'hour',
    startingPrice: 16500,
    rateCard: [
      { label: '1 Hour', price: 16500 },
      { label: '5 Hours', price: 54000 },
      { label: '6 Hours', price: 64000 },
      { label: '8 Hours', price: 85000 },
      { label: '12 Hours', price: 95000 },
      { label: '24 Hours', price: 190000 },
    ],
    airportTransfer: [
      { label: 'Domestic Wing', price: 44000 },
      { label: 'International Wing', price: 54000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'mercedes-gle-2017-abuja',
    name: 'Mercedes-Benz GLE (2017)',
    category: 'Luxury SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/2016_Mercedes-Benz_GLE_250_Diesel_4MATIC_AMG_Line_Premium_2.1_Front.jpg',
    additionalImages: [],
    description: 'German engineering with effortless road presence, priced for shorter and longer hire alike. A refined choice for executive travel.',
    pricingType: 'hour',
    startingPrice: 39000,
    rateCard: [
      { label: '1 Hour', price: 39000 },
      { label: '10 Hours', price: 260000 },
      { label: '12 Hours', price: 310000 },
    ],
    airportTransfer: [
      { label: 'Domestic Wing', price: 180000 },
      { label: 'International Wing', price: 190000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'range-rover-2020-abuja',
    name: 'Range Rover (2020)',
    category: 'Luxury SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Land_Rover_Range_Rover_Autobiography_L405_Kaikoura_Stone_(2).jpg',
    additionalImages: [],
    description: 'The ultimate blend of British luxury and commanding road presence. Chauffeured comfort for clients who expect nothing less than the best.',
    pricingType: 'hour',
    startingPrice: 160000,
    rateCard: [
      { label: '1 Hour', price: 160000 },
      { label: '10 Hours', price: 760000 },
      { label: '12 Hours', price: 860000 },
    ],
    airportTransfer: [
      { label: 'Airport Transfer', price: 460000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'g-wagon-2025-abuja',
    name: 'Mercedes-Benz G-Wagon (2025)',
    category: 'Exotic SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Mercedes-Benz_G-Klasse_%28W463%29_G_63_AMG_%282023%29_%2853967592162%29.jpg',
    additionalImages: [],
    description: 'An unmistakable icon of status and performance, chauffeured for clients who want to arrive in complete confidence. Quoted as a flat 10-hour package.',
    pricingType: 'trip',
    startingPrice: 3100000,
    startingPriceDiscountPercent: 2,
    rateCard: [
      { label: '10 Hours', price: 3100000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'rolls-royce-abuja',
    name: 'Rolls-Royce',
    category: 'Exotic Luxury Vehicle',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/7/79/2019_Rolls-Royce_Cullinan_in_Arctic_White%2C_front_left.jpg',
    additionalImages: [],
    description: 'The pinnacle of chauffeured luxury for weddings, red-carpet arrivals, and moments that call for nothing but the best. Quoted as a flat 10-hour package — exact model confirmed at booking.',
    pricingType: 'trip',
    startingPrice: 5100000,
    startingPriceDiscountPercent: 2,
    rateCard: [
      { label: '10 Hours', price: 5100000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'hilux-2020-abuja',
    name: 'Toyota Hilux (2020)',
    category: 'Pickup Truck',
    type: 'Pickup',
    transmission: 'Automatic',
    seats: 5,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/2020_Toyota_Hilux_Revo_4x4_Double-Cab_2.8_Rocco.jpg',
    additionalImages: [],
    description: 'A rugged, dependable pickup built for logistics, site visits, and journeys that demand durability over delicacy.',
    pricingType: 'trip',
    startingPrice: 260000,
    rateCard: [
      { label: '12 Hours', price: 260000 },
    ],
    airportTransfer: [
      { label: 'Airport Transfer', price: 210000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'hiace-hummer-abuja',
    name: 'Toyota Hiace Bus (Hummer)',
    category: 'Group Transport',
    type: 'Van',
    transmission: 'Automatic',
    seats: 14,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/8/80/2020_Toyota_HiAce_%28front%29.jpg',
    additionalImages: [],
    description: 'A practical group shuttle for staff transport, airport runs, and event logistics.',
    pricingType: 'trip',
    startingPrice: 260000,
    rateCard: [
      { label: '12 Hours', price: 260000 },
    ],
    airportTransfer: [
      { label: 'Airport Transfer', price: 210000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'coaster-bus-abuja',
    name: 'Toyota Coaster Bus',
    category: 'Group Transport',
    type: 'Bus',
    transmission: 'Automatic',
    seats: 30,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/2018_Toyota_Coaster_4.0L%2C_08-10-2024.jpg',
    additionalImages: [],
    description: 'A mid-size coach for larger groups — conferences, church trips, and corporate outings.',
    pricingType: 'trip',
    startingPrice: 260000,
    rateCard: [
      { label: '10 Hours', price: 260000 },
      { label: '12 Hours', price: 310000 },
    ],
    airportTransfer: [
      { label: 'Airport Transfer', price: 210000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'sprinter-bus-abuja',
    name: 'Mercedes-Benz Sprinter Bus',
    category: 'Group Transport',
    type: 'Van',
    transmission: 'Automatic',
    seats: 14,
    airConditioning: true,
    driverOptions: ['With Driver'],
    locations: ['Abuja'],
    primaryImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/2019_Mercedes-Benz_Sprinter_314_CDi_2.1.jpg',
    additionalImages: [],
    description: 'A spacious, comfortable van for group and VIP transport, corporate shuttles, and airport transfers. Quoted as a flat 10-hour package.',
    pricingType: 'trip',
    startingPrice: 1100000,
    startingPriceDiscountPercent: 2,
    rateCard: [
      { label: '10 Hours', price: 1100000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'prado-2024-abuja',
    name: 'Toyota Prado (2024)',
    category: 'Executive SUV',
    type: 'SUV',
    transmission: 'Automatic',
    seats: 7,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/2024_Toyota_Land_Cruiser_Prado_2.4_Turbo_in_Black_Mica%2C_front_left.jpg',
    additionalImages: [],
    description: 'The newest Prado in the fleet — modern comfort and capability for business and leisure travel alike. Flexible hourly booking from quick trips to full-day hire.',
    pricingType: 'hour',
    startingPrice: 54000,
    rateCard: [
      { label: '1 Hour', price: 54000 },
      { label: '10 Hours', price: 610000 },
    ],
    airportTransfer: [
      { label: 'Airport Transfer', price: 210000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
  {
    id: 'land-cruiser-2024-premium-abuja',
    name: 'Toyota Land Cruiser (2024) — Premium',
    category: 'Executive SUV',
    type: 'Luxury',
    transmission: 'Automatic',
    seats: 7,
    airConditioning: true,
    driverOptions: ['With Driver', 'Self Drive'],
    locations: ['Abuja'],
    primaryImage: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Toyota_Land_Cruiser_300_4x4_VXR_2023_%285%29.jpg',
    additionalImages: [],
    description: 'A higher-specification 2024 Land Cruiser for clients who want the very best the fleet offers. Flexible hourly booking, from short trips to extended hire.',
    pricingType: 'hour',
    startingPrice: 64000,
    rateCard: [
      { label: '1 Hour', price: 64000 },
      { label: '10 Hours', price: 710000 },
    ],
    airportTransfer: [
      { label: 'Airport Transfer', price: 310000 },
    ],
    agency: 'Cooperate Foot',
    status: 'On Request',
  },
];

export function getVehiclesByLocation(location: string | null): Vehicle[] {
  if (!location) return VEHICLES;
  const norm = location.toLowerCase();
  if (norm.includes('other')) return VEHICLES;
  return VEHICLES.filter((v) =>
    v.locations.some((loc) => norm.includes(loc.toLowerCase()) || loc.toLowerCase().includes(norm))
  );
}

export function getVehicleById(id: string): Vehicle | undefined {
  return VEHICLES.find((v) => v.id === id);
}

const PRICING_SUFFIX: Record<PricingType, string> = {
  hour: '/hour',
  day: '/day',
  trip: '/trip',
  'airport-transfer': '/trip',
  'custom-quote': '',
};

export const PRICING_TYPE_LABEL: Record<PricingType, string> = {
  hour: 'Per Hour',
  day: 'Per Day',
  trip: 'Per Trip',
  'airport-transfer': 'Airport Transfer',
  'custom-quote': 'Custom Quote',
};

export type PriceTier = 'starting' | 'interState';

function formatTierPrice(vehicle: Pick<Vehicle, 'pricingType'>, amount: number | null): string {
  if (amount == null) return 'Price on Request';
  const formatted = `₦${amount.toLocaleString('en-NG')}`;
  if (vehicle.pricingType === 'custom-quote') return `From ${formatted}`;
  return `From ${formatted}${PRICING_SUFFIX[vehicle.pricingType]}`;
}

export function formatStartingPrice(vehicle: Pick<Vehicle, 'startingPrice' | 'pricingType'>): string {
  return formatTierPrice(vehicle, vehicle.startingPrice);
}

// Returns null (rather than "Price on Request") when there's simply no inter-state
// rate on file, so callers can decide whether to render a row at all.
export function formatInterStatePrice(vehicle: Pick<Vehicle, 'interStatePrice' | 'pricingType'>): string | null {
  if (vehicle.interStatePrice == null) return null;
  return formatTierPrice(vehicle, vehicle.interStatePrice);
}

export function formatDiscountBadge(percent: number | null | undefined): string | null {
  if (percent == null || percent <= 0) return null;
  return `${percent}% OFF`;
}

export function getTierPrice(
  vehicle: Pick<Vehicle, 'startingPrice' | 'interStatePrice'>,
  tier: PriceTier
): number | null {
  return tier === 'interState' ? (vehicle.interStatePrice ?? null) : vehicle.startingPrice;
}

export function getTierDiscount(
  vehicle: Pick<Vehicle, 'startingPriceDiscountPercent' | 'interStatePriceDiscountPercent'>,
  tier: PriceTier
): number | null {
  return tier === 'interState' ? (vehicle.interStatePriceDiscountPercent ?? null) : (vehicle.startingPriceDiscountPercent ?? null);
}

// Whether a vehicle's price can be safely multiplied by quantity for an estimate
// (a custom-quote vehicle has no fixed per-unit rate to multiply).
export function isPriceCalculable(vehicle: Pick<Vehicle, 'startingPrice' | 'pricingType'>): boolean {
  return vehicle.startingPrice != null && vehicle.pricingType !== 'custom-quote';
}

export function isTierPriceCalculable(
  vehicle: Pick<Vehicle, 'startingPrice' | 'interStatePrice' | 'pricingType'>,
  tier: PriceTier
): boolean {
  return getTierPrice(vehicle, tier) != null && vehicle.pricingType !== 'custom-quote';
}
