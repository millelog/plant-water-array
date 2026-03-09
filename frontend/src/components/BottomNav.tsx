import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, BellIcon, CogIcon } from '@heroicons/react/24/outline';
import { useAlerts } from '../context/AlertContext';
import { useMobileNav } from '../context/MobileNavContext';

const items = [
  { name: 'Dashboard', icon: HomeIcon, path: '/' },
  { name: 'Alerts', icon: BellIcon, path: '/alerts', hasBadge: true },
  { name: 'Settings', icon: CogIcon, path: '/settings' },
];

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { unreadCount } = useAlerts();
  const { isMobile } = useMobileNav();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-canvas-50 border-t border-surface-border z-30 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? 'text-accent' : 'text-text-muted'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.hasBadge && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-danger text-canvas text-[9px] font-mono font-bold px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
