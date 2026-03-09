import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface MobileNavContextType {
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const MobileNavContext = createContext<MobileNavContextType>({
  isMobile: false,
  sidebarOpen: false,
  setSidebarOpen: () => {},
});

export const useMobileNav = () => useContext(MobileNavContext);

export const MobileNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <MobileNavContext.Provider value={{ isMobile, sidebarOpen, setSidebarOpen }}>
      {children}
    </MobileNavContext.Provider>
  );
};
