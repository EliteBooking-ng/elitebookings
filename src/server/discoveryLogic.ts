import { GoogleGenAI } from "@google/genai";
import { CATALOG_ITEMS, CatalogItem } from "../data/catalog";
import {
  VEHICLES, Vehicle,
  formatStartingPrice, PRICING_TYPE_LABEL,
} from "../data/cars";
import {
  parseQuery, parsePrice, messageIsUnsafe, buildHandoffSummary,
  ELITE_WHATSAPP_LINK, type ParsedQuery, type HandoffInfo,
} from "./conciergeLogic";
import type { RecommendationItem } from "../types/assistant";
import type { PartnerListing } from "../types/partnerListing";
import { getAdminDb } from "./firebaseAdmin";

// ---------------------------------------------------------------------------
// Partner-submitted listings — approved ones are merged into both the
// catalog and vehicle search pools below so Discovery recommends them
// alongside the static inventory. Fetched via firebase-admin (server-side,
// not the browser client SDK) once per request. Failures (including a
// missing FIREBASE_SERVICE_ACCOUNT_JSON) are caught by the caller, which
// falls back to static-only search rather than erroring the whole request.
// ---------------------------------------------------------------------------

async function fetchApprovedPartnerListings(): Promise<PartnerListing[]> {
  const snapshot = await getAdminDb().collection("partner_listings").where("status", "==", "approved").get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PartnerListing));
}

function partnerListingToCatalogItem(l: PartnerListing): CatalogItem {
  return {
    id: l.id,
    name: l.name,
    category: l.category as "Hotel" | "Shortlet",
    city: l.city,
    location: l.location,
    price: l.price,
    badge: "Partner Listing",
    image: l.images[0] || "",
    highlights: l.features || [],
    description: l.description,
    tiers: l.tiers,
  };
}

function partnerListingToVehicle(l: PartnerListing): Vehicle {
  return {
    id: l.id,
    name: l.name,
    category: l.vehicleType || "Sedan",
    type: l.vehicleType || "Sedan",
    transmission: l.transmission || "Automatic",
    seats: l.seats ?? 4,
    airConditioning: l.airConditioning ?? true,
    driverOptions: l.driverOptions && l.driverOptions.length > 0 ? l.driverOptions : ["With Driver"],
    locations: [l.city],
    primaryImage: l.images[0] || "",
    additionalImages: l.images.slice(1),
    description: l.description,
    pricingType: l.pricingType || "day",
    startingPrice: parseInt(l.price.replace(/[^0-9]/g, ""), 10) || null,
    status: "On Request",
  };
}

// ---------------------------------------------------------------------------
// Catalog search (Hotels / Shortlets / Private Jets) — moved here from
// conciergeLogic.ts, since browsing/recommending listings is now Discovery's
// job, not the post-booking Concierge's. Behavior is unchanged from the
// original tiered-relaxation search.
// ---------------------------------------------------------------------------

const AREA_LANDMARK_ALIASES: Record<string, string[]> = {
  choba: ["uniport", "abuja campus", "university of port harcourt"],
  choaba: ["uniport", "abuja campus", "university of port harcourt"],
};

function areaMatches(item: CatalogItem, area: string | undefined): boolean {
  if (!area) return false;
  const loc = item.location.toLowerCase();
  if (loc.includes(area)) return true;
  const aliases = AREA_LANDMARK_ALIASES[area];
  return !!aliases && aliases.some((alias) => loc.includes(alias));
}

