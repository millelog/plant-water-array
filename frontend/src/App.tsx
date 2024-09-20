import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Routes from './routes';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <div className="flex-1 overflow-auto p-4">
            <Routes />
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App;
