import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Routes from './routes';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import { AlertProvider } from './context/AlertContext';
import { KioskProvider } from './context/KioskContext';
import { MobileNavProvider } from './context/MobileNavContext';

const App: React.FC = () => {
  return (
    <Router>
      <AlertProvider>
        <KioskProvider>
          <MobileNavProvider>
            <div className="relative z-10 flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <Navbar />
                <main className="flex-1 overflow-auto px-6 py-6 lg:px-10 pb-20 md:pb-6">
                  <Routes />
                </main>
                <BottomNav />
              </div>
            </div>
          </MobileNavProvider>
        </KioskProvider>
      </AlertProvider>
    </Router>
  );
};

export default App;
