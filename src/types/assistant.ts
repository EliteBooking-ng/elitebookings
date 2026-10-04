// Shared chat/recommendation types used by both AI assistants:
// AIConciergeModal (post-booking support) and DiscoveryAssistantModal (pre-booking discovery).

export interface RecommendationItem {
  id: string;
  name: string;
  category?: string;
  city?: string;
  location: string;
  price: string;
  badge?: string;
  image: string;
  highlights?: string[];
  description?: string;
  tiers?: { name: string; price: string }[];
  // Car Rental only — populated when the recommendation was sourced from the
  // richer Vehicle catalog (src/data/cars.ts) rather than the flat CatalogItem
  // pool. Left undefined for the other 3 categories.
  seats?: number;
  transmission?: 'Automatic' | 'Manual';
  driverOptions?: string[];
  pricingType?: string;
}

export interface HandoffInfo {
  required: boolean;
  priority: 'urgent' | 'normal';
  category: string;
  services: string[];
  summary: string;
}

export interface PendingOffer {
  type: 'area_verification';
  area: string;
  city?: string;
}

export interface MessageContent {
  text: string;
  recommendations?: RecommendationItem[];
  nextStep?: string;
  roomCount?: number;
  handoff?: HandoffInfo;
  pendingOffer?: PendingOffer;
  hasMore?: boolean;
  sourceQuery?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: MessageContent;
  timestamp: string;
}
