import React, { useState, useEffect, useCallback } from 'react';
import { SensorSummary, Zone } from '../types';
import PlantCard from './PlantCard';

interface KioskModeProps {
  sensors: SensorSummary[];
  zones: Zone[];
  onExit: () => void;
}

const KioskMode: React.FC<KioskModeProps> = ({ sensors, zones, onExit }) => {
  // Build zone groups
  const zoneGroups: { name: string; sensors: SensorSummary[] }[] = [];
  const sensorsByZone = new Map<number | null, SensorSummary[]>();
  for (const sensor of sensors) {
    const key = sensor.zone_id;
    if (!sensorsByZone.has(key)) sensorsByZone.set(key, []);
    sensorsByZone.get(key)!.push(sensor);
  }
  for (const zone of zones) {
    const zoneSensors = sensorsByZone.get(zone.id) || [];
    if (zoneSensors.length > 0) {
      zoneGroups.push({ name: zone.name, sensors: zoneSensors });
    }
  }
  const ungrouped = sensorsByZone.get(null) || [];
  if (ungrouped.length > 0) {
    zoneGroups.push({ name: zones.length > 0 ? 'Ungrouped' : 'All Plants', sensors: ungrouped });
  }

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleExit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onExit();
  }, [onExit]);

  // Escape key listener
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleExit();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleExit]);

  // Request fullscreen on mount
  useEffect(() => {
    try {
      document.documentElement.requestFullscreen?.();
    } catch {}
  }, []);

  // Auto-cycle zones
  useEffect(() => {
    if (zoneGroups.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % zoneGroups.length);
    }, 30000);
    return () => clearInterval(interval);
  }, [zoneGroups.length]);

  if (zoneGroups.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-canvas flex items-center justify-center">
        <div className="text-text-muted text-lg">No plants to display</div>
        <button onClick={handleExit} className="absolute top-4 right-4 btn-ghost text-sm">Exit</button>
      </div>
    );
  }

  const safeIndex = currentIndex % zoneGroups.length;
  const currentGroup = zoneGroups[safeIndex];

  return (
    <div className="fixed inset-0 z-50 bg-canvas flex flex-col p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-3xl text-text">{currentGroup.name}</h2>
        <button
          onClick={handleExit}
          className="text-text-muted hover:text-text text-sm font-mono px-3 py-1.5 rounded-lg hover:bg-canvas-200 transition-colors"
        >
          Exit Kiosk
        </button>
      </div>

      {/* Plant grid */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 auto-rows-min">
        {currentGroup.sensors.map(sensor => (
          <PlantCard key={sensor.id} sensor={sensor} />
        ))}
      </div>

      {/* Zone indicator dots */}
      {zoneGroups.length > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {zoneGroups.map((group, i) => (
            <button
              key={group.name}
              onClick={() => setCurrentIndex(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === safeIndex ? 'bg-accent' : 'bg-surface-border hover:bg-text-muted'
              }`}
              aria-label={group.name}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default KioskMode;
