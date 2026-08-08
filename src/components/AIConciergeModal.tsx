import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, X, Send, Crown, MapPin,
  CheckCircle2, Tag, ShieldCheck, Loader2, AlertCircle, PhoneCall,
  Briefcase, Calendar, Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CATALOG_ITEMS, CatalogItem } from '../data/catalog';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

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

interface AIConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome-1',
  role: 'assistant',
  content: {
    text: "Welcome to Elite AI Concierge. Tell me your city, budget, or the kind of stay you're after, and I'll recommend the best options from our portfolio, instantly.",
    recommendations: CATALOG_ITEMS.slice(0, 2).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      city: item.city,
      location: item.location,
      price: !item.price ? 'Price on request' : `₦${item.price}`,
      badge: item.badge || 'Featured',
      image: item.image,
      highlights: item.highlights,
      description: item.description,
      tiers: item.tiers
    })),
    nextStep: "Select 'Book This' on any option below to request your reservation."
  },
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

// Defense-in-depth: even though the server only ever returns real catalog items,
// re-validate every recommendation against CATALOG_ITEMS before rendering, so a
// malformed or unexpected API response can never surface an unlisted property.
function sanitizeRecommendations(recs: any[]): RecommendationItem[] {
  const matchedItems: CatalogItem[] = [];

  if (Array.isArray(recs)) {
    for (const rec of recs) {
      if (!rec) continue;
      const recId = (rec.id || '').toLowerCase().trim();
      const recName = (rec.name || '').toLowerCase().trim();

      const exactMatch = CATALOG_ITEMS.find((c) => {
        if (recId && c.id.toLowerCase() === recId) return true;
        if (recName && c.name.toLowerCase() === recName) return true;
        return false;
      });

      if (exactMatch && !matchedItems.some((m) => m.id === exactMatch.id)) {
        matchedItems.push(exactMatch);
      }
    }
  }

  // If nothing in the response matched our catalog, never show nothing —
  // fall back to a few genuine catalog picks rather than an empty result.
  const finalItems = matchedItems.length > 0 ? matchedItems : CATALOG_ITEMS.slice(0, 3);

  return finalItems.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    city: item.city,
    location: item.location,
    price: !item.price ? 'Price on request' : item.price.startsWith('₦') ? item.price : `₦${item.price}`,
    badge: item.badge || 'Verified Stay',
    image: item.image,
    highlights: item.highlights,
    description: item.description,
    tiers: item.tiers
  }));
}

function parseAssistantReply(reply: any): MessageContent {
  if (typeof reply === 'object' && reply !== null) {
    // `tier` is only ever set when the server actually ran a catalog search.
    // For escalation/confidential/out-of-scope replies, recommendations is
    // intentionally empty — don't backfill it with unrelated catalog items.
    const ranPropertySearch = typeof reply.tier === 'string';
    return {
      text: reply.message || "Here are our top recommendations from Elite Booking:",
      recommendations: ranPropertySearch ? sanitizeRecommendations(reply.recommendations) : [],
      nextStep: reply.nextStep,
      roomCount: typeof reply.roomCount === 'number' ? reply.roomCount : undefined,
      handoff: reply.handoff && reply.handoff.required ? {
        required: true,
        priority: reply.handoff.priority === 'urgent' ? 'urgent' : 'normal',
        category: String(reply.handoff.category || 'Request'),
        services: Array.isArray(reply.handoff.services) ? reply.handoff.services.filter((s: any) => typeof s === 'string') : [],
        summary: String(reply.handoff.summary || '')
      } : undefined,
      pendingOffer: reply.pendingOffer && reply.pendingOffer.type === 'area_verification' && typeof reply.pendingOffer.area === 'string'
        ? { type: 'area_verification', area: reply.pendingOffer.area, city: typeof reply.pendingOffer.city === 'string' ? reply.pendingOffer.city : undefined }
        : undefined,
      hasMore: ranPropertySearch && reply.hasMore === true
    };
  }
  return {
    text: "Here are our top recommendations from Elite Booking:",
    recommendations: sanitizeRecommendations([])
  };
}

