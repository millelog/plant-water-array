import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppRoutes from './routes';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import ProtectedRoute from './components/ProtectedRoute';
import { AlertProvider } from './context/AlertContext';
import { AuthProvider } from './context/AuthContext';
import { KioskProvider } from './context/KioskContext';
import { ThemeProvider } from './context/ThemeContext';
import { MobileNavProvider } from './context/MobileNavContext';
import Login from './pages/Login';

const AuthenticatedLayout: React.FC = () => (
  <ProtectedRoute>
    <AlertProvider>
      <KioskProvider>
        <MobileNavProvider>
          <div className="relative z-10 flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Navbar />
              <main className="flex-1 overflow-auto px-6 py-6 lg:px-10 pb-20 md:pb-6">
                <AppRoutes />
              </main>
              <BottomNav />
            </div>
          </div>
        </MobileNavProvider>
      </KioskProvider>
    </AlertProvider>
  </ProtectedRoute>
);

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<AuthenticatedLayout />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
