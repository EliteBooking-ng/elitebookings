import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, X, Send, Crown,
  CheckCircle2, Loader2, AlertCircle, PhoneCall, Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import type { Message, MessageContent, RecommendationItem } from '../types/assistant';
import type { ServiceType, Trip, TripService } from '../types/trip';
import { CompleteYourTripPanel } from './CompleteYourTripPanel';
import { TripAttachPrompt } from './TripAttachPrompt';

interface AIConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Set by App.tsx when a guest picks a Hotel or Shortlet from the Discovery
  // Assistant's shortlist — Discovery never books, it hands the selection off
  // here. Consumed once via the effect below, then cleared through
  // onBookingConsumed so re-opening this modal later doesn't reopen it.
  initialBookingProperty?: RecommendationItem | null;
  onBookingConsumed?: () => void;
  // Trip integration — App.tsx owns the one useActiveTrip instance and
  // passes its state/functions down here, same as everywhere else that
  // can seed or attach to a trip.
  activeTrip: Trip | null;
  tripServices: TripService[];
  createTrip: (seedType: ServiceType, seedDetails: Record<string, any>, seedSummary: string, customer: { name: string; phone: string; email: string }, location: string) => Promise<{ id: string; tripCode: string }>;
  addServiceToTrip: (type: ServiceType, details: Record<string, any>, summary: string) => Promise<string>;
  clearActiveTrip: () => void;
  onViewTrip: () => void;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome-1',
  role: 'assistant',
  content: {
    text: "Hello! I'm here for anything about an existing booking — changes, cancellations, payment questions, or an issue during your stay. Looking to browse and compare options instead? Try our Discovery Assistant."
  },
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

function parseAssistantReply(reply: any): MessageContent {
  if (typeof reply === 'object' && reply !== null) {
    return {
      text: reply.message || "I'm here to help with your booking.",
      nextStep: reply.nextStep,
      handoff: reply.handoff && reply.handoff.required ? {
        required: true,
        priority: reply.handoff.priority === 'urgent' ? 'urgent' : 'normal',
        category: String(reply.handoff.category || 'Request'),
        services: Array.isArray(reply.handoff.services) ? reply.handoff.services.filter((s: any) => typeof s === 'string') : [],
        summary: String(reply.handoff.summary || '')
      } : undefined
    };
  }
  return { text: "I'm here to help with your booking." };
}

