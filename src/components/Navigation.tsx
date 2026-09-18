import React from 'react';
import { Sparkles, Folder, Share2 } from 'lucide-react';
import { TabType, Language } from '../types';
import { translations } from '../utils/translations';

interface NavigationProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  language: Language;
  junkBadgeCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  language,
  junkBadgeCount = 0,
}) => {
  const t = translations[language];

  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'clean',
      label: t.clean,
      icon: <Sparkles size={22} />,
      badge: junkBadgeCount,
    },
    {
      id: 'browse',
      label: t.browse,
      icon: <Folder size={22} />,
    },
    {
      id: 'share',
      label: t.shareNear || t.share,
      icon: <Share2 size={22} />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-[#e1e3e1] py-1.5 px-4 shadow-sm pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className="flex flex-col items-center justify-center gap-1 group py-1 px-3 rounded-2xl transition-all cursor-pointer select-none"
            >
              {/* Material 3 Active Oval Pill */}
              <div
                className={`relative px-5 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                  isActive
                    ? 'bg-[#c2e7ff] text-[#001d35]'
                    : 'text-[#444746] group-hover:text-neutral-900 group-hover:bg-neutral-100/70'
                }`}
              >
                {item.icon}
                {item.badge && item.badge > 0 && !isActive ? (
                  <span className="absolute top-0 right-3 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white"></span>
                ) : null}
              </div>

              {/* Label */}
              <span
                className={`text-[12px] tracking-normal transition-colors ${
                  isActive 
                    ? 'text-[#001d35] font-bold' 
                    : 'text-[#444746] font-medium group-hover:text-neutral-900'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
