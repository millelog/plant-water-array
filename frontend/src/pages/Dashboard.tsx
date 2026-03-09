import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DashboardSummary, Zone, SensorSummary } from '../types';
import { getDashboardSummary, getZones } from '../api/api';
import ZoneSection from '../components/ZoneSection';

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [summaryData, zonesData] = await Promise.all([
        getDashboardSummary(),
        getZones(),
      ]);
      setSummary(summaryData);
      setZones(zonesData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading || !summary) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="card p-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-3" />
          <div className="text-sm text-text-muted">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  const { stats, sensors } = summary;

  // Group sensors by zone
  const sensorsByZone = new Map<number | null, SensorSummary[]>();
  for (const sensor of sensors) {
    const key = sensor.zone_id;
    if (!sensorsByZone.has(key)) {
      sensorsByZone.set(key, []);
    }
    sensorsByZone.get(key)!.push(sensor);
  }

  const zoneOrder = zones.map(z => z.id);
  const ungrouped = sensorsByZone.get(null) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Plants</div>
          <div className="text-3xl font-mono font-bold text-text">{stats.total_sensors}</div>
          <div className="text-xs text-text-muted mt-1">sensors tracked</div>
        </div>
        <div className={`card p-5 ${stats.sensors_needing_water > 0 ? 'border-danger/20 bg-danger-glow' : ''}`}>
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Need Water</div>
          <div className={`text-3xl font-mono font-bold ${stats.sensors_needing_water > 0 ? 'text-danger' : 'text-text'}`}>
            {stats.sensors_needing_water}
          </div>
          <div className="text-xs text-text-muted mt-1">below threshold</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Devices</div>
          <div className="text-3xl font-mono font-bold text-text">{stats.total_devices}</div>
          <div className="text-xs text-text-muted mt-1">
            <span className="text-accent">{stats.online_devices}</span> online
          </div>
        </div>
        <Link to="/alerts" className="card p-5 group cursor-pointer">
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Alerts</div>
          <div className={`text-3xl font-mono font-bold ${stats.unread_alert_count > 0 ? 'text-soil' : 'text-text'}`}>
            {stats.unread_alert_count}
          </div>
          <div className="text-xs text-text-muted mt-1 group-hover:text-accent transition-colors">
            unread &rarr;
          </div>
        </Link>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <div className="text-[11px] text-text-muted font-mono text-right">
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      {/* Zone sections */}
      {sensors.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-accent-glow border border-accent/20 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M12 22c0-8-6-10-6-16a6 6 0 1 1 12 0c0 6-6 8-6 16z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <div className="text-text font-medium mb-1">No plants yet</div>
          <div className="text-sm text-text-muted">Set up your first ESP32 sensor to get started.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {zoneOrder.map(zoneId => {
            const zone = zones.find(z => z.id === zoneId);
            const zoneSensors = sensorsByZone.get(zoneId) || [];
            if (!zone || zoneSensors.length === 0) return null;
            return (
              <ZoneSection
                key={zoneId}
                title={zone.name}
                sensors={zoneSensors}
                onRefresh={loadData}
              />
            );
          })}

          {ungrouped.length > 0 && (
            <ZoneSection
              title={zones.length > 0 ? 'Ungrouped' : 'All Plants'}
              sensors={ungrouped}
              onRefresh={loadData}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
