import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Routes from './routes';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  return (
    <Router>
      <div className="relative z-10 flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 overflow-auto px-6 py-6 lg:px-10">
            <Routes />
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
