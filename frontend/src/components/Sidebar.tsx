import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  DevicePhoneMobileIcon,
  BeakerIcon,
  BellIcon,
  CogIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAlerts } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { useMobileNav } from '../context/MobileNavContext';

interface MenuItem {
  name: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  path: string;
  badge?: number;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { unreadCount } = useAlerts();
  const { logout, isDemo } = useAuth();
  const { isMobile, sidebarOpen, setSidebarOpen } = useMobileNav();

  const primaryItems: MenuItem[] = [
    { name: 'Dashboard', icon: HomeIcon, path: '/' },
    { name: 'Compare', icon: ChartBarIcon, path: '/compare' },
    { name: 'Alerts', icon: BellIcon, path: '/alerts', badge: unreadCount },
  ];

  const adminItems: MenuItem[] = [
    { name: 'Devices', icon: DevicePhoneMobileIcon, path: '/devices' },
    { name: 'Sensors', icon: BeakerIcon, path: '/sensors' },
    { name: 'Settings', icon: CogIcon, path: '/settings' },
  ];

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;
    const isActive = item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path);

    return (
      <Link
        key={item.name}
        to={item.path}
        onClick={() => isMobile && setSidebarOpen(false)}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
          transition-all duration-150 group
          ${isActive
            ? 'bg-accent-glow text-accent border border-accent/15'
            : 'text-text-secondary hover:text-text hover:bg-canvas-200 border border-transparent'
          }
        `}
      >
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
          isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'
        }`} />
        <span className="flex-1">{item.name}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-danger text-canvas text-[11px] font-mono font-bold px-1.5">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="px-5 py-6 border-b border-surface-border">
        <Link to="/" className="flex items-center gap-3 group" onClick={() => isMobile && setSidebarOpen(false)}>
          <div className="w-9 h-9 rounded-xl bg-accent-glow border border-accent/20 flex items-center justify-center
                          group-hover:shadow-glow-accent transition-shadow duration-300">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M12 22c0-8-6-10-6-16a6 6 0 1 1 12 0c0 6-6 8-6 16z" fill="currentColor" opacity="0.3"/>
              <path d="M12 22c0-8-6-10-6-16a6 6 0 1 1 12 0c0 6-6 8-6 16z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M12 22v-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 16c0-2 3-4 3-4s3 2 3 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <div>
            <div className="font-display text-lg text-text leading-tight">Plant Water</div>
            <div className="text-[11px] text-text-muted font-mono tracking-wider uppercase">Array</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {primaryItems.map(renderItem)}

        {!isDemo && (
          <>
            {/* Admin divider */}
            <div className="pt-4 pb-2 px-3">
              <div className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Admin</div>
            </div>
            {adminItems.map(renderItem)}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-surface-border flex items-center justify-between">
        {isDemo ? (
          <>
            <div className="text-[11px] text-soil font-mono font-medium">
              Demo Mode
            </div>
            <button
              onClick={logout}
              className="text-[11px] text-text-muted hover:text-danger transition-colors font-mono"
            >
              Exit
            </button>
          </>
        ) : (
          <>
            <div className="text-[11px] text-text-muted font-mono">
              v1.0 &middot; ESP32 Monitor
            </div>
            <button
              onClick={logout}
              className="text-[11px] text-text-muted hover:text-danger transition-colors font-mono"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </>
  );

  // Desktop: static sidebar
  if (!isMobile) {
    return (
      <aside className="w-60 flex-shrink-0 bg-canvas-50 border-r border-surface-border flex flex-col">
        {sidebarContent}
      </aside>
    );
  }

  // Mobile: overlay sidebar
  return (
    <>
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Sliding sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 z-50 bg-canvas-50 border-r border-surface-border flex flex-col
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
