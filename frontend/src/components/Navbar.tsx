import React from 'react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/devices': 'Devices',
  '/sensors': 'Sensors',
  '/readings': 'Readings',
  '/alerts': 'Alerts',
  '/firmware': 'Firmware',
  '/settings': 'Settings',
};

const Navbar: React.FC = () => {
  const location = useLocation();
  const basePath = '/' + (location.pathname.split('/')[1] || '');
  const title = pageTitles[basePath] || 'Plant Water Array';

  return (
    <header className="flex items-center justify-between px-6 lg:px-10 py-4 border-b border-surface-border bg-canvas-50/60 backdrop-blur-sm">
      <h1 className="page-title">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="status-dot status-dot--online" />
        <span className="text-xs text-text-muted font-mono">System Online</span>
      </div>
    </header>
  );
};

export default Navbar;