export const AIConciergeModal: React.FC<AIConciergeModalProps> = ({
  isOpen, onClose, initialBookingProperty, onBookingConsumed,
  activeTrip, tripServices, createTrip, addServiceToTrip, clearActiveTrip, onViewTrip,
}) => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bookingProperty, setBookingProperty] = useState<RecommendationItem | null>(null);
  const [pendingTripAttach, setPendingTripAttach] = useState<{
    seedType: ServiceType; seedDetails: Record<string, any>; seedSummary: string;
    customer: { name: string; phone: string; email: string }; location: string;
  } | null>(null);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestCount, setGuestCount] = useState('2 Guests');
  const [numberOfRooms, setNumberOfRooms] = useState('1 Room');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Picking up a Hotel/Shortlet handoff from the Discovery Assistant.
  useEffect(() => {
    if (isOpen && initialBookingProperty) {
      setBookingProperty(initialBookingProperty);
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
      setCheckIn('');
      setCheckOut('');
      setGuestCount('2 Guests');
      setNumberOfRooms('1 Room');
      onBookingConsumed?.();
    }
  }, [isOpen, initialBookingProperty, onBookingConsumed]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

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

      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages })
      });

      if (!res.ok) throw new Error('Server returned error response');

      const data = await res.json();
      const parsedContent = parseAssistantReply(data);

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
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-err-' + Date.now(),
          role: 'assistant',
          content: { text: "I'm having trouble connecting right now — for anything urgent, please message us directly on WhatsApp." },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectBookingSubmit = async (e: React.FormEvent, method: 'whatsapp' | 'web') => {
    e.preventDefault();
    if (!bookingProperty || !guestName || !guestPhone || !guestEmail) return;

    const messageText = `Hello Elite Concierge! 👑\n\nI would like to book the following property recommended by the EliteBooking AI Assistant:\n\n*Property:* ${bookingProperty.name}\n*Location:* ${bookingProperty.location}\n*Price:* ${bookingProperty.price}\n\n*Guest Details:*\n- Name: ${guestName}\n- Phone: ${guestPhone}\n- Check-in: ${checkIn || 'Flexible'}\n- Check-out: ${checkOut || 'Flexible'}\n- Guests: ${guestCount}\n- Rooms Needed: ${numberOfRooms}\n\nPlease confirm availability and payment steps.`;

    // Fired synchronously, before any `await` below — opening a tab after an
    // await loses the click's "user activation" in mobile Safari/Chrome and
    // gets silently blocked, which was why WhatsApp never actually opened.
    if (method === 'whatsapp') {
      window.open(`https://wa.me/2347072253857?text=${encodeURIComponent(messageText)}`, '_blank');
    }

    setIsSubmittingBooking(true);

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
      numberOfRooms,
      createdAt: new Date().toISOString(),
      source: 'AI Concierge'
    };

    // Firestore save, and a server-side email alert to the team (via
    // /api/notify -> Resend) — sent from our own server rather than the
    // customer's browser, so delivery doesn't depend on their device/network.
    // Neither should block the UI or each other.
    const firestoreSave = addDoc(collection(db, 'concierge_bookings'), bookingDetails).catch((err) => {
      console.warn('Firestore booking save notice:', err);
    });

    const emailPromises: Promise<any>[] = [
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Elite Concierge Booking: ${bookingProperty.name}`,
          text: `${messageText}\n\n---\nProperty / Asset: ${bookingProperty.name}\nLocation: ${bookingProperty.location}\nPrice: ${bookingProperty.price}\nGuest Name: ${guestName}\nGuest Phone: ${guestPhone}\nCheck-In: ${checkIn || 'Flexible'}\nCheck-Out: ${checkOut || 'Flexible'}\nGuests: ${guestCount}\nRooms Needed: ${numberOfRooms}\nSource: AI Concierge`
        })
      }).catch((err) => console.warn('Notification send notice:', err))
    ];

    // Seed a new Trip, or attach this booking as a service on the customer's
    // already-active one — same logic as the main site's booking flow.
    const tripPromise = (async () => {
      try {
        const seedType: ServiceType = bookingProperty.category === 'Shortlet' ? 'Shortlet' : 'Hotel';
        const seedDetails = {
          propertyName: bookingProperty.name,
          propertyLocation: bookingProperty.location,
          checkin: checkIn || 'Flexible',
          checkout: checkOut || 'Flexible',
          guests: guestCount,
          numberOfRooms,
          price: bookingProperty.price,
        };
        const seedSummary = `${bookingProperty.name} — ${checkIn || 'Flexible'} to ${checkOut || 'Flexible'}`;
        if (!activeTrip) {
          await createTrip(seedType, seedDetails, seedSummary, { name: guestName, phone: guestPhone, email: guestEmail }, bookingProperty.location);
        } else {
          setPendingTripAttach({ seedType, seedDetails, seedSummary, customer: { name: guestName, phone: guestPhone, email: guestEmail }, location: bookingProperty.location });
        }
      } catch (tripError) {
        console.warn('Trip creation/attach issue:', tripError);
      }
    })();

    await Promise.allSettled([firestoreSave, tripPromise, ...emailPromises]);

    setIsSubmittingBooking(false);
    setBookingSuccess(true);
    confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-nudge-' + Date.now(),
          role: 'assistant',
          content: { text: "Wonderful — your request is in! Is there anything else about your booking I can help with?" },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 300);
  };

  // Clears the booking form/success state. Used when the guest explicitly
  // dismisses the success screen (WhatsApp or Back to Home) — previously this
  // ran on a 2.2s timer, which closed the confirmation before most people
  // could read it or tap anything.
  const resetBookingState = () => {
    setBookingSuccess(false);
    setBookingProperty(null);
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setCheckIn('');
    setCheckOut('');
    setNumberOfRooms('1 Room');
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
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-lg font-serif font-medium text-cream tracking-wide">
                    Elite Concierge Support
                  </h3>
                  <span className="text-[9px] uppercase tracking-widest font-bold bg-gold/20 text-gold px-2 py-0.5 rounded-full border border-gold/30">
                    Post-Booking
                  </span>
                </div>
                <p className="text-[11px] text-cream/50">Booking changes, issues &amp; direct support</p>
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
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-charcoal/40 text-xs pl-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                One moment...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-charcoal/10 p-3 sm:p-4 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white border border-charcoal/15 rounded-full px-4 py-2.5 shadow-sm focus-within:border-gold/50 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about an existing booking..."
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
              Booking changes, cancellations &amp; payment issues verified manually by a human concierge.
            </p>
          </div>

          {/* Direct Booking Modal — Hotel/Shortlet handoff from Discovery */}
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

                      <form onSubmit={(e) => handleDirectBookingSubmit(e, 'web')} className="space-y-3">
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="w-full bg-white text-charcoal border border-charcoal/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/50"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="Phone Number"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="w-full bg-white text-charcoal border border-charcoal/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/50"
                        />
                        <input
                          type="email"
                          required
                          placeholder="Email Address"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          className="w-full bg-white text-charcoal border border-charcoal/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/50"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal/30 pointer-events-none" />
                            <input
                              type="date"
                              value={checkIn}
                              onChange={(e) => setCheckIn(e.target.value)}
                              className="w-full bg-white text-charcoal border border-charcoal/15 rounded-xl pl-8 pr-2 py-2.5 text-xs outline-none focus:border-gold/50 dark:[color-scheme:dark]"
                            />
                          </div>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal/30 pointer-events-none" />
                            <input
                              type="date"
                              value={checkOut}
                              onChange={(e) => setCheckOut(e.target.value)}
                              className="w-full bg-white text-charcoal border border-charcoal/15 rounded-xl pl-8 pr-2 py-2.5 text-xs outline-none focus:border-gold/50 dark:[color-scheme:dark]"
                            />
                          </div>
                        </div>
                        <select
                          value={guestCount}
                          onChange={(e) => setGuestCount(e.target.value)}
                          className="w-full bg-white text-charcoal border border-charcoal/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/50 dark:[color-scheme:dark]"
                        >
                          <option>1 Guest</option>
                          <option>2 Guests</option>
                          <option>3 Guests</option>
                          <option>4+ Guests</option>
                        </select>
                        <select
                          value={numberOfRooms}
                          onChange={(e) => setNumberOfRooms(e.target.value)}
                          className="w-full bg-white text-charcoal border border-charcoal/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/50 dark:[color-scheme:dark]"
                        >
                          <option>1 Room</option>
                          <option>2 Rooms</option>
                          <option>3 Rooms</option>
                          <option>4 Rooms</option>
                          <option>5+ Rooms</option>
                        </select>

                        <button
                          type="submit"
                          disabled={isSubmittingBooking}
                          className="w-full bg-gradient-to-r from-gold via-amber-300 to-gold text-charcoal font-bold uppercase tracking-wider text-xs py-3 rounded-full hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isSubmittingBooking ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Confirm Availability
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                      <h3 className="font-serif text-lg text-charcoal font-semibold">Request Sent!</h3>
                      <p className="text-xs text-charcoal/50 mt-1 mb-5">Our concierge will confirm availability shortly.</p>
                      <div className="space-y-2.5">
                        {bookingProperty && (
                          <a
                            href={`https://wa.me/2347072253857?text=${encodeURIComponent(`Hello Elite Concierge! 👑\n\nFollowing up on my request for *${bookingProperty.name}* — Name: ${guestName}, Phone: ${guestPhone}.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={resetBookingState}
                            className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold uppercase tracking-wider py-3 px-5 rounded-full shadow-md transition-all cursor-pointer"
                          >
                            Message Us On WhatsApp To Confirm
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => { resetBookingState(); onClose(); }}
                          className="w-full bg-white border border-charcoal/15 hover:bg-charcoal/5 text-charcoal text-xs font-bold uppercase tracking-wider py-3 px-5 rounded-full transition-all cursor-pointer"
                        >
                          Back to Home
                        </button>
                      </div>

                      {activeTrip && (
                        <CompleteYourTripPanel
                          trip={activeTrip}
                          services={tripServices}
                          addServiceToTrip={addServiceToTrip}
                          onViewTrip={() => { resetBookingState(); onClose(); onViewTrip(); }}
                        />
                      )}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <TripAttachPrompt
        isOpen={!!pendingTripAttach && !!activeTrip}
        tripCode={activeTrip?.tripCode || ''}
        tripLocation={activeTrip?.location || ''}
        onAddToExisting={async () => {
          if (pendingTripAttach) {
            await addServiceToTrip(pendingTripAttach.seedType, pendingTripAttach.seedDetails, pendingTripAttach.seedSummary);
          }
          setPendingTripAttach(null);
        }}
        onStartNew={async () => {
          if (pendingTripAttach) {
            clearActiveTrip();
            await createTrip(pendingTripAttach.seedType, pendingTripAttach.seedDetails, pendingTripAttach.seedSummary, pendingTripAttach.customer, pendingTripAttach.location);
          }
          setPendingTripAttach(null);
        }}
      />
    </AnimatePresence>
  );
};
