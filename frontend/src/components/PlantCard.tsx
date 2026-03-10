import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SensorSummary } from '../types';
import SparklineChart from './SparklineChart';
import InlineEdit from './InlineEdit';
import LogWateringModal from './LogWateringModal';
import { updateSensor } from '../api/api';

interface PlantCardProps {
  sensor: SensorSummary;
  onNameChange?: () => void;
  onRefresh?: () => void;
}

function getMoistureColor(value: number): string {
  if (value < 20) return 'text-danger';
  if (value < 40) return 'text-soil';
  return 'text-accent';
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'dry':
      return <span className="badge bg-danger-glow text-danger border border-danger/20">Needs Water</span>;
    case 'wet':
      return <span className="badge bg-soil-glow text-soil border border-soil/20">Too Wet</span>;
    case 'healthy':
      return <span className="badge bg-accent-glow text-accent border border-accent/20">Healthy</span>;
    default:
      return <span className="badge bg-canvas-200 text-text-muted border border-surface-border">No Data</span>;
  }
}

function getTrendArrow(trend: string) {
  switch (trend) {
    case 'rising':
      return <span className="text-accent text-xs">&#9650;</span>;
    case 'falling':
      return <span className="text-danger text-xs">&#9660;</span>;
    default:
      return <span className="text-text-muted text-xs">&#9654;</span>;
  }
}

const PlantCard: React.FC<PlantCardProps> = ({ sensor, onNameChange, onRefresh }) => {
  const displayName = sensor.name || `Sensor ${sensor.sensor_id}`;
  const [showWateringModal, setShowWateringModal] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleRename = async (newName: string) => {
    await updateSensor(sensor.id, { name: newName });
    onNameChange?.();
  };

  return (
    <>
      <div
        className="card p-5 md:p-4 flex flex-col gap-3 hover:shadow-card-hover group relative overflow-hidden"
        onTouchStart={() => setShowActions(prev => !prev)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <InlineEdit
              value={displayName}
              onSave={handleRename}
              className="font-body font-semibold text-text text-sm"
              placeholder="Name this plant"
            />
            <div className="text-[11px] text-text-muted font-mono mt-0.5 truncate">
              on {sensor.device_name}
            </div>
          </div>
          {getStatusBadge(sensor.status)}
        </div>

        {sensor.current_moisture !== null ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl md:text-2xl font-mono font-bold ${getMoistureColor(sensor.current_moisture)}`}>
                {sensor.current_moisture.toFixed(1)}%
              </span>
              {getTrendArrow(sensor.trend)}
            </div>
            <div className="moisture-bar h-3 md:h-2">
              <div
                className="moisture-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, sensor.current_moisture))}%` }}
              />
            </div>
          </>
        ) : (
          <div className="text-sm text-text-muted italic py-2">No readings yet</div>
        )}

        <SparklineChart data={sensor.sparkline} />

        {sensor.days_since_watered !== null && (
          <div className="text-[11px] text-text-muted font-mono">
            {sensor.days_since_watered === 0 ? 'Watered today' : `Watered ${sensor.days_since_watered}d ago`}
          </div>
        )}

        {sensor.last_reading_time && (
          <div className="mt-auto pt-1">
            <span className="text-[11px] text-text-muted font-mono">
              {formatTimeAgo(sensor.last_reading_time)}
            </span>
          </div>
        )}

        {/* Quick actions overlay */}
        <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-canvas-50 via-canvas-50/95 to-transparent pt-8 pb-3 px-4 flex items-end justify-center gap-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowWateringModal(true); }}
            className="px-4 py-2 md:px-3 md:py-1.5 rounded-lg text-xs font-mono bg-accent-glow text-accent border border-accent/20 hover:bg-accent hover:text-canvas transition-colors"
          >
            Log Watering
          </button>
          <Link
            to={`/plant/${sensor.id}#threshold`}
            onClick={(e) => e.stopPropagation()}
            className="px-4 py-2 md:px-3 md:py-1.5 rounded-lg text-xs font-mono text-text-muted border border-surface-border hover:text-text hover:bg-canvas-200 transition-colors"
          >
            Threshold
          </Link>
          <Link
            to={`/plant/${sensor.id}`}
            onClick={(e) => e.stopPropagation()}
            className="px-4 py-2 md:px-3 md:py-1.5 rounded-lg text-xs font-mono text-text-muted border border-surface-border hover:text-text hover:bg-canvas-200 transition-colors"
          >
            Details
          </Link>
        </div>
      </div>

      <LogWateringModal
        sensorId={sensor.id}
        open={showWateringModal}
        onClose={() => setShowWateringModal(false)}
        onLogged={() => onRefresh?.()}
      />
    </>
  );
};

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default PlantCard;
