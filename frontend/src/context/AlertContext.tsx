import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from '../types';
import { getUnreadAlertCount, getAlerts } from '../api/api';

interface AlertContextValue {
  unreadCount: number;
  recentAlerts: Alert[];
  refreshAlerts: () => void;
}

const AlertContext = createContext<AlertContextValue>({
  unreadCount: 0,
  recentAlerts: [],
  refreshAlerts: () => {},
});

export const useAlerts = () => useContext(AlertContext);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const prevCount = useRef(0);

  const refreshAlerts = useCallback(async () => {
    try {
      const [count, alerts] = await Promise.all([
        getUnreadAlertCount(),
        getAlerts({ unread_only: true }),
      ]);
      setUnreadCount(count);
      setRecentAlerts(alerts.slice(0, 5));

      // Toast notification when count increases
      if (count > prevCount.current && prevCount.current > 0) {
        // We'll dispatch a custom event that Navbar can listen to
        window.dispatchEvent(new CustomEvent('new-alert', { detail: { count: count - prevCount.current } }));
      }
      prevCount.current = count;
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, []);

  useEffect(() => {
    refreshAlerts();
    const interval = setInterval(refreshAlerts, 30000);
    return () => clearInterval(interval);
  }, [refreshAlerts]);

  return (
    <AlertContext.Provider value={{ unreadCount, recentAlerts, refreshAlerts }}>
      {children}
    </AlertContext.Provider>
  );
};