export const AIConciergeModal: React.FC<AIConciergeModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bookingProperty, setBookingProperty] = useState<RecommendationItem | null>(null);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestCount, setGuestCount] = useState('2 Guests');
  const [numberOfRooms, setNumberOfRooms] = useState('1 Room');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [loadingMoreId, setLoadingMoreId] = useState<string | null>(null);

  // "Want me to handle your stay?" guided form — an alternative to typing a
  // free-text search. Submitting it builds a query and runs it through the
  // exact same search pipeline as normal chat, so every existing guardrail
  // (area honesty, amenity honesty, no-repeat, budget bias) still applies.
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planCity, setPlanCity] = useState<'Abuja' | 'Lagos' | 'Port Harcourt'>('Lagos');
  const [planArea, setPlanArea] = useState('');
  const [planCategory, setPlanCategory] = useState<'Hotel' | 'Shortlet' | 'Car Rental' | 'Private Jet'>('Hotel');
  const [planBudget, setPlanBudget] = useState('');
  const [planCheckIn, setPlanCheckIn] = useState('');
  const [planCheckOut, setPlanCheckOut] = useState('');
  const [planGuests, setPlanGuests] = useState('2 Guests');
  const [planRooms, setPlanRooms] = useState('1 Room');
  const [planFeatures, setPlanFeatures] = useState('');

  // Carried from the guided form into the booking form, so picking a card
  // afterward doesn't make the customer re-type dates/guests they already gave.
  const [plannedDefaults, setPlannedDefaults] = useState<{
    checkIn?: string; checkOut?: string; guestCount?: string; numberOfRooms?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    // If the concierge's last turn made a conditional offer ("I can flag this
    // to our team if you'd like"), carry it forward so a "yes" here can
    // actually be acted on server-side instead of just re-running a search.
    const lastMessage = messages[messages.length - 1];
    const activePendingOffer = lastMessage?.role === 'assistant' ? lastMessage.content.pendingOffer : undefined;

    const userMessage: Message = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: { text },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const payloadMessages = updatedMessages
        .filter((m) => m.role === 'user')
        .map((m) => ({ role: 'user', content: m.content.text }));

      // Tell the server what's already been shown in this conversation so it
      // avoids repeating the same recommendations on follow-up questions.
      const excludeIds = updatedMessages
        .filter((m) => m.role === 'assistant')
        .flatMap((m) => (m.content.recommendations || []).map((r) => r.id));

      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages, excludeIds, pendingOffer: activePendingOffer })
      });

      if (!res.ok) throw new Error('Server returned error response');

      const data = await res.json();
      const parsedContent = parseAssistantReply(data);
      // Remember what produced this search so "View More" can page through
      // additional fresh results for the exact same request later.
      if (parsedContent.hasMore) {
        parsedContent.sourceQuery = text;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-' + (Date.now() + 1),
          role: 'assistant',
          content: parsedContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error('Concierge request failed:', err);
      // Even on a network failure, still recommend something real rather than
      // showing a bare error — matches the "always recommend, never dead-end" policy.
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-err-' + Date.now(),
          role: 'assistant',
          content: {
            text: "Here are some of our most popular options while I reconnect:",
            recommendations: sanitizeRecommendations([])
          },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMore = async (messageId: string) => {
    const target = messages.find((m) => m.id === messageId);
    if (!target || !target.content.sourceQuery || loadingMoreId) return;

    setLoadingMoreId(messageId);
    try {
      const excludeIds = messages
        .filter((m) => m.role === 'assistant')
        .flatMap((m) => (m.content.recommendations || []).map((r) => r.id));

      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: target.content.sourceQuery }], excludeIds })
      });
      if (!res.ok) throw new Error('Server returned error response');

      const data = await res.json();
      const parsed = parseAssistantReply(data);

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.content.recommendations || [];
          const additions = (parsed.recommendations || []).filter((r) => !existing.some((e) => e.id === r.id));
          return {
            ...m,
            content: {
              ...m.content,
              recommendations: [...existing, ...additions],
              hasMore: parsed.hasMore
            }
          };
        })
      );
    } catch (err) {
      console.error('View more request failed:', err);
    } finally {
      setLoadingMoreId(null);
    }
  };

  const handleDirectBookingSubmit = async (e: React.FormEvent, method: 'whatsapp' | 'web') => {
    e.preventDefault();
    if (!bookingProperty || !guestName || !guestPhone) return;

    setIsSubmittingBooking(true);

    const isHotel = bookingProperty.category === 'Hotel';
    const needsQuantity = bookingProperty.category === 'Hotel' || bookingProperty.category === 'Shortlet' || bookingProperty.category === 'Car Rental';
    const quantityLabel = bookingProperty.category === 'Car Rental' ? 'Cars Needed' : 'Rooms Needed';

    const bookingDetails = {
      propertyId: bookingProperty.id,
      propertyName: bookingProperty.name,
      propertyLocation: bookingProperty.location,
      price: bookingProperty.price,
      guestName,
      guestPhone,
      checkIn: checkIn || 'Flexible',
      checkOut: checkOut || 'Flexible',
      guestCount,
      ...(needsQuantity ? { numberOfRooms } : {}),
      createdAt: new Date().toISOString(),
      source: 'AI Concierge'
    };

    try {
      await addDoc(collection(db, 'concierge_bookings'), bookingDetails);
    } catch (err) {
      console.warn('Firestore booking save notice:', err);
    }

    if (method === 'whatsapp') {
      const messageText = `Hello Elite Concierge! 👑\n\nI would like to book the following property recommended by AI Concierge:\n\n*Property:* ${bookingProperty.name}\n*Location:* ${bookingProperty.location}\n*Price:* ${bookingProperty.price}\n\n*Guest Details:*\n- Name: ${guestName}\n- Phone: ${guestPhone}\n- Check-in: ${checkIn || 'Flexible'}\n- Check-out: ${checkOut || 'Flexible'}\n- Guests: ${guestCount}${needsQuantity ? `\n- ${quantityLabel}: ${numberOfRooms}` : ''}\n\nPlease confirm availability and payment steps.`;
      const encodedMsg = encodeURIComponent(messageText);
      window.open(`https://wa.me/2347072253857?text=${encodedMsg}`, '_blank');
    }

    setIsSubmittingBooking(false);
    setBookingSuccess(true);
    confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });

    // Proactive follow-up: a personal concierge doesn't just take the booking
    // and go quiet — it looks for the next thing the guest will need.
    const nudgeText = isHotel || bookingProperty.category === 'Shortlet'
      ? "Wonderful — that's booked! Would you like help arranging airport pickup, a driver, or dinner reservations for your stay?"
      : "Wonderful — that's booked! Would you like help finding a place to stay as well, or anything else for your trip?";

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-nudge-' + Date.now(),
          role: 'assistant',
          content: { text: nudgeText },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 300);

    setTimeout(() => {
      setBookingSuccess(false);
      setBookingProperty(null);
      setGuestName('');
      setGuestPhone('');
      setCheckIn('');
      setCheckOut('');
      setNumberOfRooms('1 Room');
      setPlannedDefaults(null);
    }, 2200);
  };

  const openBooking = (rec: RecommendationItem) => {
    setBookingProperty(rec);
    const defaultQuantity = rec.category === 'Car Rental' ? '1 Car' : '1 Room';

    if (plannedDefaults) {
      // Came from the guided "handle my stay" form — reuse what was already given.
      setCheckIn(plannedDefaults.checkIn || '');
      setCheckOut(plannedDefaults.checkOut || '');
      setGuestCount(plannedDefaults.guestCount || '2 Guests');
      setNumberOfRooms(
        (rec.category === 'Hotel' || rec.category === 'Shortlet' || rec.category === 'Car Rental') && plannedDefaults.numberOfRooms
          ? plannedDefaults.numberOfRooms
          : defaultQuantity
      );
      return;
    }

    if (rec.category === 'Hotel' || rec.category === 'Shortlet') {
      // Smart pre-fill: if the customer already mentioned a room count in the
      // conversation (e.g. "3 rooms"), carry it straight into the booking form.
      const lastDetected = [...messages].reverse().find((m) => m.role === 'assistant' && m.content.roomCount)?.content.roomCount;
      setNumberOfRooms(lastDetected ? `${lastDetected} Room${lastDetected > 1 ? 's' : ''}` : '1 Room');
    } else {
      setNumberOfRooms(defaultQuantity);
    }
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parts: string[] = [planCategory.toLowerCase()];
    parts.push(planArea ? `in ${planArea}, ${planCity}` : `in ${planCity}`);
    if (planBudget.trim()) parts.push(`under ${planBudget.trim()}`);
    if (planFeatures.trim()) parts.push(`with ${planFeatures.trim()}`);
    if (planCategory === 'Hotel' || planCategory === 'Shortlet') {
      const roomNum = planRooms.match(/\d+/)?.[0];
      if (roomNum) parts.push(`${roomNum} rooms`);
    } else if (planCategory === 'Car Rental') {
      const carNum = planRooms.match(/\d+/)?.[0];
      if (carNum) parts.push(`${carNum} cars`);
    }

    setPlannedDefaults({
      checkIn: planCheckIn,
      checkOut: planCheckOut,
      guestCount: planGuests,
      numberOfRooms: planRooms
    });
    setShowPlanForm(false);
    handleSend(parts.join(' '));
  };

  const samplePrompts = [
    'Hotels in Abuja under ₦150k',
    'Luxury shortlet in Lekki Lagos',
    'Executive stays in Port Harcourt',
    'Car rental with chauffeur'
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-charcoal/70 backdrop-blur-md font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-cream border border-gold/30 rounded-[2rem] w-full max-w-3xl h-[92vh] max-h-[820px] shadow-2xl flex flex-col overflow-hidden relative"
        >
          {/* Header */}
          <div className="bg-charcoal text-cream px-6 py-4 flex items-center justify-between border-b border-gold/20 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold shadow-xs">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-lg font-serif font-medium text-cream tracking-wide">
                    Elite AI Concierge
                  </h3>
                  <span className="text-[9px] uppercase tracking-widest font-bold bg-gold/20 text-gold px-2 py-0.5 rounded-full border border-gold/30">
                    Smart Recommendations
                  </span>
                </div>
                <p className="text-[11px] text-cream/50">Instant visual property matching &amp; direct booking</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-cream/60 hover:text-gold hover:bg-cream/5 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* "Want me to handle your stay?" guided-form trigger */}
          <button
            onClick={() => setShowPlanForm(true)}
            className="flex-shrink-0 w-full flex items-center justify-between gap-3 bg-gold/10 hover:bg-gold/15 border-b border-gold/20 px-4 sm:px-6 py-2.5 transition-colors cursor-pointer group"
          >
            <span className="flex items-center gap-2 text-[12.5px] text-charcoal font-medium">
              <Briefcase className="w-3.5 h-3.5 text-gold flex-shrink-0" />
              Want me to handle your stay?
            </span>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-gold group-hover:translate-x-0.5 transition-transform">
              Let's do it →
            </span>
          </button>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-charcoal text-cream rounded-br-sm'
                      : 'bg-white border border-charcoal/10 text-charcoal rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.content.text}
                </div>

                {msg.role === 'assistant' && msg.content.handoff && (
                  <div
                    className={`mt-3 w-full max-w-[85%] rounded-2xl border p-4 ${
                      msg.content.handoff.priority === 'urgent'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gold/10 border-gold/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className={`w-4 h-4 flex-shrink-0 ${msg.content.handoff.priority === 'urgent' ? 'text-red-500' : 'text-gold'}`} />
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${msg.content.handoff.priority === 'urgent' ? 'text-red-600' : 'text-charcoal/70'}`}>
                        {msg.content.handoff.priority === 'urgent' ? 'Urgent — Team Notified' : 'Team Notified'}: {msg.content.handoff.category}
                      </span>
                    </div>
                    <a
                      href={`${'https://wa.me/2347072253857'}?text=${encodeURIComponent(msg.content.handoff.summary)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-full transition-colors ${
                        msg.content.handoff.priority === 'urgent'
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-charcoal text-gold hover:bg-gold hover:text-charcoal'
                      }`}
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Message Us Now on WhatsApp
                    </a>
                  </div>
                )}

                {msg.role === 'assistant' && msg.content.nextStep && (
                  <div className="mt-2 pl-1 border-l-2 border-gold/50 text-[11px] italic text-charcoal/50 max-w-[85%]">
                    {msg.content.nextStep}
                  </div>
                )}

                {msg.role === 'assistant' && msg.content.recommendations && msg.content.recommendations.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {msg.content.recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="bg-white border border-charcoal/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="relative h-32 overflow-hidden bg-charcoal/5">
                          <img
                            src={rec.image}
                            alt={rec.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {rec.badge && (
                            <span className="absolute top-2 left-2 bg-charcoal/85 text-gold text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-full flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> {rec.badge}
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="font-serif text-sm text-charcoal font-semibold leading-tight">{rec.name}</h4>
                          <div className="flex items-center gap-1 mt-1 text-[11px] text-charcoal/50">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{rec.location}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1.5 text-gold font-bold text-sm">
                            <Tag className="w-3.5 h-3.5" />
                            {rec.price}
                            {rec.price !== 'Price on request' && (
                              <span className="text-charcoal/40 font-normal text-[10px]">
                                {rec.category === 'Car Rental' ? ' /day' : rec.category === 'Private Jet' ? ' /charter' : ' /night'}
                              </span>
                            )}
                          </div>
                          {rec.highlights && rec.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {rec.highlights.slice(0, 4).map((h) => (
                                <span
                                  key={h}
                                  className="text-[9.5px] font-medium bg-charcoal/5 text-charcoal/60 px-2 py-0.5 rounded-full border border-charcoal/10"
                                >
                                  {h}
                                </span>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => openBooking(rec)}
                            className="mt-2.5 w-full bg-gradient-to-r from-gold via-amber-300 to-gold text-charcoal text-[11px] font-bold uppercase tracking-wider py-2 rounded-full hover:shadow-md transition-all cursor-pointer"
                          >
                            Book This
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {msg.role === 'assistant' && msg.content.hasMore && (
                  <button
                    onClick={() => handleViewMore(msg.id)}
                    disabled={loadingMoreId === msg.id}
                    className="mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-charcoal/60 hover:text-gold border border-charcoal/15 hover:border-gold/50 px-4 py-2 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loadingMoreId === msg.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding more options...
                      </>
                    ) : (
                      <>View More Options</>
                    )}
                  </button>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-charcoal/40 text-xs pl-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Finding the best matches for you...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sample prompts */}
          {messages.length <= 1 && (
            <div className="px-4 sm:px-6 pb-2 flex flex-wrap gap-2">
              {samplePrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  className="text-[11px] bg-charcoal/5 hover:bg-gold/15 text-charcoal/70 hover:text-charcoal px-3 py-1.5 rounded-full border border-charcoal/10 transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-charcoal/10 p-3 sm:p-4 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white border border-charcoal/15 rounded-full px-4 py-2.5 shadow-sm focus-within:border-gold/50 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Concierge (e.g., recommend hotels in Abuja under 120k)..."
                className="flex-1 bg-transparent outline-none text-sm text-charcoal placeholder:text-charcoal/35"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="w-8 h-8 rounded-full bg-charcoal text-gold flex items-center justify-center disabled:opacity-30 hover:bg-gold hover:text-charcoal transition-colors cursor-pointer flex-shrink-0"
                aria-label="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-center text-[10px] text-charcoal/30 mt-2">
              Rates &amp; reservation options verified manually by human concierge upon request.
            </p>
          </div>

          {/* "Handle My Stay" Guided Form Modal */}
          <AnimatePresence>
            {showPlanForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-4 z-10"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-cream rounded-3xl w-full max-w-sm p-6 shadow-2xl relative max-h-[90%] overflow-y-auto"
                >
                  <button
                    onClick={() => setShowPlanForm(false)}
                    className="absolute top-4 right-4 text-charcoal/40 hover:text-charcoal cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2 pr-6">
                    <Briefcase className="w-4 h-4 text-gold flex-shrink-0" />
                    <h3 className="font-serif text-lg text-charcoal font-semibold">Let's plan your stay</h3>
                  </div>
                  <p className="text-xs text-charcoal/50 mt-1 mb-4">Tell me what you need and I'll find your best-fit options.</p>

                  <form onSubmit={handlePlanSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={planCategory}
                        onChange={(e) => {
                          const next = e.target.value as typeof planCategory;
                          setPlanCategory(next);
                          setPlanRooms(next === 'Car Rental' ? '1 Car' : '1 Room');
                        }}
                        className="w-full bg-white border border-charcoal/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold/50"
                      >
                        <option value="Hotel">Hotel</option>
                        <option value="Shortlet">Shortlet</option>
                        <option value="Car Rental">Car Rental</option>
                        <option value="Private Jet">Private Jet</option>
                      </select>
                      <select
                        value={planCity}
                        onChange={(e) => setPlanCity(e.target.value as typeof planCity)}
                        className="w-full bg-white border border-charcoal/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold/50"
                      >
                        <option value="Lagos">Lagos</option>
                        <option value="Abuja">Abuja</option>
                        <option value="Port Harcourt">Port Harcourt</option>
                      </select>
                    </div>

                    <input
                      type="text"
                      placeholder="Specific area (e.g. Lekki, GRA, Wuse) — optional"
                      value={planArea}
                      onChange={(e) => setPlanArea(e.target.value)}
                      className="w-full bg-white border border-charcoal/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/50"
                    />

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40 text-sm">₦</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Your budget — optional"
                        value={planBudget}
                        onChange={(e) => setPlanBudget(e.target.value)}
                        className="w-full bg-white border border-charcoal/15 rounded-xl pl-8 pr-4 py-2.5 text-sm outline-none focus:border-gold/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal/30 pointer-events-none" />
                        <input
                          type="date"
                          value={planCheckIn}
                          onChange={(e) => setPlanCheckIn(e.target.value)}
                          className="w-full bg-white border border-charcoal/15 rounded-xl pl-8 pr-2 py-2.5 text-xs outline-none focus:border-gold/50"
                        />
                      </div>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal/30 pointer-events-none" />
                        <input
                          type="date"
                          value={planCheckOut}
                          onChange={(e) => setPlanCheckOut(e.target.value)}
                          className="w-full bg-white border border-charcoal/15 rounded-xl pl-8 pr-2 py-2.5 text-xs outline-none focus:border-gold/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal/30 pointer-events-none" />
                        <select
                          value={planGuests}
                          onChange={(e) => setPlanGuests(e.target.value)}
                          className="w-full bg-white border border-charcoal/15 rounded-xl pl-8 pr-2 py-2.5 text-sm outline-none focus:border-gold/50"
                        >
                          <option>1 Guest</option>
                          <option>2 Guests</option>
                          <option>3 Guests</option>
                          <option>4+ Guests</option>
                        </select>
                      </div>
                      {(planCategory === 'Hotel' || planCategory === 'Shortlet') && (
                        <select
                          value={planRooms}
                          onChange={(e) => setPlanRooms(e.target.value)}
                          className="w-full bg-white border border-charcoal/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold/50"
                        >
                          <option>1 Room</option>
                          <option>2 Rooms</option>
                          <option>3 Rooms</option>
                          <option>4 Rooms</option>
                          <option>5+ Rooms</option>
                        </select>
                      )}
                      {planCategory === 'Car Rental' && (
                        <select
                          value={planRooms}
                          onChange={(e) => setPlanRooms(e.target.value)}
                          className="w-full bg-white border border-charcoal/15 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold/50"
                        >
                          <option>1 Car</option>
                          <option>2 Cars</option>
                          <option>3 Cars</option>
                          <option>4+ Cars</option>
                        </select>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Must-haves (e.g. pool, wifi, near airport) — optional"
                      value={planFeatures}
                      onChange={(e) => setPlanFeatures(e.target.value)}
                      className="w-full bg-white border border-charcoal/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/50"
                    />

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-gold via-amber-300 to-gold text-charcoal font-bold uppercase tracking-wider text-xs py-3 rounded-full hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Find My Options
                    </button>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Direct Booking Modal */}
          <AnimatePresence>
            {bookingProperty && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-4 z-10"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-cream rounded-3xl w-full max-w-sm p-6 shadow-2xl relative max-h-[90%] overflow-y-auto"
                >
                  {!bookingSuccess ? (
                    <>
                      <button
                        onClick={() => setBookingProperty(null)}
                        className="absolute top-4 right-4 text-charcoal/40 hover:text-charcoal cursor-pointer"
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <h3 className="font-serif text-lg text-charcoal font-semibold pr-6">{bookingProperty.name}</h3>
                      <p className="text-xs text-charcoal/50 mt-1 mb-4">{bookingProperty.location}</p>

                      <form onSubmit={(e) => handleDirectBookingSubmit(e, 'whatsapp')} className="space-y-3">
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="w-full bg-white border border-charcoal/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/50"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="Phone Number"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="w-full bg-white border border-charcoal/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/50"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={checkIn}
                            onChange={(e) => setCheckIn(e.target.value)}
                            className="w-full bg-white border border-charcoal/15 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-gold/50"
                          />
                          <input
                            type="date"
                            value={checkOut}
                            onChange={(e) => setCheckOut(e.target.value)}
                            className="w-full bg-white border border-charcoal/15 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-gold/50"
                          />
                        </div>
                        <select
                          value={guestCount}
                          onChange={(e) => setGuestCount(e.target.value)}
                          className="w-full bg-white border border-charcoal/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/50"
                        >
                          <option>1 Guest</option>
                          <option>2 Guests</option>
                          <option>3 Guests</option>
                          <option>4+ Guests</option>
                        </select>
                        {(bookingProperty.category === 'Hotel' || bookingProperty.category === 'Shortlet') && (
                          <select
                            value={numberOfRooms}
                            onChange={(e) => setNumberOfRooms(e.target.value)}
                            className="w-full bg-white border border-charcoal/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/50"
                          >
                            <option>1 Room</option>
                            <option>2 Rooms</option>
                            <option>3 Rooms</option>
                            <option>4 Rooms</option>
                            <option>5+ Rooms</option>
                          </select>
                        )}
                        {bookingProperty.category === 'Car Rental' && (
                          <select
                            value={numberOfRooms}
                            onChange={(e) => setNumberOfRooms(e.target.value)}
                            className="w-full bg-white border border-charcoal/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/50"
                          >
                            <option>1 Car</option>
                            <option>2 Cars</option>
                            <option>3 Cars</option>
                            <option>4+ Cars</option>
                          </select>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmittingBooking}
                          className="w-full bg-gradient-to-r from-gold via-amber-300 to-gold text-charcoal font-bold uppercase tracking-wider text-xs py-3 rounded-full hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isSubmittingBooking ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Confirm via WhatsApp
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                      <h3 className="font-serif text-lg text-charcoal font-semibold">Request Sent!</h3>
                      <p className="text-xs text-charcoal/50 mt-1">Our concierge will confirm your booking shortly.</p>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
