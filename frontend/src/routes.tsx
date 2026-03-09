import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Sensors from './pages/Sensors';
import Readings from './pages/Readings';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Firmware from './pages/Firmware';
import PlantDetail from './pages/PlantDetail';
import DeviceDetail from './pages/DeviceDetail';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/devices" element={<Devices />} />
      <Route path="/devices/:deviceId" element={<DeviceDetail />} />
      <Route path="/sensors" element={<Sensors />} />
      <Route path="/readings" element={<Readings />} />
      <Route path="/readings/:deviceId" element={<Readings />} />
      <Route path="/readings/:deviceId/:sensorId" element={<Readings />} />
      <Route path="/plant/:sensorDbId" element={<PlantDetail />} />
      <Route path="/alerts" element={<Alerts />} />
      <Route path="/firmware" element={<Firmware />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
};

export default AppRoutes;
