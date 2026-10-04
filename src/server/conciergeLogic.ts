import type { CatalogItem } from "../data/catalog";

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
export const UNLISTED_KEYWORDS = [
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
export const FORBIDDEN_DEADEND_PHRASES = [
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
// leads with a dead end instead of a recommendation. `extraKnownNames` lets
// callers with a second inventory pool (e.g. Discovery's Vehicle names, which
// aren't in CatalogItem) extend the known-listing check without duplicating it.
export function messageIsUnsafe(message: string, catalogItems: CatalogItem[], extraKnownNames: string[] = []): boolean {
  if (UNLISTED_KEYWORD_PATTERNS.some((p) => p.test(message))) return true;
  if (FORBIDDEN_PHRASE_PATTERNS.some((p) => p.test(message))) return true;

  const matches = message.match(PROPER_NOUN_PATTERN) || [];
  for (const match of matches) {
    const cleanMatch = match.toLowerCase().trim();
    const isKnownListing = catalogItems.some((item) => {
      const cleanName = item.name.toLowerCase().trim();
      return cleanName.includes(cleanMatch) || cleanMatch.includes(cleanName);
    }) || extraKnownNames.some((name) => {
      const cleanName = name.toLowerCase().trim();
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

export const ELITE_WHATSAPP = "+234 707 225 3857";
export const ELITE_WHATSAPP_LINK = "https://wa.me/2347072253857";

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
  /is my booking confirmed/i, /confirm(ed)? my (booking|reservation)/i,
  /change (my|the) room/i, /different room/i, /\broom change\b/i,
  /(upgrade|downgrade|swap|switch) (my|the) room/i
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

export interface HandoffInfo {
  required: boolean;
  priority: "urgent" | "normal";
  category: string;
  services: string[];
  summary: string;
}

export function buildHandoffSummary(rawQuery: string, category: string, city: string | undefined, services: string[]): string {
  const lines = [
    `CUSTOMER REQUEST:\n${category}`,
    city ? `LOCATION:\n${city}` : null,
    services.length > 0 ? `SERVICES REQUESTED:\n${services.join(", ")}` : null,
    `CUSTOMER MESSAGE:\n"${rawQuery.trim()}"`,
    `STATUS:\nHuman verification required`,
  ].filter((l): l is string => Boolean(l));
  return lines.join("\n\n");
}

// ---------------------------------------------------------------------------
// Query parsing
// ---------------------------------------------------------------------------

export function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

export interface ParsedQuery {
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
export function detectCity(text: string): "Abuja" | "Lagos" | "Port Harcourt" | undefined {
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

export function detectArea(text: string, city: "Abuja" | "Lagos" | "Port Harcourt" | undefined): string | undefined {
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

export type SearchCategory = "Hotel" | "Shortlet" | "Car Rental" | "Private Jet";

// Ordered so that within a single mention, the more specific term (e.g. a named
// jet model) doesn't get shadowed by a generic one — but across DIFFERENT
// mentions in the same text, the term that occurs latest always wins (see
// detectCategory below), which is what lets a customer switch categories
// mid-conversation instead of getting stuck on whatever they asked for first.
const CATEGORY_TERMS: [RegExp, SearchCategory][] = [
  // "room" only counts as a Hotel signal when it's NOT part of a room-COUNT
  // phrase ("2 rooms", "3 bedrooms") — shortlets have rooms too, so "shortlet
  // ... 2 rooms" must not let "rooms" win the last-mention race and override
  // the category the customer actually stated. But a bare "I need a room" (no
  // preceding number) is a genuine, common way to mean "a hotel" and should
  // count — excluding it entirely meant "room above 60k" matched no category
  // at all and silently fell back to whatever was mentioned earlier in the chat.
  [/\bhotels?\b/i, "Hotel"], [/\bsuites?\b/i, "Hotel"], [/\bstays?\b/i, "Hotel"], [/\blodge\b/i, "Hotel"], [/(?<!\d)(?<!\d )\brooms?\b/i, "Hotel"],
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

export function parseQuery(queryText: string, latestMsg?: string): ParsedQuery {
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
    const { messages } = requestBody || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, body: { error: "Messages array is required." } };
    }

    const lastUserMsg = messages
      .filter((m: any) => m.role === "user")
      .map((m: any) => (m.content || "").toString())
      .join(" ");

    const intent = analyzeIntent(lastUserMsg);
    const parsedForCity = parseQuery(lastUserMsg);
    const guaranteeCaveat = intent.guaranteeRequest
      ? "I'm not able to guarantee things outside our direct control, like exact timing at a property — but here's what I can do: "
      : "";

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

    // --- Everything else: Concierge no longer browses/recommends listings —
    // that's the Discovery Assistant's job now. If a concierge add-on service
    // was also mentioned, still flag it to the team; otherwise just point the
    // guest toward Discovery for browsing, and stay available for booking support.
    let finalMessage: string;
    let handoff: HandoffInfo | undefined;
    if (intent.services.length > 0) {
      finalMessage = `I'm passing your request for ${intent.services.join(", ")} to our concierge team, who'll confirm availability and pricing with you directly.`;
      handoff = {
        required: true,
        priority: "normal",
        category: "Concierge Service Request",
        services: intent.services,
        summary: buildHandoffSummary(lastUserMsg, "Concierge Service Request", parsedForCity.city, intent.services),
      };
    } else {
      finalMessage = "I want to make sure this actually gets sorted for you — I'm passing it to our team directly. If you're instead looking to browse new options, our Discovery Assistant can help with that too.";
      handoff = {
        required: true,
        priority: "normal",
        category: "General Booking Support",
        services: [],
        summary: buildHandoffSummary(lastUserMsg, "General Booking Support", parsedForCity.city, []),
      };
    }

    if (guaranteeCaveat) {
      finalMessage = `${guaranteeCaveat}${finalMessage}`;
    }

    return {
      statusCode: 200,
      body: {
        message: finalMessage,
        recommendations: [],
        handoff,
        nextStep: "Let me know if there's anything about an existing booking I can help with.",
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
