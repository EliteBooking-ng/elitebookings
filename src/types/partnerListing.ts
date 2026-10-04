// Partner-submitted listings — hotel/shortlet/car owners list their own
// inventory, which goes live after admin approval. One unified collection
// discriminated by `category`, matching the existing CatalogItem convention
// in src/data/catalog.ts, so browsing UI / Discovery / admin review can all
// treat it as one pool rather than three parallel ones.

export type ListingCategory = 'Hotel' | 'Shortlet' | 'Car Rental';
export type ListingStatus = 'pending' | 'approved' | 'rejected';
export type ListingCity = 'Lagos' | 'Abuja' | 'Port Harcourt';

export interface PartnerListing {
  id: string;
  ownerUid: string;
  ownerEmail: string;
  category: ListingCategory;
  status: ListingStatus;
  rejectionReason?: string;
  name: string;
  location: string;
  city: ListingCity;
  description: string;
  images: string[];
  price: string;
  createdAt: any;
  updatedAt: any;

  // Hotel-only
  tiers?: { name: string; price: string }[];
  // Shortlet-only
  cautionFee?: string;
  features?: string[];
  // Car Rental-only (subset of the full Vehicle shape — rateCard,
  // airportTransfer, interStatePrice stay admin-only for v1)
  vehicleType?: 'Sedan' | 'SUV' | 'Luxury' | 'Van' | 'Bus' | 'Pickup';
  transmission?: 'Automatic' | 'Manual';
  seats?: number;
  airConditioning?: boolean;
  driverOptions?: ('With Driver' | 'Self Drive')[];
  pricingType?: 'day' | 'trip' | 'custom-quote';
}

export interface PartnerProfile {
  uid: string;
  email: string;
  businessName: string;
  phone: string;
  categories: ListingCategory[];
  createdAt: any;
}

export const LISTING_CITIES: ListingCity[] = ['Lagos', 'Abuja', 'Port Harcourt'];
export const LISTING_CATEGORIES: ListingCategory[] = ['Hotel', 'Shortlet', 'Car Rental'];