const AMENITY_TERMS: { label: string; requestPatterns: RegExp[]; catalogTerms: string[] }[] = [
  { label: "PS5 / gaming console", requestPatterns: [/\bps5\b/i, /playstation/i, /gaming console/i], catalogTerms: ["ps5", "playstation", "gaming console"] },
  { label: "WiFi", requestPatterns: [/\bwifi\b/i, /wi-fi/i, /\binternet\b/i], catalogTerms: ["wifi", "wi-fi", "starlink", "internet"] },
  { label: "swimming pool", requestPatterns: [/\bpool\b/i], catalogTerms: ["pool"] },
  { label: "gym", requestPatterns: [/\bgym\b/i, /fitness/i], catalogTerms: ["gym", "fitness"] },
  { label: "Netflix / streaming", requestPatterns: [/netflix/i, /streaming/i], catalogTerms: ["netflix", "streaming"] },
  { label: "DSTV / TV", requestPatterns: [/\bdstv\b/i, /\btv\b/i, /television/i], catalogTerms: ["dstv", "tv", "television"] },
  { label: "generator / constant power", requestPatterns: [/generator/i, /24\s*\/?\s*7 power/i, /constant (power|electricity)/i], catalogTerms: ["generator", "24/7 power", "constant electricity", "power supply"] },
  { label: "parking", requestPatterns: [/\bparking\b/i], catalogTerms: ["parking"] },
  { label: "breakfast", requestPatterns: [/breakfast/i], catalogTerms: ["breakfast", "dining"] },
  { label: "in-house chef", requestPatterns: [/\bchef\b/i], catalogTerms: ["chef"] },
];

function findUnconfirmedAmenities(rawQuery: string, pool: CatalogItem[]): string[] {
  const requested = AMENITY_TERMS.filter((a) => a.requestPatterns.some((p) => p.test(rawQuery)));
  if (requested.length === 0) return [];

  return requested
    .filter((a) => {
      const textPool = pool.map((i) => `${i.description} ${i.highlights.join(" ")}`.toLowerCase());
      return !textPool.some((text) => a.catalogTerms.some((term) => text.includes(term)));
    })
    .map((a) => a.label);
}

const AMBIENCE_KEYWORDS = [
  "luxury", "luxurious", "premium", "exquisite", "elegant", "elegance", "boutique",
  "exclusive", "majestic", "grandeur", "scenic", "serene", "tranquil", "panoramic",
  "ocean view", "penthouse", "presidential", "executive", "vip", "prestige",
  "sophistication", "refined", "bespoke", "world-class", "ultra-modern", "smart home",
  "ambiance", "ambience", "grand", "opulent", "chic", "stylish", "plush", "lavish",
  "diplomatic", "5-star", "5 star", "4-star", "4 star", "pool", "spa"
];

function ambienceScore(item: CatalogItem): number {
  const text = `${item.name} ${item.description} ${item.highlights.join(" ")}`.toLowerCase();
  let score = 0;
  for (const kw of AMBIENCE_KEYWORDS) {
    if (text.includes(kw)) score += 4;
  }
  return Math.min(score, 12);
}

