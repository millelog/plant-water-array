import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { SensorSummary } from '../types';
import PlantCard from './PlantCard';

interface ZoneSectionProps {
  title: string;
  sensors: SensorSummary[];
  defaultOpen?: boolean;
  onRefresh?: () => void;
}

const ZoneSection: React.FC<ZoneSectionProps> = ({ title, sensors, defaultOpen = true, onRefresh }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left py-2 group"
      >
        {open ? (
          <ChevronDownIcon className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-text-muted" />
        )}
        <span className="section-title">{title}</span>
        <span className="badge bg-canvas-200 text-text-muted border border-surface-border ml-2">
          {sensors.length}
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
          {sensors.length === 0 ? (
            <div className="col-span-full text-sm text-text-muted py-4 text-center border border-dashed border-surface-border rounded-xl">
              No sensors in this zone
            </div>
          ) : (
            sensors.map((sensor, i) => (
              <div key={sensor.id} style={{ animationDelay: `${i * 60}ms` }} className="animate-slide-up">
                <PlantCard sensor={sensor} onNameChange={onRefresh} onRefresh={onRefresh} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ZoneSection;
