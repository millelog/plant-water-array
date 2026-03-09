import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { BellIcon, ComputerDesktopIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useAlerts } from '../context/AlertContext';
import { useKiosk } from '../context/KioskContext';
import { useMobileNav } from '../context/MobileNavContext';
import { markAlertAsRead, markAllAlertsRead } from '../api/api';
import * as Toast from '@radix-ui/react-toast';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/devices': 'Devices',
  '/sensors': 'Sensors',
  '/readings': 'Readings',
  '/alerts': 'Alerts',
  '/firmware': 'Firmware',
  '/settings': 'Settings',
  '/plant': 'Plant Detail',
};

const Navbar: React.FC = () => {
  const location = useLocation();
  const { unreadCount, recentAlerts, refreshAlerts } = useAlerts();
  const { toggleKiosk } = useKiosk();
  const { setSidebarOpen } = useMobileNav();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const basePath = '/' + (location.pathname.split('/')[1] || '');
  const title = pageTitles[basePath] || 'Plant Water Array';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Toast on new alerts
  useEffect(() => {
    const handler = (e: Event) => {
      const count = (e as CustomEvent).detail.count;
      setToastMsg(`${count} new alert${count > 1 ? 's' : ''}`);
      setToastOpen(true);
    };
    window.addEventListener('new-alert', handler);
    return () => window.removeEventListener('new-alert', handler);
  }, []);

  const handleDismiss = async (alertId: number) => {
    await markAlertAsRead(alertId);
    refreshAlerts();
  };

  const handleMarkAllRead = async () => {
    await markAllAlertsRead();
    refreshAlerts();
    setDropdownOpen(false);
  };

  return (
    <Toast.Provider swipeDirection="right">
      <header className="flex items-center justify-between px-6 lg:px-10 py-4 border-b border-surface-border bg-canvas-50/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl text-text-secondary hover:text-text hover:bg-canvas-200 transition-colors md:hidden"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <h1 className="page-title">{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Kiosk mode toggle */}
          <button
            onClick={toggleKiosk}
            className="hidden md:flex p-2 rounded-xl text-text-secondary hover:text-text hover:bg-canvas-200 transition-colors"
            title="Kiosk Mode"
          >
            <ComputerDesktopIcon className="w-5 h-5" />
          </button>

          {/* Alert bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="relative p-2 rounded-xl text-text-secondary hover:text-text hover:bg-canvas-200 transition-colors"
            >
              <BellIcon className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-danger text-canvas text-[10px] font-mono font-bold px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-surface-border rounded-2xl shadow-card-hover z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                  <span className="text-sm font-medium text-text">Alerts</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-accent hover:text-accent-dim">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-auto">
                  {recentAlerts.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-text-muted">
                      No unread alerts
                    </div>
                  ) : (
                    recentAlerts.map(alert => (
                      <div key={alert.id} className="px-4 py-3 border-b border-surface-border last:border-0 hover:bg-canvas-100 transition-colors">
                        <div className="text-sm text-text">{alert.message}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[11px] text-text-muted font-mono">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                          <div className="flex gap-2">
                            <Link
                              to={`/plant/${alert.sensor_id}`}
                              className="text-[11px] text-accent hover:text-accent-dim"
                              onClick={() => setDropdownOpen(false)}
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleDismiss(alert.id)}
                              className="text-[11px] text-text-muted hover:text-text"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Link
                  to="/alerts"
                  className="block px-4 py-2.5 text-center text-xs text-accent hover:bg-canvas-100 border-t border-surface-border transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  View all alerts
                </Link>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="status-dot status-dot--online" />
            <span className="text-xs text-text-muted font-mono">System Online</span>
          </div>
        </div>
      </header>

      <Toast.Root
        className="bg-surface border border-surface-border rounded-xl shadow-card p-4 flex items-center gap-3"
        open={toastOpen}
        onOpenChange={setToastOpen}
        duration={4000}
      >
        <BellIcon className="w-4 h-4 text-soil flex-shrink-0" />
        <Toast.Description className="text-sm text-text">{toastMsg}</Toast.Description>
      </Toast.Root>
      <Toast.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80" />
    </Toast.Provider>
  );
};

export default Navbar;
