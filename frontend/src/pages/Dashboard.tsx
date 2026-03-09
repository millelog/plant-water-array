import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DashboardSummary, Zone, SensorSummary } from '../types';
import { getDashboardSummary, getZones } from '../api/api';
import ZoneSection from '../components/ZoneSection';
import WeatherWidget from '../components/WeatherWidget';
import KioskMode from '../components/KioskMode';
import { useKiosk } from '../context/KioskContext';

type SortBy = 'zone' | 'moisture' | 'name';
type FilterBy = 'all' | 'needs-water' | 'healthy';

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [sortBy, setSortBy] = useState<SortBy>(
    () => (localStorage.getItem('dashboard-sort') as SortBy) || 'zone'
  );
  const [filterBy, setFilterBy] = useState<FilterBy>(
    () => (localStorage.getItem('dashboard-filter') as FilterBy) || 'all'
  );

  const { isKiosk, toggleKiosk } = useKiosk();

  const handleSort = (s: SortBy) => {
    setSortBy(s);
    localStorage.setItem('dashboard-sort', s);
  };

  const handleFilter = (f: FilterBy) => {
    setFilterBy(f);
    localStorage.setItem('dashboard-filter', f);
  };

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

  // Kiosk mode overlay
  if (isKiosk) {
    return (
      <KioskMode
        sensors={summary.sensors}
        zones={zones}
        onExit={toggleKiosk}
      />
    );
  }

  const { stats, sensors } = summary;

  // Apply filter
  let filteredSensors = sensors;
  if (filterBy === 'needs-water') {
    filteredSensors = sensors.filter(s => s.status === 'dry');
  } else if (filterBy === 'healthy') {
    filteredSensors = sensors.filter(s => s.status === 'healthy');
  }

  // Apply sort
  const sortedSensors = [...filteredSensors];
  if (sortBy === 'moisture') {
    sortedSensors.sort((a, b) => {
      if (a.current_moisture === null && b.current_moisture === null) return 0;
      if (a.current_moisture === null) return 1;
      if (b.current_moisture === null) return -1;
      return a.current_moisture - b.current_moisture;
    });
  } else if (sortBy === 'name') {
    sortedSensors.sort((a, b) => {
      const nameA = a.name || `Sensor ${a.sensor_id}`;
      const nameB = b.name || `Sensor ${b.sensor_id}`;
      return nameA.localeCompare(nameB);
    });
  }

  // Group sensors by zone for zone view
  const sensorsByZone = new Map<number | null, SensorSummary[]>();
  for (const sensor of sortedSensors) {
    const key = sensor.zone_id;
    if (!sensorsByZone.has(key)) {
      sensorsByZone.set(key, []);
    }
    sensorsByZone.get(key)!.push(sensor);
  }

  const zoneOrder = zones.map(z => z.id);
  const ungrouped = sensorsByZone.get(null) || [];

  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
      active
        ? 'bg-accent-glow text-accent border border-accent/20'
        : 'text-text-muted hover:text-text hover:bg-canvas-200 border border-surface-border'
    }`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Weather widget */}
      <WeatherWidget />

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

      {/* Sort & Filter toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-text-muted font-mono mr-1">Sort</span>
          <button onClick={() => handleSort('zone')} className={pillClass(sortBy === 'zone')}>Zone</button>
          <button onClick={() => handleSort('moisture')} className={pillClass(sortBy === 'moisture')}>Driest First</button>
          <button onClick={() => handleSort('name')} className={pillClass(sortBy === 'name')}>Name</button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-text-muted font-mono mr-1">Filter</span>
          <button onClick={() => handleFilter('all')} className={pillClass(filterBy === 'all')}>All</button>
          <button onClick={() => handleFilter('needs-water')} className={pillClass(filterBy === 'needs-water')}>Needs Water</button>
          <button onClick={() => handleFilter('healthy')} className={pillClass(filterBy === 'healthy')}>Healthy</button>
        </div>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <div className="text-[11px] text-text-muted font-mono text-right">
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      {/* Plant cards */}
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
      ) : filteredSensors.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-text-muted mb-3">No sensors match this filter</div>
          <button onClick={() => handleFilter('all')} className="btn-secondary text-sm">
            Show All
          </button>
        </div>
      ) : sortBy === 'zone' ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedSensors.map((sensor, i) => (
            <div key={sensor.id} style={{ animationDelay: `${i * 60}ms` }} className="animate-slide-up">
              <PlantCard sensor={sensor} onNameChange={loadData} onRefresh={loadData} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Need to import PlantCard for the flat grid view
import PlantCard from '../components/PlantCard';

export default Dashboard;