function scoreAndSortCatalog(pool: CatalogItem[], query: ParsedQuery): CatalogItem[] {
  const scored = pool.map((item) => {
    let score = 0;
    const itemText = `${item.name} ${item.location} ${item.city} ${item.category} ${item.description} ${item.highlights.join(" ")}`.toLowerCase();

    const tokenMatches = query.tokens.filter((token) => itemText.includes(token)).length;
    score += Math.min(tokenMatches * 3, 12);

    score += ambienceScore(item);

    if (areaMatches(item, query.area)) score += 100;

    const price = parsePrice(item.price);
    if (query.maxPrice && price > 0) {
      const distance = Math.abs(price - query.maxPrice);
      score += Math.max(0, 60 - distance / 1000);
    } else if (!query.maxPrice && price > 0) {
      score += Math.min(15, price / 20000);
    }

    if (item.badge) score += 1;

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

type SearchTier =
  | "exact" | "price-relaxed" | "location-relaxed" | "location-and-price-relaxed"
  | "category-relaxed" | "category-and-price-relaxed" | "popular";

interface CatalogSearchResult {
  tier: SearchTier;
  items: CatalogItem[];
  hasMore: boolean;
  city?: string;
  area?: string;
  areaConfirmed: boolean;
  category?: string;
  maxPrice?: number;
}

// `pool` scopes the search universe — the full catalog for a single detected
// category, or the catalog minus Car Rental when blending across an
// undetermined category (cars are represented separately via vehicle search).
function searchCatalogPool(pool: CatalogItem[], query: ParsedQuery, excludeIds: string[]): CatalogSearchResult {
  const { city, area, category, maxPrice } = query;

  const cityOk = (item: CatalogItem) => !city || item.city.toLowerCase() === city.toLowerCase();
  const categoryOk = (item: CatalogItem) => !category || item.category.toLowerCase() === category.toLowerCase();
  const priceOk = (item: CatalogItem) => !maxPrice || (parsePrice(item.price) > 0 && parsePrice(item.price) <= maxPrice);

  const rankPool = (p: CatalogItem[]): { items: CatalogItem[]; hasMore: boolean } => {
    const fresh = excludeIds.length === 0 ? p : p.filter((i) => !excludeIds.includes(i.id));
    const effectivePool = fresh.length > 0 ? fresh : p;
    const sorted = scoreAndSortCatalog(effectivePool, query);
    const items = sorted.slice(0, 3);
    const hasMore = fresh.length > items.length;
    return { items, hasMore };
  };

  if (area) {
    const areaPool = pool.filter((i) => cityOk(i) && categoryOk(i) && areaMatches(i, area));
    if (areaPool.length > 0) {
      const { items, hasMore } = rankPool(areaPool);
      const allWithinBudget = items.every((i) => priceOk(i));
      return { tier: allWithinBudget ? "exact" : "price-relaxed", items, hasMore, city, area, areaConfirmed: true, category, maxPrice };
    }
  }

  const tiers: { tier: SearchTier; predicate: (item: CatalogItem) => boolean; requiresConstraint: boolean }[] = [
    { tier: "exact", predicate: (i) => cityOk(i) && categoryOk(i) && priceOk(i), requiresConstraint: true },
    { tier: "price-relaxed", predicate: (i) => cityOk(i) && categoryOk(i), requiresConstraint: !!maxPrice },
    { tier: "location-relaxed", predicate: (i) => categoryOk(i) && priceOk(i), requiresConstraint: !!city },
    { tier: "location-and-price-relaxed", predicate: (i) => categoryOk(i), requiresConstraint: !!city && !!maxPrice },
    { tier: "category-relaxed", predicate: (i) => cityOk(i) && priceOk(i), requiresConstraint: !!category },
    { tier: "category-and-price-relaxed", predicate: (i) => cityOk(i), requiresConstraint: !!category && !!maxPrice },
  ];

  for (const { tier, predicate, requiresConstraint } of tiers) {
    if (!requiresConstraint) continue;
    const p = pool.filter(predicate);
    if (p.length > 0) {
      const { items, hasMore } = rankPool(p);
      const areaConfirmed = !area || items.some((i) => areaMatches(i, area));
      return { tier, items, hasMore, city, area, areaConfirmed, category, maxPrice };
    }
  }

  const { items: popularPool, hasMore: popularHasMore } = rankPool(pool);
  const areaConfirmed = !area || popularPool.some((i) => areaMatches(i, area));
  return { tier: "popular", items: popularPool, hasMore: popularHasMore, city, area, areaConfirmed, category, maxPrice };
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function buildCatalogMessage(result: CatalogSearchResult, unlistedRequested: boolean): string {
  const { tier, items, city, area, areaConfirmed, category, maxPrice } = result;
  const catLabel = category ? category.toLowerCase() : "stay";
  const budgetLabel = maxPrice ? formatNaira(maxPrice) : undefined;
  const actualCategories = [...new Set(items.map((i) => i.category))].join(" & ");

  const inCity = city ? ` in ${city}` : "";
  const withinBudget = budgetLabel ? ` within your ${budgetLabel} budget` : "";

  if (unlistedRequested) {
    return `That specific listing isn't part of Elite Booking's curated portfolio, but here are our top-rated ${catLabel} options${inCity} that deliver a similarly excellent experience.`;
  }

  if (area && !areaConfirmed) {
    return `I don't have listings confirmed specifically in ${area} yet, so here are the closest verified options${inCity}${withinBudget}. Let me know if you'd like me to flag ${area} to our team to double-check availability there.`;
  }

  switch (tier) {
    case "exact":
      return area && areaConfirmed
        ? `Here's the closest verified match to ${area}${inCity}${withinBudget} — take a look and compare.`
        : `Here are excellent ${catLabel} options${inCity}${withinBudget} — a good set to compare.`;
    case "price-relaxed":
      return area && areaConfirmed
        ? `Here's the closest verified option to ${area}${inCity} — it's just outside your ${budgetLabel} budget, but the nearest real match confirmed rather than a guess.`
        : `Here are the best ${catLabel} options${inCity} — just outside your ${budgetLabel} budget, but excellent value.`;
    case "location-relaxed":
      return budgetLabel
        ? `Here are outstanding ${catLabel} options within your ${budgetLabel} budget in other prime locations. If ${city} specifically matters, I can also check a higher budget there.`
        : `Here are outstanding ${catLabel} options in other prime locations that are extremely popular. Let me know if ${city} specifically matters and I'll dig further.`;
    case "location-and-price-relaxed":
      return `Here are our top ${catLabel} picks across our portfolio. Share your preferred city or budget and I'll narrow these down.`;
    case "category-relaxed":
      return `Here are Elite Booking's top picks${inCity}${withinBudget} — these are ${actualCategories} options, and they're extremely popular with guests${city ? " booking in this area" : ""}.`;
    case "category-and-price-relaxed":
      return `Here are our most popular listings${inCity} across categories — take a look, or tell me more about what you're after and I'll refine these.`;
    case "popular":
    default:
      return `Here are some of Elite Booking's most popular options right now. Share your city, budget, or dates and I'll tailor these for you.`;
  }
}

function formatCatalogRec(item: CatalogItem): RecommendationItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    city: item.city,
    location: item.location,
    price: !item.price ? "Price on request" : item.price.startsWith("₦") ? item.price : `₦${item.price}`,
    badge: item.badge || "Verified Listing",
    image: item.image,
    highlights: item.highlights,
    description: item.description,
    tiers: item.tiers,
  };
}

// ---------------------------------------------------------------------------
// Vehicle search (Car Rentals) — new. Queries the richer Vehicle catalog
// (src/data/cars.ts) instead of the flattened CatalogItem entries, so
// Discovery can actually answer questions about seats, transmission, driver
// options, and hourly rate cards that the flat catalog doesn't carry.
// ---------------------------------------------------------------------------

function detectSeatsRequest(text: string): number | undefined {
  const m = text.toLowerCase().match(/(\d+)\s*(?:-|\s)?seat/i);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return n > 0 && n <= 60 ? n : undefined;
}

function scoreAndSortVehicles(pool: Vehicle[], query: ParsedQuery, seatsRequested: number | undefined): Vehicle[] {
  const wantsDriver = query.tokens.includes("driver") || query.tokens.includes("chauffeur");
  const wantsSelfDrive = query.tokens.some((t) => t.includes("self"));

  const scored = pool.map((v) => {
    let score = 0;
    const text = `${v.name} ${v.category} ${v.type} ${v.description}`.toLowerCase();

    const tokenMatches = query.tokens.filter((t) => text.includes(t)).length;
    score += Math.min(tokenMatches * 3, 12);

    if (seatsRequested != null) {
      if (v.seats === seatsRequested) score += 20;
      else score += Math.max(0, 8 - Math.abs(v.seats - seatsRequested));
    }

    if (wantsDriver && v.driverOptions.includes("With Driver")) score += 8;
    if (wantsSelfDrive && v.driverOptions.includes("Self Drive")) score += 8;

    const price = v.startingPrice ?? 0;
    if (query.maxPrice && price > 0) {
      const distance = Math.abs(price - query.maxPrice);
      score += Math.max(0, 60 - distance / 1000);
    } else if (!query.maxPrice && price > 0) {
      score += Math.min(15, price / 20000);
    }

    if (v.status === "Available") score += 2;

    return { v, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.v);
}

interface VehicleSearchResult {
  tier: "exact" | "price-relaxed" | "location-relaxed" | "popular";
  items: Vehicle[];
  hasMore: boolean;
  city?: string;
}

function searchVehiclePool(query: ParsedQuery, excludeIds: string[], seatsRequested: number | undefined, limit = 3, basePool: Vehicle[] = VEHICLES): VehicleSearchResult {
  // Mirrors getVehiclesByLocation's matching rule (src/data/cars.ts), but
  // applied to basePool so partner-submitted vehicles are included too.
  const cityPool = !query.city
    ? basePool
    : basePool.filter((v) => v.locations.some((loc) => query.city!.toLowerCase().includes(loc.toLowerCase()) || loc.toLowerCase().includes(query.city!.toLowerCase())));
  const priceOk = (v: Vehicle) => !query.maxPrice || (v.startingPrice != null && v.startingPrice > 0 && v.startingPrice <= query.maxPrice);

  const rank = (pool: Vehicle[]) => {
    const fresh = excludeIds.length === 0 ? pool : pool.filter((v) => !excludeIds.includes(v.id));
    const effective = fresh.length > 0 ? fresh : pool;
    const sorted = scoreAndSortVehicles(effective, query, seatsRequested);
    const items = sorted.slice(0, limit);
    const hasMore = fresh.length > items.length;
    return { items, hasMore };
  };

  if (cityPool.length > 0) {
    const exactPool = cityPool.filter(priceOk);
    if (exactPool.length > 0) {
      const { items, hasMore } = rank(exactPool);
      return { tier: "exact", items, hasMore, city: query.city };
    }
    const { items, hasMore } = rank(cityPool);
    return { tier: query.maxPrice ? "price-relaxed" : "exact", items, hasMore, city: query.city };
  }

  const { items, hasMore } = rank(basePool);
  return { tier: query.city ? "location-relaxed" : "popular", items, hasMore, city: query.city };
}

function buildVehicleMessage(result: VehicleSearchResult): string {
  const inCity = result.city ? ` in ${result.city}` : "";
  switch (result.tier) {
    case "exact":
      return `Here are great car rental options${inCity} — take a look and compare.`;
    case "price-relaxed":
      return `Here are the closest car options${inCity} to your budget — happy to check other price ranges too.`;
    case "location-relaxed":
      return `We don't have cars confirmed specifically${inCity} yet, so here are our most popular vehicles from elsewhere in our fleet.`;
    case "popular":
    default:
      return `Here are some of our most popular vehicles right now.`;
  }
}

function formatVehicleRec(v: Vehicle): RecommendationItem {
  return {
    id: v.id,
    name: v.name,
    category: "Car Rental",
    location: v.locations.join(", "),
    price: formatStartingPrice(v),
    badge: v.status === "Available" ? "Available" : "On Request",
    image: v.primaryImage,
    highlights: [v.type, v.transmission, ...(v.airConditioning ? ["AC"] : [])],
    description: v.description,
    seats: v.seats,
    transmission: v.transmission,
    driverOptions: v.driverOptions,
    pricingType: PRICING_TYPE_LABEL[v.pricingType],
  };
}

// ---------------------------------------------------------------------------
// Unified multi-category search — the entry point both branches funnel
// through. Cars always come from the Vehicle catalog; everything else comes
// from CatalogItem. When no category is named, blends picks from both pools
// rather than defaulting to hotels-only, since 3 of Elite Booking's 4
// verticals aren't lodging.
// ---------------------------------------------------------------------------

interface DiscoveryResult {
  message: string;
  items: RecommendationItem[];
  hasMore: boolean;
  tier: string;
  city?: string;
  area?: string;
  areaConfirmed: boolean;
}

async function searchInventory(queryText: string, excludeIds: string[], latestMsg?: string): Promise<DiscoveryResult> {
  const query = parseQuery(queryText, latestMsg);
  const seatsRequested = detectSeatsRequest(queryText);

  let partnerListings: PartnerListing[] = [];
  try {
    partnerListings = await fetchApprovedPartnerListings();
  } catch (err) {
    console.warn("Partner listings unavailable for Discovery search, falling back to static inventory only:", err);
  }
  const partnerCatalogItems = partnerListings.filter((l) => l.category === "Hotel" || l.category === "Shortlet").map(partnerListingToCatalogItem);
  const partnerVehicles = partnerListings.filter((l) => l.category === "Car Rental").map(partnerListingToVehicle);

  const fullCatalogPool = [...CATALOG_ITEMS, ...partnerCatalogItems];
  const fullVehiclePool = [...VEHICLES, ...partnerVehicles];

  if (query.category === "Car Rental") {
    const result = searchVehiclePool(query, excludeIds, seatsRequested, 3, fullVehiclePool);
    return {
      message: buildVehicleMessage(result),
      items: result.items.map(formatVehicleRec),
      hasMore: result.hasMore,
      tier: result.tier,
      city: result.city,
      areaConfirmed: true,
    };
  }

  if (query.category) {
    const catalogResult = searchCatalogPool(fullCatalogPool, query, excludeIds);
    let message = buildCatalogMessage(catalogResult, query.unlistedRequested);
    const unconfirmed = findUnconfirmedAmenities(queryText, fullCatalogPool.filter((i) => (!query.city || i.city === query.city) && i.category === query.category));
    if (unconfirmed.length > 0) {
      message = `${message} I don't see ${unconfirmed.join(" or ")} confirmed for any of our current ${query.city || "Nigeria"} options — happy to double-check with our team if that's essential.`;
    }
    return {
      message,
      items: catalogResult.items.map(formatCatalogRec),
      hasMore: catalogResult.hasMore,
      tier: catalogResult.tier,
      city: catalogResult.city,
      area: catalogResult.area,
      areaConfirmed: catalogResult.areaConfirmed,
    };
  }

  // No category named — blend across verticals.
  const nonCarPool = fullCatalogPool.filter((i) => i.category !== "Car Rental");
  const catalogResult = searchCatalogPool(nonCarPool, query, excludeIds);
  const vehicleResult = searchVehiclePool(query, excludeIds, seatsRequested, 2, fullVehiclePool);

  const items = [
    ...catalogResult.items.slice(0, 3).map(formatCatalogRec),
    ...vehicleResult.items.slice(0, 2).map(formatVehicleRec),
  ];

  return {
    message: buildCatalogMessage(catalogResult, query.unlistedRequested),
    items,
    hasMore: catalogResult.hasMore || vehicleResult.hasMore,
    tier: catalogResult.tier,
    city: catalogResult.city,
    area: catalogResult.area,
    areaConfirmed: catalogResult.areaConfirmed,
  };
}

// ---------------------------------------------------------------------------
// Gemini polish — same "reword only, never a source of truth" contract as the
// Concierge's polishMessage. Discarded on any failure or guardrail violation.
// ---------------------------------------------------------------------------

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }
  return aiClient;
}

async function polishDiscoveryMessage(baseMessage: string, candidateNames: string[], conversationContext: string): Promise<string> {
  const systemPrompt = `# ELITE BOOKING AI ASSISTANT — DISCOVERY MESSAGE POLISH POLICY

You are the EliteBooking AI Assistant — a knowledgeable, consultative travel and
lifestyle advisor helping a guest discover the right hotel, shortlet, car rental,
or private jet BEFORE they book anything. You are given a FACTUALLY CORRECT base
message. Your ONLY job is to rephrase it to sound warm, curious, and consultative
— like a well-traveled friend helping someone compare real options — never like a
form or a search results page read aloud. You are NOT inventing new information,
and you do not process bookings or payments yourself.

BASE MESSAGE (rephrase this, do not contradict or add facts to it):
"${baseMessage}"

RULES (violating any of these means your output will be discarded):
1. Do not name any specific property, vehicle, aircraft, brand, or company in your rephrasing — not even ones from our own listings (${candidateNames.join(", ") || "none"}). Refer to them only generically ("these options", "the picks below").
2. Never mention any external hotel, resort, car rental platform, airline, or booking service.
3. Never say "we don't have", "couldn't find", "no match", "not available", or any similar dead-end phrase. Always sound like you are actively helping the guest compare something real.
4. Frame things in terms of fit for the guest's stated need, not just specs.
5. Keep it to 1-2 warm, concise sentences.
6. Output ONLY the rephrased message text as plain text. No JSON, no quotes, no preamble.`;

  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [{ role: "user", parts: [{ text: conversationContext || baseMessage }] }],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.4,
    },
  });

  // candidateNames already covers catalog + vehicle + partner-listing names
  // (it's built from this exact search result's items), so extending the
  // guardrail with it means a correct mention of a partner listing is never
  // mistaken for a hallucination the way it would be checking only the
  // static VEHICLES/CATALOG_ITEMS lists.
  const text = (response.text || "").trim();
  if (!text || messageIsUnsafe(text, CATALOG_ITEMS, [...VEHICLES.map((v) => v.name), ...candidateNames])) {
    return baseMessage;
  }
  return text;
}

