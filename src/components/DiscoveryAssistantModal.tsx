import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, X, Send, Loader2, LifeBuoy } from 'lucide-react';
import { CATALOG_ITEMS, CatalogItem } from '../data/catalog';
import { VEHICLES, Vehicle, formatStartingPrice, PRICING_TYPE_LABEL } from '../data/cars';
import { RecommendationGrid } from './RecommendationCard';
import { RequestServiceModal } from './RequestServiceModal';
import type { Message, MessageContent, RecommendationItem, PendingOffer } from '../types/assistant';

interface DiscoveryAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHandoff: (rec: RecommendationItem) => void;
  onSwitchToSupport: () => void;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome-1',
  role: 'assistant',
  content: {
    text: "Hi! I can help you find the perfect fit on EliteBooking — a hotel, shortlet, car rental, or private jet charter. Tell me where you're headed, what the occasion is, and I'll pull together real options for you to compare.",
  },
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

function catalogToRec(item: CatalogItem): RecommendationItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    city: item.city,
    location: item.location,
    price: !item.price ? 'Price on request' : item.price.startsWith('₦') ? item.price : `₦${item.price}`,
    badge: item.badge || 'Verified Listing',
    image: item.image,
    highlights: item.highlights,
    description: item.description,
    tiers: item.tiers
  };
}

function vehicleToRec(v: Vehicle): RecommendationItem {
  return {
    id: v.id,
    name: v.name,
    category: 'Car Rental',
    location: v.locations.join(', '),
    price: formatStartingPrice(v),
    badge: v.status === 'Available' ? 'Available' : 'On Request',
    image: v.primaryImage,
    highlights: [v.type, v.transmission, ...(v.airConditioning ? ['AC'] : [])],
    description: v.description,
    seats: v.seats,
    transmission: v.transmission,
    driverOptions: v.driverOptions,
    pricingType: PRICING_TYPE_LABEL[v.pricingType]
  };
}

// Defense-in-depth: re-validate every recommendation against real listings
// (catalog or vehicle fleet) before rendering, so a malformed API response can
// never surface something that isn't genuinely on EliteBooking.
function sanitizeRecommendations(recs: any[]): RecommendationItem[] {
  const matched: RecommendationItem[] = [];

  if (Array.isArray(recs)) {
    for (const rec of recs) {
      if (!rec) continue;
      const recId = (rec.id || '').toLowerCase().trim();
      const recName = (rec.name || '').toLowerCase().trim();

      // Car Rental recs come from the richer Vehicle catalog — check VEHICLES
      // first for them. catalog.ts also carries a flattened, lossy duplicate
      // entry for the same car under the same id, so checking CATALOG_ITEMS
      // first here would silently downgrade a car pick and drop its seats/
      // transmission/driver-option fields.
      if (rec.category === 'Car Rental') {
        const vehicleMatch = VEHICLES.find((v) => (recId && v.id.toLowerCase() === recId) || (recName && v.name.toLowerCase() === recName));
        if (vehicleMatch && !matched.some((m) => m.id === vehicleMatch.id)) {
          matched.push(vehicleToRec(vehicleMatch));
        }
        continue;
      }

      const catalogMatch = CATALOG_ITEMS.find((c) => (recId && c.id.toLowerCase() === recId) || (recName && c.name.toLowerCase() === recName));
      if (catalogMatch) {
        if (!matched.some((m) => m.id === catalogMatch.id)) matched.push(catalogToRec(catalogMatch));
        continue;
      }

      const vehicleMatch = VEHICLES.find((v) => (recId && v.id.toLowerCase() === recId) || (recName && v.name.toLowerCase() === recName));
      if (vehicleMatch && !matched.some((m) => m.id === vehicleMatch.id)) {
        matched.push(vehicleToRec(vehicleMatch));
      }
    }
  }

  const finalItems = matched.length > 0
    ? matched
    : [...CATALOG_ITEMS.slice(0, 2).map(catalogToRec), ...VEHICLES.slice(0, 1).map(vehicleToRec)];

  return finalItems;
}

