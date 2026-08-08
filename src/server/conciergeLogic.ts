import { GoogleGenAI } from "@google/genai";
import { CATALOG_ITEMS, CatalogItem } from "../data/catalog";

// ---------------------------------------------------------------------------
// Catalog-only guardrails
// ---------------------------------------------------------------------------

// Hotel chains / brands we never carry, plus third-party platforms we never send
// customers to. If a user asks for one of these by name, we still respond with
// real Elite Booking alternatives rather than a dead end.
// NOTE: keep this list in sync with CATALOG_ITEMS — Elite Booking's real portfolio
// includes some well-known chain properties (Eko Hotel, Bon Hotel, Nordic Hotel,
// Federal Palace, Land Mark Hotel), so those must NOT be blocked here even though
// they sound like "external" brands. Verify against catalog.ts before adding a term.
const UNLISTED_KEYWORDS = [
  "transcorp hilton", "hilton", "sheraton", "radisson",
  "wheatbaker", "oriental hotel", "four points", "protea", "ibis",
  "intercontinental", "marriott", "southern sun", "sofitel", "golden tulip lagos",
  "hotel presidential", "presidential", "swiss international", "mabisel", "novotel",
  "yacht", "helicopter", "ferry",
  "kempinski", "hyatt", "best western", "le meridien", "meridien", "movenpick",
  "mövenpick", "nicon luxury", "lagos continental", "civic centre hotel",
  "civic center hotel", "george hotel", "renaissance", "double tree", "doubletree",
  "holiday inn", "ramada", "ritz carlton", "ritz-carlton", "four seasons", "shangri-la",
  "shangri la", "hard rock hotel", "bogobiri",
  "airbnb", "booking.com", "expedia", "trivago", "hotels.com", "tripadvisor", "agoda",
  "uber", "bolt", "indrive", "lagos ride"
];

// Dead-end phrases the concierge must never lead with — every response has to
// recommend something instead of stopping at "we don't have X".
const FORBIDDEN_DEADEND_PHRASES = [
  "we don't have", "we do not have", "couldn't find", "could not find",
  "no match", "not available", "unable to find", "sorry, we", "unfortunately we",
  "we currently don't", "we currently do not", "no results", "nothing matching"
];

