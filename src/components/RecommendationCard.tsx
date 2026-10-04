import React from 'react';
import { MapPin, Tag, ShieldCheck } from 'lucide-react';
import type { RecommendationItem } from '../types/assistant';

interface RecommendationGridProps {
  recommendations: RecommendationItem[];
  onSelect: (rec: RecommendationItem) => void;
  ctaLabel?: string;
}

export const RecommendationGrid: React.FC<RecommendationGridProps> = ({ recommendations, onSelect, ctaLabel = 'Check Availability' }) => {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
      {recommendations.map((rec) => (
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
            {rec.category === 'Car Rental' && (rec.seats || rec.transmission || (rec.driverOptions && rec.driverOptions.length > 0)) && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {rec.seats && (
                  <span className="text-[9.5px] font-medium bg-gold/10 text-charcoal/70 px-2 py-0.5 rounded-full border border-gold/20">
                    {rec.seats} Seats
                  </span>
                )}
                {rec.transmission && (
                  <span className="text-[9.5px] font-medium bg-gold/10 text-charcoal/70 px-2 py-0.5 rounded-full border border-gold/20">
                    {rec.transmission}
                  </span>
                )}
                {rec.driverOptions?.map((d) => (
                  <span
                    key={d}
                    className="text-[9.5px] font-medium bg-gold/10 text-charcoal/70 px-2 py-0.5 rounded-full border border-gold/20"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
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
              onClick={() => onSelect(rec)}
              className="mt-2.5 w-full bg-gradient-to-r from-gold via-amber-300 to-gold text-charcoal text-[11px] font-bold uppercase tracking-wider py-2 rounded-full hover:shadow-md transition-all cursor-pointer"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
