import React from 'react';
import { Home, Compass, Bookmark, User } from 'lucide-react';

type ActiveTab = 'home' | 'explore' | 'saved' | 'account';

interface BottomTabBarProps {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
  savedCount: number;
}

const TABS: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'account', label: 'Account', icon: User },
];

// Persistent primary navigation, applied at every screen size per the
// redesign brief — full-width edge-to-edge bar on phone widths, a centered
// floating pill dock from md: up so it doesn't stretch awkwardly across a
// wide desktop viewport while still staying fixed-bottom and always visible.
export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onChange, savedCount }) => {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[100] md:bottom-4 md:flex md:justify-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around bg-cream/95 dark:bg-charcoal/95 backdrop-blur-md border-t border-charcoal/10 dark:border-cream/10 md:border md:rounded-full md:shadow-xl md:px-2 md:max-w-sm md:w-full">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 md:py-2.5 md:px-4 transition-colors cursor-pointer ${
                isActive ? 'text-gold' : 'text-charcoal/50 dark:text-cream/50 hover:text-charcoal dark:hover:text-cream'
              }`}
            >
              <span className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'fill-gold/15' : ''}`} />
                {tab.id === 'saved' && savedCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-gold text-charcoal text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {savedCount > 9 ? '9+' : savedCount}
                  </span>
                )}
              </span>
              <span className="text-[9px] uppercase tracking-wider font-bold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
