import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Filter, X, SlidersHorizontal } from 'lucide-react';
import {
  getVehiclesByLocation, formatStartingPrice, formatDiscountBadge, VEHICLE_TYPES,
  type Vehicle, type VehicleType, type Transmission, type DriverOption
} from '../data/cars';

interface CarFleetBrowserProps {
  location: string;
  locationLabel: string;
  onBack: () => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

type TypeFilter = 'All' | VehicleType;
type TransmissionFilter = 'All' | Transmission;
type DriverFilter = 'All' | DriverOption;
type SortBy = 'Recommended' | 'Lowest Price' | 'Highest Price';

const PRICE_BANDS: { label: string; value: number | null }[] = [
  { label: 'Any Price', value: null },
  { label: 'Up to ₦50,000', value: 50000 },
  { label: 'Up to ₦100,000', value: 100000 },
  { label: 'Up to ₦200,000', value: 200000 },
  { label: 'Up to ₦500,000', value: 500000 },
  { label: 'Up to ₦2,000,000', value: 2000000 },
];

export function CarFleetBrowser({ location, locationLabel, onBack, onSelectVehicle }: CarFleetBrowserProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [transmissionFilter, setTransmissionFilter] = useState<TransmissionFilter>('All');
  const [driverFilter, setDriverFilter] = useState<DriverFilter>('All');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('Recommended');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const vehicles = useMemo(() => {
    const filtered = getVehiclesByLocation(location)
      .filter((v) => typeFilter === 'All' || v.type === typeFilter)
      .filter((v) => transmissionFilter === 'All' || v.transmission === transmissionFilter)
      .filter((v) => driverFilter === 'All' || v.driverOptions.includes(driverFilter as DriverOption))
      .filter((v) => maxPrice == null || v.startingPrice == null || v.startingPrice <= maxPrice);

    return [...filtered].sort((a, b) => {
      if (sortBy === 'Recommended') return 0;
      if (a.startingPrice == null && b.startingPrice == null) return 0;
      if (a.startingPrice == null) return 1;
      if (b.startingPrice == null) return -1;
      return sortBy === 'Lowest Price' ? a.startingPrice - b.startingPrice : b.startingPrice - a.startingPrice;
    });
  }, [location, typeFilter, transmissionFilter, driverFilter, maxPrice, sortBy]);

  const resetFilters = () => {
    setTypeFilter('All');
    setTransmissionFilter('All');
    setDriverFilter('All');
    setMaxPrice(null);
    setSortBy('Recommended');
  };

  const pill = (active: boolean) =>
    `px-3.5 py-2 rounded-full text-[11px] font-semibold transition-all cursor-pointer border whitespace-nowrap ${
      active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
    }`;

  const FilterControls = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Vehicle Type</label>
        <div className="flex flex-wrap gap-2">
          {(['All', ...VEHICLE_TYPES] as TypeFilter[]).map((t) => (
            <button key={t} type="button" onClick={() => setTypeFilter(t)} className={pill(typeFilter === t)}>{t}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Transmission</label>
        <div className="flex flex-wrap gap-2">
          {(['All', 'Automatic', 'Manual'] as TransmissionFilter[]).map((t) => (
            <button key={t} type="button" onClick={() => setTransmissionFilter(t)} className={pill(transmissionFilter === t)}>{t}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Driver</label>
        <div className="flex flex-wrap gap-2">
          {(['All', 'With Driver', 'Self Drive'] as DriverFilter[]).map((t) => (
            <button key={t} type="button" onClick={() => setDriverFilter(t)} className={pill(driverFilter === t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Price Range</label>
          <select
            value={maxPrice ?? ''}
            onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
          >
            {PRICE_BANDS.map((b) => (
              <option key={b.label} value={b.value ?? ''}>{b.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2.5">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
          >
            <option>Recommended</option>
            <option>Lowest Price</option>
            <option>Highest Price</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mt-12 mb-24 relative">
      <button
        onClick={onBack}
        className="absolute -top-16 left-0 flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full text-[11px] uppercase tracking-[0.3em] text-charcoal font-bold shadow-sm hover:bg-gold hover:text-cream transition-all group cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to locations
      </button>

      <div className="relative rounded-[2.5rem] overflow-hidden bg-[#0A0A0A] border border-white/10 p-8 sm:p-12 shadow-2xl">
        <div className="mb-8">
          <span className="text-blue-400 text-[11px] uppercase tracking-[0.5em] font-bold mb-3 block">Our Fleet</span>
          <h2 className="text-3xl md:text-4xl font-serif text-white font-light mb-2">
            Available Vehicles in <span className="italic text-blue-300">{locationLabel}</span>
          </h2>
          <p className="text-white/50 text-sm max-w-lg">
            Compare vehicles by type, transmission and driver preference, then request the one that fits your journey.
          </p>
        </div>

        {/* Desktop filter bar */}
        <div className="hidden md:block bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-8">
          <FilterControls />
        </div>

        {/* Mobile filter trigger */}
        <div className="md:hidden flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-xs text-white outline-none [color-scheme:dark]"
          >
            <option>Recommended</option>
            <option>Lowest Price</option>
            <option>Highest Price</option>
          </select>
        </div>

        {vehicles.length === 0 ? (
          <div className="text-center py-16">
            <SlidersHorizontal className="w-8 h-8 text-blue-400/60 mx-auto mb-4" />
            <h3 className="text-xl font-serif text-white mb-2 font-light">No Vehicles Match These Filters</h3>
            <p className="text-white/40 text-sm max-w-sm mx-auto mb-6">
              Try widening your filters, or reach out and we'll help source the right vehicle for you.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle, idx) => (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-blue-500/40 transition-all duration-300 group"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-black">
                  <img
                    src={vehicle.primaryImage}
                    alt={vehicle.name}
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm border border-white/10 text-white text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-full">
                    {vehicle.status}
                  </span>
                  {formatDiscountBadge(vehicle.startingPriceDiscountPercent) && (
                    <span className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-full shadow-lg">
                      {formatDiscountBadge(vehicle.startingPriceDiscountPercent)}
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-serif text-white mb-0.5">{vehicle.name}</h3>
                  <p className="text-blue-400 text-[10px] uppercase tracking-[0.2em] font-bold mb-3">{vehicle.category}</p>
                  <p className="text-white/50 text-xs mb-1">
                    {vehicle.transmission} · {vehicle.seats} Seats · {vehicle.airConditioning ? 'AC' : 'No AC'}
                  </p>
                  <p className="text-white/50 text-xs mb-5">{vehicle.driverOptions.join(' · ')}</p>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3 pt-4 border-t border-white/10">
                    <span className="text-white font-semibold text-sm break-words">{formatStartingPrice(vehicle)}</span>
                    <button
                      type="button"
                      onClick={() => onSelectVehicle(vehicle)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold transition-all cursor-pointer flex-shrink-0"
                    >
                      View Car
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile filter bottom sheet */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-[110] flex items-end md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-full bg-[#0A0A0A] border-t border-white/10 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif text-xl text-white font-light">Filters</h3>
                <button onClick={() => setMobileFiltersOpen(false)} aria-label="Close" className="text-white/40 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FilterControls />
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 py-3.5 px-5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-all cursor-pointer"
                >
                  Show {vehicles.length} Vehicle{vehicles.length === 1 ? '' : 's'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