function parseAssistantReply(reply: any): MessageContent {
  if (typeof reply === 'object' && reply !== null) {
    const ranSearch = typeof reply.tier === 'string';
    return {
      text: reply.message || "Here's what I found on EliteBooking:",
      recommendations: ranSearch ? sanitizeRecommendations(reply.recommendations) : [],
      nextStep: reply.nextStep,
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
      hasMore: ranSearch && reply.hasMore === true,
      notQuiteRight: ranSearch && reply.notQuiteRight === true
    };
  }
  return {
    text: "Here's what I found on EliteBooking:",
    recommendations: sanitizeRecommendations([])
  };
}

const samplePrompts = [
  'Hotels in Abuja under ₦150k',
  'Luxury shortlet in Lekki Lagos',
  'SUV with driver in Port Harcourt',
  'Private jet charter to Lagos'
];

export const DiscoveryAssistantModal: React.FC<DiscoveryAssistantModalProps> = ({ isOpen, onClose, onHandoff, onSwitchToSupport }) => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMoreId, setLoadingMoreId] = useState<string | null>(null);
  const [requestServiceText, setRequestServiceText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const lastMessage = messages[messages.length - 1];
    const activePendingOffer: PendingOffer | undefined = lastMessage?.role === 'assistant' ? lastMessage.content.pendingOffer : undefined;

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

      const excludeIds = updatedMessages
        .filter((m) => m.role === 'assistant')
        .flatMap((m) => (m.content.recommendations || []).map((r) => r.id));

      const res = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages, excludeIds, pendingOffer: activePendingOffer })
      });

      if (!res.ok) throw new Error('Server returned error response');

      const data = await res.json();
      const parsedContent = parseAssistantReply(data);
      if (parsedContent.hasMore || parsedContent.notQuiteRight) {
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
      console.error('Discovery request failed:', err);
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

      const res = await fetch('/api/discovery', {
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
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-lg font-serif font-medium text-cream tracking-wide">
                    My Trip
                  </h3>
                  <span className="text-[9px] uppercase tracking-widest font-bold bg-gold/20 text-gold px-2 py-0.5 rounded-full border border-gold/30">
                    Discover &amp; Compare
                  </span>
                </div>
                <p className="text-[11px] text-cream/50">Find your best-fit stay, ride, or charter before you book</p>
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

          {/* Escape hatch to post-booking support */}
          <button
            onClick={onSwitchToSupport}
            className="flex-shrink-0 w-full flex items-center justify-center gap-2 bg-charcoal/5 hover:bg-charcoal/10 border-b border-charcoal/10 px-4 sm:px-6 py-2 transition-colors cursor-pointer text-[11px] text-charcoal/60 hover:text-charcoal"
          >
            <LifeBuoy className="w-3.5 h-3.5 flex-shrink-0" />
            Already booked? Get support instead
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

                {msg.role === 'assistant' && msg.content.nextStep && (
                  <div className="mt-2 pl-1 border-l-2 border-gold/50 text-[11px] italic text-charcoal/50 max-w-[85%]">
                    {msg.content.nextStep}
                  </div>
                )}

                {msg.role === 'assistant' && msg.content.recommendations && msg.content.recommendations.length > 0 && (
                  <RecommendationGrid recommendations={msg.content.recommendations} onSelect={onHandoff} ctaLabel="View & Book" />
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

                {msg.role === 'assistant' && msg.content.notQuiteRight && (
                  <div className="mt-3 flex items-center gap-2 max-w-[85%]">
                    <p className="text-[11px] text-charcoal/40 italic">Not quite what you're after?</p>
                    <button
                      onClick={() => setRequestServiceText(msg.content.sourceQuery || '')}
                      className="text-[11px] font-bold uppercase tracking-wider text-gold hover:text-gold/70 underline decoration-gold/40 cursor-pointer"
                    >
                      Request This Instead
                    </button>
                  </div>
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
                placeholder="Tell me what you're after (e.g., SUV with driver in Lagos this weekend)..."
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
              Real EliteBooking listings only — final rates confirmed at booking.
            </p>
          </div>
        </motion.div>
      </div>

      <RequestServiceModal
        isOpen={!!requestServiceText}
        onClose={() => setRequestServiceText(null)}
        prefillText={requestServiceText || undefined}
        source="Discovery Assistant"
      />
    </AnimatePresence>
  );
};
