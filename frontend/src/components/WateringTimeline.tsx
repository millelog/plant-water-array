import React from 'react';
import { WateringLog } from '../types';

interface WateringTimelineProps {
  logs: WateringLog[];
  onDelete: (id: number) => void;
}

function getMethodBadge(method: string) {
  switch (method) {
    case 'manual':
      return <span className="badge bg-accent-glow text-accent border border-accent/20 text-[10px]">Manual</span>;
    case 'auto':
      return <span className="badge bg-soil-glow text-soil border border-soil/20 text-[10px]">Auto</span>;
    case 'rain':
      return <span className="badge bg-canvas-200 text-text-muted border border-surface-border text-[10px]">Rain</span>;
    default:
      return <span className="badge bg-canvas-200 text-text-muted border border-surface-border text-[10px]">{method}</span>;
  }
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return 'Today ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return 'Yesterday ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const WateringTimeline: React.FC<WateringTimelineProps> = ({ logs, onDelete }) => {
  if (logs.length === 0) {
    return (
      <div className="text-sm text-text-muted italic py-4 text-center">
        No watering events logged yet
      </div>
    );
  }

  return (
    <div className="relative pl-5 border-l-2 border-surface-border space-y-4">
      {logs.map(log => (
        <div key={log.id} className="relative group">
          {/* Timeline dot */}
          <div className="absolute -left-[calc(0.625rem+1px)] top-1 w-3 h-3 rounded-full bg-canvas-50 border-2 border-accent" />

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-text-muted font-mono">{formatTimestamp(log.timestamp)}</span>
                {getMethodBadge(log.method)}
              </div>
              {log.notes && (
                <p className="text-sm text-text-secondary mt-1">{log.notes}</p>
              )}
            </div>
            <button
              onClick={() => onDelete(log.id)}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger text-xs transition-opacity shrink-0"
              title="Delete"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WateringTimeline;
