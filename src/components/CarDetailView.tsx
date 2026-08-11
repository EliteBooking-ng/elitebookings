import React, { useState } from 'react';
import { ChevronLeft, Users, Cog, Snowflake, UserCheck, MapPin } from 'lucide-react';
import { type Vehicle, formatStartingPrice, formatInterStatePrice, formatDiscountBadge, PRICING_TYPE_LABEL } from '../data/cars';

interface CarDetailViewProps {
  vehicle: Vehicle;
  onBack: () => void;
  onRequestVehicle: (vehicle: Vehicle) => void;
}

export function CarDetailView({ vehicle, onBack, onRequestVehicle }: CarDetailViewProps) {
  const gallery = [vehicle.primaryImage, ...vehicle.additionalImages];
  const [activeImage, setActiveImage] = useState(vehicle.primaryImage);
  const interStateLabel = formatInterStatePrice(vehicle);
  const startingDiscount = formatDiscountBadge(vehicle.startingPriceDiscountPercent);
  const interStateDiscount = formatDiscountBadge(vehicle.interStatePriceDiscountPercent);
  const homeLabel = vehicle.locations.join(' / ');

  const specs = [
    { icon: Users, label: `${vehicle.seats} Passengers` },
    { icon: Cog, label: vehicle.transmission },
    { icon: Snowflake, label: vehicle.airConditioning ? 'Air Conditioning' : 'No Air Conditioning' },
    { icon: UserCheck, label: vehicle.driverOptions.join(' · ') },
    { icon: MapPin, label: `Available in ${vehicle.locations.join(', ')}` },
  ];

  return (
    <div className="w-full max-w-6xl mt-12 mb-24 relative">
      <button
        onClick={onBack}
        className="absolute -top-16 left-0 flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-[11px] uppercase tracking-[0.3em] text-charcoal font-bold shadow-sm hover:bg-gold hover:text-cream transition-all group cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to fleet
      </button>

      <div className="relative rounded-[2.5rem] overflow-hidden bg-[#0A0A0A] border border-white/10 shadow-2xl">
        <div className="grid lg:grid-cols-2">
          <div className="min-w-0">
            <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full bg-black min-h-[320px]">
              <img
                src={activeImage}
                alt={vehicle.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-6 left-6 bg-black/60 backdrop-blur-sm border border-white/10 text-white text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-full">
                {vehicle.status}
              </span>
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-3 p-4 bg-black/40 overflow-x-auto">
                {gallery.map((img) => (
                  <button
                    key={img}
                    onClick={() => setActiveImage(img)}
                    className={`w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-colors cursor-pointer ${
                      activeImage === img ? 'border-blue-500' : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 p-8 sm:p-12 flex flex-col justify-center overflow-hidden">
            <span className="text-blue-400 text-[11px] uppercase tracking-[0.4em] font-bold mb-3 block">{vehicle.category}</span>
            <h1 className="text-3xl md:text-5xl font-serif font-light text-white leading-tight mb-6 break-words">{vehicle.name}</h1>

            <div className="space-y-3.5 mb-8">
              {specs.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 text-white/70 text-sm">
                  <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="break-words">{label}</span>
                </div>
              ))}
            </div>

            <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-md break-words">{vehicle.description}</p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 mb-8 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-3">
                <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">{PRICING_TYPE_LABEL[vehicle.pricingType]}</span>
                <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">Availability: {vehicle.status}</span>
              </div>

              <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 ${interStateLabel ? 'pb-3 mb-3 border-b border-white/10' : ''}`}>
                <div className="min-w-0">
                  <span className="text-white/30 text-[10px] uppercase tracking-[0.15em] font-bold block mb-0.5 break-words">{homeLabel} Rate</span>
                  <span className="text-2xl font-serif text-white font-semibold break-words">{formatStartingPrice(vehicle)}</span>
                </div>
                {startingDiscount && (
                  <span className="bg-blue-600 text-white text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-full flex-shrink-0">{startingDiscount}</span>
                )}
              </div>

              {interStateLabel && (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <span className="text-white/30 text-[10px] uppercase tracking-[0.15em] font-bold block mb-0.5">Inter-State Rate</span>
                    <span className="text-2xl font-serif text-white font-semibold break-words">{interStateLabel}</span>
                  </div>
                  {interStateDiscount && (
                    <span className="bg-blue-600 text-white text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-full flex-shrink-0">{interStateDiscount}</span>
                  )}
                </div>
              )}

              {(vehicle.startingPrice != null || interStateLabel) && (
                <p className="text-white/30 text-[11px] mt-3 leading-relaxed break-words">
                  {interStateLabel
                    ? `Inter-State rate applies to trips that leave ${homeLabel}. Starting from — final price confirmed after availability.`
                    : 'Starting from — final price confirmed after availability.'}
                </p>
              )}
            </div>

            {vehicle.rateCard && vehicle.rateCard.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 mb-8 overflow-hidden">
                <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold block mb-3">Full Rate Card</span>
                <div className="space-y-2">
                  {vehicle.rateCard.map((tier) => (
                    <div key={tier.label} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                      <span className="text-white/50 break-words">{tier.label}</span>
                      <span className="text-white font-semibold break-words">₦{tier.price.toLocaleString('en-NG')}</span>
                    </div>
                  ))}
                </div>
                {vehicle.airportTransfer && vehicle.airportTransfer.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-white/10 space-y-2">
                    <span className="text-white/30 text-[10px] uppercase tracking-[0.15em] font-bold block mb-1">Airport Transfer</span>
                    {vehicle.airportTransfer.map((tier) => (
                      <div key={tier.label} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                        <span className="text-white/50 break-words">{tier.label}</span>
                        <span className="text-white font-semibold break-words">₦{tier.price.toLocaleString('en-NG')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => onRequestVehicle(vehicle)}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full text-xs uppercase tracking-[0.25em] font-bold shadow-lg shadow-blue-900/40 transition-all duration-300 hover:shadow-xl cursor-pointer"
            >
              Request This Car
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