const PROPER_NOUN_PATTERN = /\b([A-Z][a-zA-Z'&]*(?:\s+[A-Z][a-zA-Z'&]*){0,4}\s+(?:Hotel|Hotels|Suites|Suite|Resort|Resorts|Lodge|Apartments?|Villas?|Inn|Palace|Plaza|Towers?|Residences?))\b/g;

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const UNLISTED_KEYWORD_PATTERNS = UNLISTED_KEYWORDS.map(
  (term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i")
);
const FORBIDDEN_PHRASE_PATTERNS = FORBIDDEN_DEADEND_PHRASES.map(
  (term) => new RegExp(escapeRegExp(term), "i")
);

// A message fails validation if it names anything outside the catalog, or if it
// leads with a dead end instead of a recommendation.
function messageIsUnsafe(message: string, catalogItems: CatalogItem[]): boolean {
  if (UNLISTED_KEYWORD_PATTERNS.some((p) => p.test(message))) return true;
  if (FORBIDDEN_PHRASE_PATTERNS.some((p) => p.test(message))) return true;

  const matches = message.match(PROPER_NOUN_PATTERN) || [];
  for (const match of matches) {
    const cleanMatch = match.toLowerCase().trim();
    const isKnownListing = catalogItems.some((item) => {
      const cleanName = item.name.toLowerCase().trim();
      return cleanName.includes(cleanMatch) || cleanMatch.includes(cleanName);
    });
    if (!isKnownListing) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Intent detection & human handoff
//
// The catalog search below can only ever answer "what listings match this
// request" — it has no access to live booking status, payments, hotel
// operations, or dispatch. Anything touching those must never be answered by
// guessing; it has to be routed to a human agent with a clear summary. This
// layer runs BEFORE catalog search and decides whether this turn is a normal
// property search or something that needs a person.
// ---------------------------------------------------------------------------

const ELITE_WHATSAPP = "+234 707 225 3857";
const ELITE_WHATSAPP_LINK = "https://wa.me/2347072253857";

// Highest priority: never let anything else in the message override this.
const SAFETY_PATTERNS = [
  /\bunsafe\b/i, /don'?t feel safe/i, /threat(en(ed|ing)?)?/i, /\bemergency\b/i,
  /in danger/i, /\bscared\b/i, /assault/i, /harass/i, /being followed/i, /trapped/i
];

// Money already moved (or should have) — never guess about payment/refund state.
// Note: gaps like "charged .{0,20}again" (not "charged again") are intentional —
// real customer phrasing rarely puts these words directly adjacent ("charged my
// card again"), so a tight match misses them. Verified against a 40-scenario
// stress test before landing on these.
const PAYMENT_ISSUE_PATTERNS = [
  /charged.{0,20}twice/i, /duplicate (payment|charge)/i, /double[- ]?charge/i,
  /payment.{0,15}(not|didn'?t) (go through|confirmed|received)/i, /\brefund\b/i,
  /money back/i, /charged.{0,20}again/i, /overcharged/i, /billed.{0,15}twice/i,
  /payment (issue|problem)/i
];

// Something is actively wrong with a stay/service already in progress.
const PROBLEM_REPORT_PATTERNS = [
  /dirty room/i, /room is dirty/i, /no electricity/i, /power(’|'| i)?s? (is )?out/i,
  /\bno water\b/i, /\bac\b.{0,25}(not working|is broken|isn'?t working|broken)/i,
  /air condition(er|ing)?.{0,25}(not working|broken|isn'?t working)/i,
  /different (room|from what)/i, /not what i booked/i,
  /reservation.{0,20}(can(no|')t be found|not found|doesn'?t exist)/i,
  /(cannot|can'?t|couldn'?t) find.{0,15}reservation/i,
  /(hotel|property).{0,10}fully booked/i, /no rooms? available/i,
  /driver.{0,15}(didn'?t|did not|never).{0,10}(show|arrive)/i, /driver.{0,10}late/i,
  /flight.{0,25}(delay|delayed|cancel)/i
];

// Needs coordination with a property/partner or changes a live reservation —
// the concierge has no booking database to check or alter these itself.
const BOOKING_CHANGE_PATTERNS = [
  /cancel.{0,15}(booking|reservation)/i, /cancel(l)?ation/i, /change.{0,20}date/i,
  /change.{0,15}name/i, /extend (my|the) stay/i, /reschedul/i,
  /move my (check-?in|check-?out|booking)/i, /booking confirmation/i,
  /is my booking confirmed/i, /confirm(ed)? my (booking|reservation)/i
];

// Vague distress/frustration without a specific matched problem above — still
// must not default to cheerfully recommending hotels. Caught separately so we
// can route to a calming, human-connecting response instead.
const DISTRESS_PATTERNS = [
  /\bridiculous\b/i, /\bunacceptable\b/i, /\bterrible\b/i, /\bawful\b/i, /\bworst\b/i,
  /\bfurious\b/i, /\boutrageous\b/i, /\bdisgusted\b/i, /\bunhappy\b/i,
  /\bdisappointed\b/i, /\bfrustrat(ed|ing)\b/i, /fix this now/i, /this is not (ok|okay)/i
];

function isShouting(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 12) return false;
  const upper = letters.replace(/[^A-Z]/g, "");
  return upper.length / letters.length > 0.7;
}

// A customer just telling us about something already booked (possibly not
// through the concierge at all) — the right move is to proactively offer more
// help, not run a property search against an informational statement.
const ALREADY_BOOKED_PATTERNS = [
  /\bi (just|already) (booked|reserved)\b/i, /\bi have a (booking|reservation)\b/i,
  /\bmy booking is (done|confirmed|sorted)\b/i
];

// Never disclose internals — decline and redirect, no escalation needed.
const CONFIDENTIAL_PATTERNS = [
  /\bcommission\b/i, /how much do you (make|earn)/i, /your (cut|margin)/i,
  /supplier (rate|price|cost)/i, /partner (rate|price|agreement)/i,
  /internal (pricing|price|rate)/i, /wholesale (rate|price)/i,
  /how much (does|do) (elite booking|you) (pay|make)/i, /profit margin/i
];

// Asking the AI to promise something it structurally cannot promise.
const GUARANTEE_PATTERNS = [
  /\bguarantee\b/i, /promise me/i, /100% (sure|certain|guaranteed)/i,
  /can you confirm (right now|immediately)/i, /are you (100% |completely )?sure/i
];

// Concierge add-ons Elite Booking coordinates by hand — never auto-confirmed,
// always routed to a human for pricing/availability.
const CONCIERGE_SERVICE_PATTERNS: { label: string; patterns: RegExp[] }[] = [
  { label: "Airport Transfer", patterns: [/airport (pickup|pick-?up|transfer|drop-?off)/i, /pick (me|us) up from the airport/i] },
  { label: "Private Driver", patterns: [/\bdriver\b/i, /\bchauffeur\b/i] },
  { label: "Restaurant Reservation", patterns: [/\brestaurant\b/i, /somewhere (nice|good) (for|to) (eat|dinner|lunch)/i, /dinner reservation/i, /private dinner/i] },
  { label: "Grocery Shopping", patterns: [/\bgroceries\b/i, /\bgrocery\b/i] },
  { label: "Food Delivery", patterns: [/food delivery/i, /order (some )?food/i] },
  { label: "Laundry Service", patterns: [/\blaundry\b/i, /dry clean/i] },
  { label: "Housekeeping / Cleaning", patterns: [/housekeeping/i, /clean (my|the) room/i, /extra cleaning/i] },
  { label: "Barber", patterns: [/\bbarber\b/i, /\bhaircut\b/i] },
  { label: "Makeup Artist", patterns: [/makeup artist/i, /\bmakeup\b/i] },
  { label: "Flowers", patterns: [/\bflowers?\b/i, /\bbouquet\b/i] },
  { label: "Birthday / Celebration Setup", patterns: [/birthday surprise/i, /surprise (setup|decoration)/i, /anniversary surprise/i] },
  { label: "Bottled Water Supply", patterns: [/bottled water/i, /drinking water/i] },
  { label: "Early Check-in / Late Checkout", patterns: [/early check-?in/i, /late check-?out/i] },
];

// Clearly outside what Elite Booking does at all (Nigeria hotels/shortlets/
// cars/concierge) — decline clearly rather than pretending to help.
const OUT_OF_SCOPE_PATTERNS = [
  /book (a |me a )?flight/i, /\bvisa\b/i, /passport/i, /immigration/i,
  /currency exchange/i, /\bcrypto\b/i, /international hotel/i, /hotel (in|outside) (dubai|london|usa|america|uk|paris|europe)/i
];

interface IntentAnalysis {
  safetyConcern: boolean;
  paymentIssue: boolean;
  problemReport: boolean;
  generalDistress: boolean;
  bookingChange: boolean;
  confidentialRequest: boolean;
  guaranteeRequest: boolean;
  outOfScope: boolean;
  alreadyBooked: boolean;
  services: string[];
}

function analyzeIntent(query: string): IntentAnalysis {
  return {
    safetyConcern: SAFETY_PATTERNS.some((p) => p.test(query)),
    paymentIssue: PAYMENT_ISSUE_PATTERNS.some((p) => p.test(query)),
    problemReport: PROBLEM_REPORT_PATTERNS.some((p) => p.test(query)),
    generalDistress: DISTRESS_PATTERNS.some((p) => p.test(query)) || isShouting(query),
    bookingChange: BOOKING_CHANGE_PATTERNS.some((p) => p.test(query)),
    confidentialRequest: CONFIDENTIAL_PATTERNS.some((p) => p.test(query)),
    guaranteeRequest: GUARANTEE_PATTERNS.some((p) => p.test(query)),
    outOfScope: OUT_OF_SCOPE_PATTERNS.some((p) => p.test(query)),
    alreadyBooked: ALREADY_BOOKED_PATTERNS.some((p) => p.test(query)),
    services: CONCIERGE_SERVICE_PATTERNS.filter((s) => s.patterns.some((p) => p.test(query))).map((s) => s.label),
  };
}

interface HandoffInfo {
  required: boolean;
  priority: "urgent" | "normal";
  category: string;
  services: string[];
  summary: string;
}

function buildHandoffSummary(rawQuery: string, category: string, city: string | undefined, services: string[]): string {
  const lines = [
    `CUSTOMER REQUEST:\n${category}`,
    city ? `LOCATION:\n${city}` : null,
    services.length > 0 ? `SERVICES REQUESTED:\n${services.join(", ")}` : null,
    `CUSTOMER MESSAGE:\n"${rawQuery.trim()}"`,
    `STATUS:\nHuman verification required`,
  ].filter((l): l is string => Boolean(l));
  return lines.join("\n\n");
}

// When the concierge offers something conditional ("I can flag this to our
// team if you'd like"), that offer has to actually be actionable — a "yes"
// from the customer must trigger the real handoff, not silently re-run a
// search. This is how that offer/confirmation loop is tracked across turns.
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
// Query parsing
// ---------------------------------------------------------------------------

function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

interface ParsedQuery {
  city?: "Abuja" | "Lagos" | "Port Harcourt";
  area?: string;
  category?: "Hotel" | "Shortlet" | "Car Rental" | "Private Jet";
  maxPrice?: number;
  roomCount?: number;
  unlistedRequested: boolean;
  tokens: string[];
}

const CITY_TERMS: [string, "Abuja" | "Lagos" | "Port Harcourt"][] = [
  ["port harcourt", "Port Harcourt"], [" ph ", "Port Harcourt"], ["evo road", "Port Harcourt"],
  ["lagos", "Lagos"], ["lekki", "Lagos"], ["victoria island", "Lagos"], ["maryland", "Lagos"], ["surulere", "Lagos"],
  ["abuja", "Abuja"], ["maitama", "Abuja"], ["wuse", "Abuja"], ["garki", "Abuja"], ["asokoro", "Abuja"], ["mabushi", "Abuja"],
];

// When a customer self-corrects ("Lagos, actually make it Abuja"), the last
// city/price they said is the one that matters — not whichever we happen to
// check first.
function detectCity(text: string): "Abuja" | "Lagos" | "Port Harcourt" | undefined {
  let best: { city: "Abuja" | "Lagos" | "Port Harcourt"; index: number } | undefined;
  for (const [term, city] of CITY_TERMS) {
    const idx = text.lastIndexOf(term);
    if (idx !== -1 && (!best || idx > best.index)) {
      best = { city, index: idx };
    }
  }
  return best?.city;
}

// City-level matching alone isn't good enough — "hotel in Choba, Port
// Harcourt" and "hotel in GRA, Port Harcourt" are very different requests.
// This pulls out whatever neighborhood/locality was actually named so it can
// be checked against each listing's real street address, rather than only
// matching on the city.
const AREA_STOPWORDS = new Set([
  "a", "the", "of", "hotel", "hotels", "shortlet", "shortlets", "apartment",
  "apartments", "stay", "stays", "need", "want", "good", "nice", "best",
  "cheap", "budget", "some", "any", "for", "please", "room", "rooms",
]);

function detectArea(text: string, city: "Abuja" | "Lagos" | "Port Harcourt" | undefined): string | undefined {
  if (!city) return undefined;
  const cityLower = city.toLowerCase();
  const patterns = [
    new RegExp(`(?:in|near|around|by)\\s+([a-z][a-z'\\-]*(?:\\s+[a-z][a-z'\\-]*){0,2})\\s*,?\\s*${cityLower}\\b`, "i"),
    new RegExp(`([a-z][a-z'\\-]*(?:\\s+[a-z][a-z'\\-]*){0,2})\\s*,\\s*${cityLower}\\b`, "i"),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match || !match[1]) continue;
    const words = match[1]
      .trim()
      .split(/\s+/)
      .filter((w) => !AREA_STOPWORDS.has(w) && w !== cityLower);
    const candidate = words.join(" ").trim();
    // Require a real, specific-looking word — not just leftover filler.
    if (candidate.length >= 3 && !cityLower.includes(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

type SearchCategory = "Hotel" | "Shortlet" | "Car Rental" | "Private Jet";

// Ordered so that within a single mention, the more specific term (e.g. a named
// jet model) doesn't get shadowed by a generic one — but across DIFFERENT
// mentions in the same text, the term that occurs latest always wins (see
// detectCategory below), which is what lets a customer switch categories
// mid-conversation instead of getting stuck on whatever they asked for first.
const CATEGORY_TERMS: [RegExp, SearchCategory][] = [
  // "room(s)" is deliberately excluded here — it's a room-COUNT word, not a
  // category word (shortlets have rooms too), and since it often trails a
  // sentence ("shortlet ... 2 rooms") it would otherwise win the last-mention
  // race and silently override an explicit category the customer just stated.
  [/\bhotels?\b/i, "Hotel"], [/\bsuites?\b/i, "Hotel"], [/\bstays?\b/i, "Hotel"], [/\blodge\b/i, "Hotel"],
  [/\bshortlets?\b/i, "Shortlet"], [/\bapartments?\b/i, "Shortlet"], [/\bvillas?\b/i, "Shortlet"], [/\bpenthouses?\b/i, "Shortlet"], [/\bduplex(es)?\b/i, "Shortlet"],
  [/\bcars?\b/i, "Car Rental"], [/\bsuvs?\b/i, "Car Rental"], [/\bprado\b/i, "Car Rental"], [/\bg63\b/i, "Car Rental"], [/\bg-wagon\b/i, "Car Rental"], [/\bchauffeur\b/i, "Car Rental"], [/rental car/i, "Car Rental"], [/\bride\b/i, "Car Rental"], [/\bbus(es)?\b/i, "Car Rental"], [/\btrucks?\b/i, "Car Rental"], [/\bdelivery\b/i, "Car Rental"], [/\blogistics\b/i, "Car Rental"],
  [/\bjets?\b/i, "Private Jet"], [/charter flight/i, "Private Jet"], [/charter a plane/i, "Private Jet"], [/private plane/i, "Private Jet"], [/private aviation/i, "Private Jet"], [/\bgulfstream\b/i, "Private Jet"], [/\bbombardier\b/i, "Private Jet"], [/\bcitation\b/i, "Private Jet"], [/\bembraer\b/i, "Private Jet"], [/challenger 350/i, "Private Jet"],
];

// Finds the character index of the LAST match of `re` in `text`, or -1 if none.
function lastMatchIndex(text: string, re: RegExp): number {
  const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let lastIndex = -1;
  let m: RegExpExecArray | null;
  while ((m = global.exec(text)) !== null) {
    lastIndex = m.index;
    if (m[0].length === 0) global.lastIndex++;
  }
  return lastIndex;
}

// Whichever category term appears LATEST in the text wins — this is what lets
// "I need a hotel" followed later by "actually, show me a shortlet instead"
// (or any later message naming a different category) actually switch category
// instead of getting stuck on the first thing mentioned in the conversation.
function detectCategory(text: string): SearchCategory | undefined {
  let best: { category: SearchCategory; index: number } | undefined;
  for (const [pattern, category] of CATEGORY_TERMS) {
    const idx = lastMatchIndex(text, pattern);
    if (idx !== -1 && (!best || idx > best.index)) {
      best = { category, index: idx };
    }
  }
  return best?.category;
}

// Splits off anything after a connector word that introduces an additional,
// secondary ask ("...also I need a car") so it doesn't hijack the category
// detected from the customer's primary request.
function primaryClause(text: string): string {
  const connectorMatch = text.match(/\b(also|and also|plus i|as well as|additionally)\b/i);
  if (!connectorMatch || connectorMatch.index === undefined) return text;
  return text.slice(0, connectorMatch.index);
}

function parseQuery(queryText: string, latestMsg?: string): ParsedQuery {
  const lowerQuery = queryText.toLowerCase();
  const lowerLatest = (latestMsg ?? queryText).toLowerCase();

  const unlistedRequested = UNLISTED_KEYWORD_PATTERNS.some((p) => p.test(lowerQuery));

  const city = detectCity(lowerQuery);
  const area = detectArea(lowerQuery, city);

  // Whatever category the customer names in their MOST RECENT message always
  // wins — that's what lets someone ask for a hotel, then later switch to a
  // shortlet or a jet, without staying stuck on the category from earlier in
  // the conversation. Only fall back to scanning the full conversation history
  // if the latest message doesn't name a category at all (e.g. "under 150k"
  // on its own, which should keep whatever category was already established).
  // primaryClause still protects against a secondary ask ("...also I need a
  // car") hijacking the category within that one latest message.
  const category =
    detectCategory(primaryClause(lowerLatest)) ??
    detectCategory(lowerLatest) ??
    detectCategory(primaryClause(lowerQuery)) ??
    detectCategory(lowerQuery);

  let maxPrice: number | undefined;
  const kMatches = [...lowerQuery.matchAll(/(\d+)\s*k\b/gi)];
  if (kMatches.length > 0) {
    maxPrice = parseInt(kMatches[kMatches.length - 1][1], 10) * 1000;
  } else {
    const rawNumMatches = [...lowerQuery.matchAll(/(?:under|below|less than|budget of|max)\s*(?:₦|naira)?\s*([\d,]+)/gi)];
    if (rawNumMatches.length > 0) {
      maxPrice = parsePrice(rawNumMatches[rawNumMatches.length - 1][1]);
    }
  }

  let roomCount: number | undefined;
  const roomMatch = lowerQuery.match(/(\d+)\s*(?:rooms?|bedrooms?)\b/i);
  if (roomMatch) {
    const n = parseInt(roomMatch[1], 10);
    if (n > 0 && n <= 20) roomCount = n;
  }

  const tokens = lowerQuery
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .filter((t) => !["under", "below", "hotel", "hotels", "stay", "stays", "best", "find", "looking", "need", "want", "please", "like", "with", "for"].includes(t));

  return { city, area, category, maxPrice, roomCount, unlistedRequested, tokens };
}

// ---------------------------------------------------------------------------
// Tiered catalog search — always relaxes constraints instead of dead-ending.
// Priority: exact -> relax price -> relax city -> relax both -> relax category
// (category is relaxed last since it's usually the hardest requirement).
// ---------------------------------------------------------------------------

type SearchTier =
  | "exact"
  | "price-relaxed"
  | "location-relaxed"
  | "location-and-price-relaxed"
  | "category-relaxed"
  | "category-and-price-relaxed"
  | "popular";

interface SearchResult {
  tier: SearchTier;
  items: CatalogItem[];
  hasMore: boolean;
  city?: string;
  area?: string;
  areaConfirmed: boolean;
  category?: string;
  maxPrice?: number;
  roomCount?: number;
  unlistedRequested: boolean;
}

// A small, deliberately conservative set of well-established real-world
// landmark associations — not a general distance/proximity model. Each entry
// here is public, verifiable geography (e.g. the University of Port Harcourt
// is in Choba), not a guess about which street is closer to which. Only add
// entries here that are genuinely certain.
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

// A customer asking for a specific amenity ("PS5", "pool", "wifi") deserves an
// honest answer about whether that actually exists anywhere in the relevant
// pool — not silence that could be read as confirmation. Checked against both
// highlights and description text, since most listings only have the latter.
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

// Returns the labels of any explicitly-requested amenities that don't appear
// anywhere in the relevant city/category pool — i.e. things we genuinely
// cannot back up, not just things absent from the 3 cards shown this turn.
function findUnconfirmedAmenities(rawQuery: string, city: string | undefined, category: string | undefined): string[] {
  const requested = AMENITY_TERMS.filter((a) => a.requestPatterns.some((p) => p.test(rawQuery)));
  if (requested.length === 0) return [];

  const pool = CATALOG_ITEMS.filter(
    (i) => (!city || i.city.toLowerCase() === city.toLowerCase()) && (!category || i.category.toLowerCase() === category.toLowerCase())
  );

  return requested
    .filter((a) => {
      const textPool = pool.map((i) => `${i.description} ${i.highlights.join(" ")}`.toLowerCase());
      return !textPool.some((text) => a.catalogTerms.some((term) => text.includes(term)));
    })
    .map((a) => a.label);
}

// Signals of an appealing, high-ambience property, mined from name/description/
// highlights text since the catalog has no separate rating field.
const AMBIENCE_KEYWORDS = [
  "luxury", "luxurious", "premium", "exquisite", "elegant", "elegance", "boutique",
  "exclusive", "majestic", "grandeur", "scenic", "serene", "tranquil", "panoramic",
  "ocean view", "penthouse", "presidential", "executive", "vip", "prestige",
  "sophistication", "refined", "bespoke", "world-class", "ultra-modern", "smart home",
  "ambiance", "ambience", "grand", "opulent", "chic", "stylish", "plush", "lavish",
  "diplomatic", "5-star", "5 star", "4-star", "4 star", "pool", "spa"
];

// Capped so a keyword-rich description can never, on its own, outweigh how
// close a listing's price actually is to a budget the customer stated —
// ambience should break ties, not override the customer's stated number.
function ambienceScore(item: CatalogItem): number {
  const text = `${item.name} ${item.description} ${item.highlights.join(" ")}`.toLowerCase();
  let score = 0;
  for (const kw of AMBIENCE_KEYWORDS) {
    if (text.includes(kw)) score += 4;
  }
  return Math.min(score, 12);
}

function scoreAndSort(pool: CatalogItem[], query: ParsedQuery): CatalogItem[] {
  const scored = pool.map((item) => {
    let score = 0;
    const itemText = `${item.name} ${item.location} ${item.city} ${item.category} ${item.description} ${item.highlights.join(" ")}`.toLowerCase();

    // Capped for the same reason as ambience below — relevance keywords should
    // break ties between similarly-priced options, not overrule the customer's
    // actual stated budget.
    const tokenMatches = query.tokens.filter((token) => itemText.includes(token)).length;
    score += Math.min(tokenMatches * 3, 12);

    score += ambienceScore(item);

    // A genuine neighborhood match (e.g. the customer said "Choba" and this
    // listing's real address contains "Choba") should dominate the ranking —
    // it's a much stronger signal than city-level or keyword relevance.
    if (areaMatches(item, query.area)) score += 100;

    const price = parsePrice(item.price);
    if (query.maxPrice && price > 0) {
      // Prefer items closest to (at or just under/over) the stated budget —
      // weighted heavily enough that it always wins over ambience/keyword
      // scoring, so a customer who says "under 50k" gets options near 50k,
      // not whatever cheap listing happens to have the most luxury buzzwords.
      const distance = Math.abs(price - query.maxPrice);
      score += Math.max(0, 60 - distance / 1000);
    } else if (!query.maxPrice && price > 0) {
      // No budget stated — lean toward the more premium/expensive end rather
      // than an arbitrary or cheapest-first ordering.
      score += Math.min(15, price / 20000);
    }

    if (item.badge) score += 1;

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

function searchCatalog(queryText: string, excludeIds: string[] = [], latestMsg?: string): SearchResult {
  const query = parseQuery(queryText, latestMsg);
  const { city, area, category, maxPrice, roomCount, unlistedRequested } = query;

  const cityOk = (item: CatalogItem) => !city || item.city.toLowerCase() === city.toLowerCase();
  const categoryOk = (item: CatalogItem) => !category || item.category.toLowerCase() === category.toLowerCase();
  // Items with no fixed price ("price on request") never count as satisfying a
  // stated budget — we can't claim they fit when we don't actually know the price.
  const priceOk = (item: CatalogItem) => !maxPrice || (parsePrice(item.price) > 0 && parsePrice(item.price) <= maxPrice);

  // Never re-show something already recommended earlier in this conversation
  // (across this whole request cycle, including previous "view more" pages)
  // unless the pool genuinely has nothing fresh left to offer. Also reports
  // whether more fresh items exist beyond the 3 returned, so the client can
  // offer a real "View More" action instead of guessing.
  const rankPool = (pool: CatalogItem[]): { items: CatalogItem[]; hasMore: boolean } => {
    const fresh = excludeIds.length === 0 ? pool : pool.filter((i) => !excludeIds.includes(i.id));
    const effectivePool = fresh.length > 0 ? fresh : pool;
    const sorted = scoreAndSort(effectivePool, query);
    const items = sorted.slice(0, 3);
    // Only genuinely-fresh items count toward "more to show" — if we already
    // fell back to repeats above, there's nothing new left to page to.
    const hasMore = fresh.length > items.length;
    return { items, hasMore };
  };

  // A named neighborhood takes priority over budget: a genuinely nearby match
  // is more useful than an on-budget hotel in the wrong part of the city, so
  // this is checked before the normal city/price/category tier ladder — and
  // it only fires when a real match exists, never a guess.
  if (area) {
    const areaPool = CATALOG_ITEMS.filter((i) => cityOk(i) && categoryOk(i) && areaMatches(i, area));
    if (areaPool.length > 0) {
      const { items, hasMore } = rankPool(areaPool);
      const allWithinBudget = items.every((i) => priceOk(i));
      return {
        tier: allWithinBudget ? "exact" : "price-relaxed",
        items,
        hasMore,
        city,
        area,
        areaConfirmed: true,
        category,
        maxPrice,
        roomCount,
        unlistedRequested,
      };
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
    if (!requiresConstraint) continue; // skip tiers that don't relax anything new
    const pool = CATALOG_ITEMS.filter(predicate);
    if (pool.length > 0) {
      const { items, hasMore } = rankPool(pool);
      // A neighborhood was requested — only claim it's "confirmed" if a
      // returned listing's real address actually contains it. Otherwise these
      // are honest city-wide fallbacks, and the message must say so.
      const areaConfirmed = !area || items.some((i) => areaMatches(i, area));
      return { tier, items, hasMore, city, area, areaConfirmed, category, maxPrice, roomCount, unlistedRequested };
    }
  }

  // Final guaranteed-non-empty fallback: most popular items overall.
  const { items: popularPool, hasMore: popularHasMore } = rankPool(CATALOG_ITEMS);
  const areaConfirmed = !area || popularPool.some((i) => areaMatches(i, area));
  return { tier: "popular", items: popularPool, hasMore: popularHasMore, city, area, areaConfirmed, category, maxPrice, roomCount, unlistedRequested };
}

// ---------------------------------------------------------------------------
// Message generation — deterministic, on-brand, and never a dead end.
// This is the message actually used unless Gemini is configured and produces
// a safe rephrasing; either way, it's always safe by construction.
// ---------------------------------------------------------------------------

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function buildFallbackMessage(result: SearchResult): string {
  const { tier, items, city, area, areaConfirmed, category, maxPrice, unlistedRequested } = result;
  const catLabel = category ? category.toLowerCase() : "stay";
  const budgetLabel = maxPrice ? formatNaira(maxPrice) : undefined;
  const actualCategories = [...new Set(items.map((i) => i.category))].join(" & ");

  const inCity = city ? ` in ${city}` : "";
  const withinBudget = budgetLabel ? ` within your ${budgetLabel} budget` : "";

  if (unlistedRequested) {
    return `That specific property isn't part of Elite Booking's curated portfolio, but here are our top-rated ${catLabel} options${inCity} that deliver a similarly excellent experience.`;
  }

  // Never claim a neighborhood match we can't actually back up against real
  // listing addresses — an honest city-wide fallback beats a confident-sounding
  // guess. This takes priority over the tier phrasing below.
  if (area && !areaConfirmed) {
    return `I don't have listings confirmed specifically in ${area} yet, so here are the closest verified options${inCity}${withinBudget}. I can flag ${area} specifically to our team to double-check availability there if you'd like.`;
  }

  switch (tier) {
    case "exact":
      return area && areaConfirmed
        ? `Here's the closest verified match to ${area}${inCity}${withinBudget} — ready for direct booking below.`
        : `Here are excellent ${catLabel} options${inCity}${withinBudget} — all ready for direct booking below.`;
    case "price-relaxed":
      return area && areaConfirmed
        ? `Here's the closest verified option to ${area}${inCity} — it's just outside your ${budgetLabel} budget, but it's the nearest real match we have confirmed rather than an arbitrary pick. Happy to check further out if you'd like more choices.`
        : `Here are the best ${catLabel} options${inCity} — just outside your ${budgetLabel} budget, but excellent value for what's included. Happy to check a different price range if you'd like.`;
    case "location-relaxed":
      return budgetLabel
        ? `Here are outstanding ${catLabel} options within your ${budgetLabel} budget in other prime locations. If you'd prefer ${city} specifically, I can also check a higher budget there — just let me know.`
        : `Here are outstanding ${catLabel} options in other prime locations that are extremely popular with our guests. If you'd prefer ${city} specifically, let me know and I'll look into options there.`;
    case "location-and-price-relaxed":
      return `Here are our top ${catLabel} recommendations across our portfolio. Share your preferred city or budget and I'll narrow these down further.`;
    case "category-relaxed":
      return `Here are Elite Booking's top picks${inCity}${withinBudget} — these are ${actualCategories} options, and they're extremely popular with clients${city ? " booking in this area" : ""}.`;
    case "category-and-price-relaxed":
      return `Here are our most popular listings${inCity} across all categories — take a look, or tell me more about what you're after and I'll refine these for you.`;
    case "popular":
    default:
      return `Here are some of Elite Booking's most popular stays and services right now. Share your preferred city, budget, or dates and I'll tailor these recommendations for you.`;
  }
}

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

async function polishMessage(baseMessage: string, result: SearchResult, conversationContext: string): Promise<string> {
  const candidateNames = result.items.map((i) => i.name);

  const systemPrompt = `# ELITE BOOKING CONCIERGE — MESSAGE POLISH POLICY

You are the Stay Concierge for Elite Bookings. You are given a FACTUALLY CORRECT base message.
Your ONLY job is to rephrase it to sound warmer, more natural, and more professional — a skilled
human concierge's voice. You are NOT inventing new information.

BASE MESSAGE (rephrase this, do not contradict or add facts to it):
"${baseMessage}"

RULES (violating any of these means your output will be discarded):
1. Do not name any specific property, hotel, brand, or company in your rephrasing — not even ones from our own catalog (${candidateNames.join(", ") || "none"}). Refer to them only generically ("these options", "the listings below").
2. Never mention any external hotel, resort, platform, or service.
3. Never say "we don't have", "couldn't find", "no match", "not available", or any similar dead-end phrase. Always sound like you are actively recommending something.
4. Keep it to 1-2 warm, concise sentences.
5. Output ONLY the rephrased message text as plain text. No JSON, no quotes, no preamble.`;

  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [{ role: "user", parts: [{ text: conversationContext || baseMessage }] }],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.4,
    },
  });

  const text = (response.text || "").trim();
  if (!text || messageIsUnsafe(text, CATALOG_ITEMS)) {
    return baseMessage;
  }
  return text;
}

// ---------------------------------------------------------------------------
// Request handler — framework-agnostic so both the local Express dev server
// (server.ts) and the production Netlify Function (netlify/functions/concierge.ts)
// call this exact same logic. There is only one implementation of the concierge;
// only the thin adapter around it differs per host.
// ---------------------------------------------------------------------------

export interface ConciergeHandlerResult {
  statusCode: number;
  body: Record<string, unknown>;
}

export async function handleConciergeRequest(requestBody: any): Promise<ConciergeHandlerResult> {
  try {
    const { messages, excludeIds, pendingOffer } = requestBody || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, body: { error: "Messages array is required." } };
    }

    const lastUserMsg = messages
      .filter((m: any) => m.role === "user")
      .map((m: any) => (m.content || "").toString())
      .join(" ");

    // The single most recent turn, not the whole accumulated conversation —
    // needed to tell "yes please" apart from a fresh search request.
    const latestUserMsg = (messages[messages.length - 1]?.content || "").toString();

    const safeExcludeIds: string[] = Array.isArray(excludeIds)
      ? excludeIds.filter((id: any) => typeof id === "string")
      : [];

    // If the last thing the concierge said was a conditional offer ("I can
    // flag this to our team if you'd like") and the customer just said yes,
    // actually act on it instead of re-running a search from scratch.
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

    const intent = analyzeIntent(lastUserMsg);
    const parsedForCity = parseQuery(lastUserMsg, latestUserMsg);
    const guaranteeCaveat = intent.guaranteeRequest
      ? "I'm not able to guarantee things outside our direct control, like exact timing at a property — but here's what I can do: "
      : "";

    const formatRec = (item: CatalogItem) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      city: item.city,
      location: item.location,
      price: !item.price ? "Price on request" : item.price.startsWith("₦") ? item.price : `₦${item.price}`,
      badge: item.badge || "Verified Stay",
      image: item.image,
      highlights: item.highlights,
      description: item.description,
      tiers: item.tiers,
    });

    // --- Priority 1: safety concerns always win, no matter what else is in the message.
    if (intent.safetyConcern) {
      return {
        statusCode: 200,
        body: {
          message: `Your safety comes first. I'm escalating this to an Elite Booking agent right now so a human can help you immediately. If you're in danger, please also contact local emergency services or reach us directly on WhatsApp at ${ELITE_WHATSAPP}.`,
          recommendations: [],
          handoff: {
            required: true,
            priority: "urgent",
            category: "Safety Concern",
            services: [],
            summary: buildHandoffSummary(lastUserMsg, "Safety Concern", parsedForCity.city, []),
          } as HandoffInfo,
          nextStep: `Message us now: ${ELITE_WHATSAPP_LINK}`,
        },
      };
    }

    // --- Priority 2: payment problems — never guess at financial state.
    if (intent.paymentIssue) {
      return {
        statusCode: 200,
        body: {
          message: "I don't have access to live payment or refund records, so I can't confirm or process this myself — but I don't want you waiting on this. I'm flagging it to our team right now for urgent verification.",
          recommendations: [],
          handoff: {
            required: true,
            priority: "urgent",
            category: "Payment / Refund Issue",
            services: [],
            summary: buildHandoffSummary(lastUserMsg, "Payment / Refund Issue", parsedForCity.city, []),
          } as HandoffInfo,
          nextStep: `An agent will follow up shortly. For anything urgent, message us directly: ${ELITE_WHATSAPP_LINK}`,
        },
      };
    }

    // --- Priority 3: something is actively wrong with a stay/service in progress.
    if (intent.problemReport) {
      return {
        statusCode: 200,
        body: {
          message: "I'm really sorry — that's not the experience we want for you. I don't have live access to the property's systems to fix this myself, so I've flagged it to our team for immediate follow-up.",
          recommendations: [],
          handoff: {
            required: true,
            priority: "urgent",
            category: "Property / Service Problem",
            services: [],
            summary: buildHandoffSummary(lastUserMsg, "Property / Service Problem", parsedForCity.city, []),
          } as HandoffInfo,
          nextStep: `For the fastest response, message us directly: ${ELITE_WHATSAPP_LINK}`,
        },
      };
    }

    // --- Priority 4: vague frustration/anger without a specific matched problem.
    // Still must not default to cheerfully recommending hotels.
    if (intent.generalDistress) {
      return {
        statusCode: 200,
        body: {
          message: "I can hear this isn't going well, and I'm sorry about that. Let me get a member of our Elite Booking team to step in personally and sort this out for you right away.",
          recommendations: [],
          handoff: {
            required: true,
            priority: "urgent",
            category: "General Complaint",
            services: [],
            summary: buildHandoffSummary(lastUserMsg, "General Complaint", parsedForCity.city, []),
          } as HandoffInfo,
          nextStep: `For the fastest response, message us directly: ${ELITE_WHATSAPP_LINK}`,
        },
      };
    }

    // --- Confidential/internal info — decline and redirect, no escalation needed.
    if (intent.confidentialRequest) {
      return {
        statusCode: 200,
        body: {
          message: "I'm not able to share internal pricing, commission, or partner details — that's confidential. I'd be glad to help with your booking or answer questions about our published rates and services instead.",
          recommendations: [],
          nextStep: "Ask me about hotels, shortlets, car rentals, or concierge services any time.",
        },
      };
    }

    // --- Clearly outside what Elite Booking offers.
    if (intent.outOfScope) {
      return {
        statusCode: 200,
        body: {
          message: "That's outside what Elite Booking currently handles — we focus on hotels, shortlets, car rentals, and concierge services within Nigeria. Happy to help you with any of those instead.",
          recommendations: [],
          nextStep: "Tell me your city, dates, or what you need and I'll find the best options.",
        },
      };
    }

    // --- Booking changes (cancel/reschedule/rename/extend/confirm) need a human
    // to actually verify with the property — the concierge has no booking database.
    if (intent.bookingChange) {
      return {
        statusCode: 200,
        body: {
          message: `${guaranteeCaveat}I can't change or confirm an existing booking myself since that has to be verified directly with the property. I'm passing this to our team now so they can action it for you.`,
          recommendations: [],
          handoff: {
            required: true,
            priority: "normal",
            category: "Booking Change Request",
            services: [],
            summary: buildHandoffSummary(lastUserMsg, "Booking Change Request", parsedForCity.city, []),
          } as HandoffInfo,
          nextStep: `Our team will confirm with the property and follow up. For anything urgent, message us: ${ELITE_WHATSAPP_LINK}`,
        },
      };
    }

    // --- A customer just mentioning something already booked — be proactively
    // helpful rather than running a property search against a statement.
    if (intent.alreadyBooked && intent.services.length === 0) {
      return {
        statusCode: 200,
        body: {
          message: "Wonderful! Would you like help arranging airport pickup, a driver, meals, groceries, or anything else for your stay?",
          recommendations: [],
          nextStep: "Just tell me what you need and I'll take it from there.",
        },
      };
    }

    // --- Everything else: normal catalog search, optionally alongside concierge
    // add-on services mentioned in the same message (multi-intent handling).
    const hasPropertySearchIntent = !!parsedForCity.category || !!parsedForCity.city || intent.services.length === 0;
    const result = hasPropertySearchIntent ? searchCatalog(lastUserMsg, safeExcludeIds, latestUserMsg) : null;
    const baseMessage = result ? buildFallbackMessage(result) : "";

    let finalMessage = baseMessage;
    if (result) {
      // Catalog search + templated message are 100% deterministic and safe on
      // their own. Gemini is an optional polish layer — if unavailable or it
      // fails for any reason, we simply keep the deterministic message.
      try {
        finalMessage = await polishMessage(baseMessage, result, lastUserMsg);
      } catch (aiErr) {
        console.warn("Gemini polish unavailable, using deterministic message:", aiErr);
      }
    }

    let handoff: HandoffInfo | undefined;
    if (intent.services.length > 0) {
      const servicesNote = `I'm also passing your request for ${intent.services.join(", ")} to our concierge team, who'll confirm availability and pricing with you directly.`;
      finalMessage = finalMessage ? `${finalMessage} ${servicesNote}` : servicesNote;
      handoff = {
        required: true,
        priority: "normal",
        category: "Concierge Service Request",
        services: intent.services,
        summary: buildHandoffSummary(lastUserMsg, "Concierge Service Request", parsedForCity.city, intent.services),
      };
    }

    if (guaranteeCaveat && result) {
      finalMessage = `${guaranteeCaveat}${finalMessage}`;
    }

    // Be upfront when something explicitly asked for isn't confirmed anywhere
    // in the relevant listings — silence here could read as confirmation.
    if (result) {
      const unconfirmedAmenities = findUnconfirmedAmenities(lastUserMsg, parsedForCity.city, parsedForCity.category);
      if (unconfirmedAmenities.length > 0) {
        finalMessage = `${finalMessage} I don't see ${unconfirmedAmenities.join(" or ")} confirmed for any of our current ${parsedForCity.city || "Nigeria"} options — happy to double-check with our team if that's essential for you.`;
      }
    }

    if (!finalMessage) {
      finalMessage = "I'd love to help — could you tell me a bit more about what you're looking for (city, dates, or type of stay)?";
    }

    // If we told the customer we could flag their neighborhood to the team,
    // remember that offer so a "yes" on the next turn can actually act on it.
    const newPendingOffer: PendingOffer | undefined =
      result && result.area && !result.areaConfirmed
        ? { type: "area_verification", area: result.area, city: result.city }
        : undefined;

    return {
      statusCode: 200,
      body: {
        message: finalMessage,
        recommendations: result ? result.items.map(formatRec) : [],
        tier: result?.tier,
        roomCount: result?.roomCount,
        hasMore: result?.hasMore || false,
        handoff,
        pendingOffer: newPendingOffer,
        nextStep: result
          ? "Select 'Book This' on any option below to request your reservation."
          : "Let me know your city, dates, or what you need and I'll take it from there.",
      },
    };
  } catch (error: any) {
    console.error("Error in AI Concierge endpoint:", error);
    return {
      statusCode: 500,
      body: { error: error.message || "An error occurred while communicating with the AI Concierge." },
    };
  }
}
