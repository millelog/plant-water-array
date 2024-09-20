import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  DevicePhoneMobileIcon,
  BeakerIcon,
  BellIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

interface MenuItem {
  name: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  path: string;
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', icon: HomeIcon, path: '/' },
  { name: 'Devices', icon: DevicePhoneMobileIcon, path: '/devices' },
  { name: 'Sensors', icon: BeakerIcon, path: '/sensors' },
  { name: 'Alerts', icon: BellIcon, path: '/alerts' },
  { name: 'Settings', icon: CogIcon, path: '/settings' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <div className="w-64 bg-gray-800 text-white flex-shrink-0">
      <div className="p-4 text-2xl font-bold">Menu</div>
      <nav className="mt-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-4 py-2 hover:bg-gray-700 ${
                location.pathname === item.path ? 'bg-gray-700' : ''
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
