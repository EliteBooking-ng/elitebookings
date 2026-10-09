import React from 'react';
import { motion } from 'motion/react';

interface HomeHeroProps {
  heroImage: string;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ heroImage }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center mb-10 sm:mb-14">
      <div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[11px] sm:text-[12px] uppercase tracking-[0.5em] text-gold font-bold mb-4 block"
        >
          Your Travel, Simplified
        </motion.span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.1] mb-5 text-charcoal">
          Your Next Stay.<br />
          Your Next Journey.<br />
          <span className="italic font-serif text-gold">Sorted.</span>
        </h1>
        <p className="text-charcoal/60 text-base sm:text-lg font-normal leading-relaxed max-w-md">
          Discover stays, book rides, and arrange your travel essentials — all in one place.
        </p>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl"
      >
        <img src={heroImage} alt="A luxury stay" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </motion.div>
    </div>
  );
};