// ---------------------------------------------------------------------------
// Pending-offer / affirmative-confirmation loop — carried over from the
// original concierge search flow. Only ever created when an area was named
// but couldn't be confirmed against real listings, so a guest's "yes" to
// "want me to flag that area to the team?" can actually be actioned.
// ---------------------------------------------------------------------------

interface PendingOffer {
  type: "area_verification";
  area: string;
  city?: string;
}

const AFFIRMATIVE_PATTERNS = [
  /^\s*(yes|yeah|yep|yup|sure|ok(ay)?|please|please do|go ahead|do that|do it)\b/i,
  /^\s*(i('| a)?d like (that|to)|sounds good|that('?s| is) fine|that works)\b/i,
];

function isAffirmative(text: string): boolean {
  return AFFIRMATIVE_PATTERNS.some((p) => p.test(text));
}

// ---------------------------------------------------------------------------
// Request handler — framework-agnostic, mirroring conciergeLogic.ts's
// adapter pattern. server.ts and netlify/functions/discovery.ts both call
// this exact same logic.
// ---------------------------------------------------------------------------

export interface DiscoveryHandlerResult {
  statusCode: number;
  body: Record<string, unknown>;
}

export async function handleDiscoveryRequest(requestBody: any): Promise<DiscoveryHandlerResult> {
  try {
    const { messages, excludeIds, pendingOffer } = requestBody || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, body: { error: "Messages array is required." } };
    }

    const lastUserMsg = messages
      .filter((m: any) => m.role === "user")
      .map((m: any) => (m.content || "").toString())
      .join(" ");

    const latestUserMsg = (messages[messages.length - 1]?.content || "").toString();

    const safeExcludeIds: string[] = Array.isArray(excludeIds)
      ? excludeIds.filter((id: any) => typeof id === "string")
      : [];

    if (
      pendingOffer &&
      pendingOffer.type === "area_verification" &&
      typeof pendingOffer.area === "string" &&
      isAffirmative(latestUserMsg)
    ) {
      const area = pendingOffer.area;
      const city = typeof pendingOffer.city === "string" ? pendingOffer.city : undefined;
      return {
        statusCode: 200,
        body: {
          message: `Done — I've flagged ${area} to our Elite Booking team to confirm availability for you there. They'll follow up directly.`,
          recommendations: [],
          handoff: {
            required: true,
            priority: "normal",
            category: "Area Verification Request",
            services: [],
            summary: buildHandoffSummary(lastUserMsg, "Area Verification Request", city, [`Confirm availability in ${area}`]),
          } as HandoffInfo,
          nextStep: `Our team will follow up shortly. For anything urgent, message us: ${ELITE_WHATSAPP_LINK}`,
        },
      };
    }

    const result = await searchInventory(lastUserMsg, safeExcludeIds, latestUserMsg);

    let finalMessage = result.message;
    try {
      finalMessage = await polishDiscoveryMessage(result.message, result.items.map((i) => i.name), lastUserMsg);
    } catch (aiErr) {
      console.warn("Gemini polish unavailable, using deterministic message:", aiErr);
    }

    const newPendingOffer: PendingOffer | undefined =
      result.area && !result.areaConfirmed ? { type: "area_verification", area: result.area, city: result.city } : undefined;

    return {
      statusCode: 200,
      body: {
        message: finalMessage,
        recommendations: result.items,
        tier: result.tier,
        hasMore: result.hasMore,
        pendingOffer: newPendingOffer,
        nextStep: "Want me to go deeper on any of these, or narrow things further?",
      },
    };
  } catch (error: any) {
    console.error("Error in Discovery Assistant endpoint:", error);
    return {
      statusCode: 500,
      body: { error: error.message || "An error occurred while communicating with the Discovery Assistant." },
    };
  }
}
