import React, { createContext, useContext, useState } from 'react';

interface KioskContextValue {
  isKiosk: boolean;
  toggleKiosk: () => void;
}

const KioskContext = createContext<KioskContextValue>({
  isKiosk: false,
  toggleKiosk: () => {},
});

export const useKiosk = () => useContext(KioskContext);

export const KioskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isKiosk, setIsKiosk] = useState(false);

  const toggleKiosk = () => setIsKiosk(prev => !prev);

  return (
    <KioskContext.Provider value={{ isKiosk, toggleKiosk }}>
      {children}
    </KioskContext.Provider>
  );
};
