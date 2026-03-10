import React, { useState, useEffect } from 'react';
import { Zone, SystemConfig, DatabaseStats } from '../types';
import { getZones, createZone, updateZone, deleteZone, cleanupOldReadings, getSystemConfig, updateSystemConfig, testNotification, getDatabaseStats, downloadBackup } from '../api/api';
import { useAuth } from '../context/AuthContext';

const Settings: React.FC = () => {
  const { isDemo } = useAuth();

  if (isDemo) {
    return (
      <div className="max-w-2xl animate-fade-in">
        <div className="card p-8 text-center">
          <div className="text-text font-medium mb-2">Settings Unavailable</div>
          <p className="text-sm text-text-muted">Settings are not available in demo mode.</p>
        </div>
      </div>
    );
  }
  const [zones, setZones] = useState<Zone[]>([]);
  const [newZoneName, setNewZoneName] = useState('');
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [cleanupDays, setCleanupDays] = useState('90');
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  // Database stats state
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [dbStatsLoading, setDbStatsLoading] = useState(false);
  const [backupDownloading, setBackupDownloading] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Retention config state
  const [retentionDraft, setRetentionDraft] = useState('90');
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [retentionMsg, setRetentionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // System config state
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [configDraft, setConfigDraft] = useState<{ reading_interval: string; device_timeout: string; moisture_jump_threshold: string }>({
    reading_interval: '', device_timeout: '', moisture_jump_threshold: ''
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notification config state
  const [ntfyDraft, setNtfyDraft] = useState<{ ntfy_enabled: boolean; ntfy_server_url: string; ntfy_topic: string }>({
    ntfy_enabled: false, ntfy_server_url: 'https://ntfy.sh', ntfy_topic: ''
  });
  const [ntfySaving, setNtfySaving] = useState(false);
  const [ntfyMsg, setNtfyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingNotification, setTestingNotification] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Location config state
  const [locationDraft, setLocationDraft] = useState<{ weather_latitude: string; weather_longitude: string }>({
    weather_latitude: '', weather_longitude: ''
  });
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationMsg, setLocationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadZones();
    loadConfig();
    loadDbStats();
  }, []);

  const loadConfig = async () => {
    try {
      const c = await getSystemConfig();
      setConfig(c);
      setConfigDraft({
        reading_interval: String(c.reading_interval),
        device_timeout: String(c.device_timeout),
        moisture_jump_threshold: String(c.moisture_jump_threshold),
      });
      setNtfyDraft({
        ntfy_enabled: c.ntfy_enabled,
        ntfy_server_url: c.ntfy_server_url,
        ntfy_topic: c.ntfy_topic || '',
      });
      setLocationDraft({
        weather_latitude: c.weather_latitude != null ? String(c.weather_latitude) : '',
        weather_longitude: c.weather_longitude != null ? String(c.weather_longitude) : '',
      });
      setRetentionDraft(String(c.retention_days));
    } catch {
      setConfigMsg({ type: 'error', text: 'Failed to load system config' });
    }
  };

  const configDirty = config !== null && (
    String(config.reading_interval) !== configDraft.reading_interval ||
    String(config.device_timeout) !== configDraft.device_timeout ||
    String(config.moisture_jump_threshold) !== configDraft.moisture_jump_threshold
  );

  const handleSaveConfig = async () => {
    const ri = parseInt(configDraft.reading_interval);
    const dt = parseInt(configDraft.device_timeout);
    if (isNaN(ri) || ri < 5 || ri > 3600) { setConfigMsg({ type: 'error', text: 'Reading interval must be 5-3600 seconds' }); return; }
    if (isNaN(dt) || dt < 1 || dt > 60) { setConfigMsg({ type: 'error', text: 'Device timeout must be 1-60 minutes' }); return; }
    const mjt = parseFloat(configDraft.moisture_jump_threshold);
    if (isNaN(mjt) || mjt < 5 || mjt > 50) { setConfigMsg({ type: 'error', text: 'Moisture jump threshold must be 5-50%' }); return; }
    setConfigSaving(true);
    setConfigMsg(null);
    try {
      const updated = await updateSystemConfig({ reading_interval: ri, device_timeout: dt, moisture_jump_threshold: mjt });
      setConfig(updated);
      setConfigDraft({
        reading_interval: String(updated.reading_interval),
        device_timeout: String(updated.device_timeout),
        moisture_jump_threshold: String(updated.moisture_jump_threshold),
      });
      setConfigMsg({ type: 'success', text: 'Configuration saved' });
    } catch {
      setConfigMsg({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setConfigSaving(false);
    }
  };

  const ntfyDirty = config !== null && (
    config.ntfy_enabled !== ntfyDraft.ntfy_enabled ||
    config.ntfy_server_url !== ntfyDraft.ntfy_server_url ||
    (config.ntfy_topic || '') !== ntfyDraft.ntfy_topic
  );

  const handleSaveNtfy = async () => {
    setNtfySaving(true);
    setNtfyMsg(null);
    try {
      const updated = await updateSystemConfig({
        ntfy_enabled: ntfyDraft.ntfy_enabled,
        ntfy_server_url: ntfyDraft.ntfy_server_url,
        ntfy_topic: ntfyDraft.ntfy_topic || null,
      });
      setConfig(updated);
      setNtfyDraft({
        ntfy_enabled: updated.ntfy_enabled,
        ntfy_server_url: updated.ntfy_server_url,
        ntfy_topic: updated.ntfy_topic || '',
      });
      setNtfyMsg({ type: 'success', text: 'Notification settings saved' });
    } catch {
      setNtfyMsg({ type: 'error', text: 'Failed to save notification settings' });
    } finally {
      setNtfySaving(false);
    }
  };

  const locationDirty = config !== null && (
    (config.weather_latitude != null ? String(config.weather_latitude) : '') !== locationDraft.weather_latitude ||
    (config.weather_longitude != null ? String(config.weather_longitude) : '') !== locationDraft.weather_longitude
  );

  const handleSaveLocation = async () => {
    const lat = locationDraft.weather_latitude.trim() ? parseFloat(locationDraft.weather_latitude) : null;
    const lon = locationDraft.weather_longitude.trim() ? parseFloat(locationDraft.weather_longitude) : null;
    if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) { setLocationMsg({ type: 'error', text: 'Latitude must be between -90 and 90' }); return; }
    if (lon !== null && (isNaN(lon) || lon < -180 || lon > 180)) { setLocationMsg({ type: 'error', text: 'Longitude must be between -180 and 180' }); return; }
    setLocationSaving(true);
    setLocationMsg(null);
    try {
      const updated = await updateSystemConfig({ weather_latitude: lat, weather_longitude: lon });
      setConfig(updated);
      setLocationDraft({
        weather_latitude: updated.weather_latitude != null ? String(updated.weather_latitude) : '',
        weather_longitude: updated.weather_longitude != null ? String(updated.weather_longitude) : '',
      });
      setLocationMsg({ type: 'success', text: 'Location saved' });
    } catch {
      setLocationMsg({ type: 'error', text: 'Failed to save location' });
    } finally {
      setLocationSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setTestingNotification(true);
    setTestResult(null);
    try {
      const result = await testNotification();
      setTestResult({ type: 'success', text: result.detail });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to send test notification';
      setTestResult({ type: 'error', text: message });
    } finally {
      setTestingNotification(false);
    }
  };

  const loadDbStats = async () => {
    setDbStatsLoading(true);
    try {
      const stats = await getDatabaseStats();
      setDbStats(stats);
    } catch {
      // silently fail - stats are non-critical
    } finally {
      setDbStatsLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    setBackupDownloading(true);
    setBackupMsg(null);
    try {
      await downloadBackup();
      setBackupMsg({ type: 'success', text: 'Backup downloaded' });
    } catch {
      setBackupMsg({ type: 'error', text: 'Failed to download backup' });
    } finally {
      setBackupDownloading(false);
    }
  };

  const retentionDirty = config !== null && String(config.retention_days) !== retentionDraft;

  const handleSaveRetention = async () => {
    const days = parseInt(retentionDraft);
    if (isNaN(days) || days < 7 || days > 365) {
      setRetentionMsg({ type: 'error', text: 'Retention must be 7-365 days' });
      return;
    }
    setRetentionSaving(true);
    setRetentionMsg(null);
    try {
      const updated = await updateSystemConfig({ retention_days: days });
      setConfig(updated);
      setRetentionDraft(String(updated.retention_days));
      setRetentionMsg({ type: 'success', text: 'Retention setting saved' });
    } catch {
      setRetentionMsg({ type: 'error', text: 'Failed to save retention setting' });
    } finally {
      setRetentionSaving(false);
    }
  };

  const loadZones = async () => {
    const z = await getZones();
    setZones(z);
  };

  const handleCreateZone = async () => {
    const name = newZoneName.trim();
    if (!name) return;
    await createZone({ name, sort_order: zones.length });
    setNewZoneName('');
    await loadZones();
  };

  const handleStartEdit = (zone: Zone) => {
    setEditingZoneId(zone.id);
    setEditingName(zone.name);
  };

  const handleSaveEdit = async () => {
    if (editingZoneId === null) return;
    const name = editingName.trim();
    if (!name) return;
    await updateZone(editingZoneId, { name });
    setEditingZoneId(null);
    await loadZones();
  };

  const handleDeleteZone = async (zoneId: number) => {
    await deleteZone(zoneId);
    await loadZones();
  };

  const handleCleanup = async () => {
    const days = parseInt(cleanupDays);
    if (isNaN(days) || days < 1) return;
    const result = await cleanupOldReadings(days);
    setCleanupResult(`Deleted ${result.deleted} readings older than ${days} days.`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Zones Management */}
      <div className="card p-5">
        <div className="section-title mb-4">Zones</div>
        <div className="space-y-2 mb-4">
          {zones.length === 0 ? (
            <div className="text-sm text-text-muted py-3 text-center">No zones created yet</div>
          ) : (
            zones.map(zone => (
              <div key={zone.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-canvas-100 border border-surface-border">
                {editingZoneId === zone.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="input !w-auto flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingZoneId(null);
                      }}
                    />
                    <button onClick={handleSaveEdit} className="btn-primary text-xs !py-1 !px-3">Save</button>
                    <button onClick={() => setEditingZoneId(null)} className="btn-ghost text-xs !py-1 !px-3">Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-text font-medium">{zone.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleStartEdit(zone)} className="btn-ghost text-xs !py-1 !px-2">Rename</button>
                      <button onClick={() => handleDeleteZone(zone.id)} className="btn-danger text-xs !py-1 !px-2">Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
            className="input flex-1"
            placeholder="New zone name (e.g. Living Room)"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateZone(); }}
          />
          <button onClick={handleCreateZone} className="btn-primary text-sm">Add Zone</button>
        </div>
      </div>

      {/* System Configuration */}
      <div className="card p-5">
        <div className="section-title mb-4">System Configuration</div>
        {config === null ? (
          <div className="text-sm text-text-muted py-3 text-center">Loading...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-surface-border">
              <div>
                <div className="text-sm text-text font-medium">Reading Interval</div>
                <div className="text-xs text-text-muted mt-0.5">How often devices send readings (seconds)</div>
              </div>
              <input
                type="number"
                value={configDraft.reading_interval}
                onChange={(e) => { setConfigDraft({ ...configDraft, reading_interval: e.target.value }); setConfigMsg(null); }}
                className="input !w-24 text-right"
                min="5" max="3600"
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-surface-border">
              <div>
                <div className="text-sm text-text font-medium">Device Timeout</div>
                <div className="text-xs text-text-muted mt-0.5">Time before marking device offline (minutes)</div>
              </div>
              <input
                type="number"
                value={configDraft.device_timeout}
                onChange={(e) => { setConfigDraft({ ...configDraft, device_timeout: e.target.value }); setConfigMsg(null); }}
                className="input !w-24 text-right"
                min="1" max="60"
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm text-text font-medium">Auto-Watering Detection Sensitivity</div>
                <div className="text-xs text-text-muted mt-0.5">Moisture jump % to auto-log a watering event (5-50)</div>
              </div>
              <input
                type="number"
                value={configDraft.moisture_jump_threshold}
                onChange={(e) => { setConfigDraft({ ...configDraft, moisture_jump_threshold: e.target.value }); setConfigMsg(null); }}
                className="input !w-24 text-right"
                min="5" max="50"
                step="1"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-text-muted">Changes apply to devices on their next heartbeat</div>
              <div className="flex items-center gap-3">
                {configMsg && (
                  <span className={`text-xs font-mono ${configMsg.type === 'success' ? 'text-accent' : 'text-danger'}`}>{configMsg.text}</span>
                )}
                <button
                  onClick={handleSaveConfig}
                  disabled={!configDirty || configSaving}
                  className="btn-primary text-sm disabled:opacity-40"
                >
                  {configSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="card p-5">
        <div className="section-title mb-4">Notifications</div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-surface-border">
            <div>
              <div className="text-sm text-text font-medium">Enable Push Notifications</div>
              <div className="text-xs text-text-muted mt-0.5">Send alerts to your phone via ntfy</div>
            </div>
            <button
              onClick={() => { setNtfyDraft({ ...ntfyDraft, ntfy_enabled: !ntfyDraft.ntfy_enabled }); setNtfyMsg(null); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ntfyDraft.ntfy_enabled ? 'bg-accent' : 'bg-surface-border'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ntfyDraft.ntfy_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-surface-border">
            <div>
              <div className="text-sm text-text font-medium">Server URL</div>
              <div className="text-xs text-text-muted mt-0.5">Leave default for free public server</div>
            </div>
            <input
              type="text"
              value={ntfyDraft.ntfy_server_url}
              onChange={(e) => { setNtfyDraft({ ...ntfyDraft, ntfy_server_url: e.target.value }); setNtfyMsg(null); }}
              disabled={!ntfyDraft.ntfy_enabled}
              className="input !w-56 text-right disabled:opacity-40"
              placeholder="https://ntfy.sh"
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-surface-border">
            <div>
              <div className="text-sm text-text font-medium">Topic</div>
              <div className="text-xs text-text-muted mt-0.5">Choose a unique topic name</div>
            </div>
            <input
              type="text"
              value={ntfyDraft.ntfy_topic}
              onChange={(e) => { setNtfyDraft({ ...ntfyDraft, ntfy_topic: e.target.value }); setNtfyMsg(null); }}
              disabled={!ntfyDraft.ntfy_enabled}
              className="input !w-56 text-right disabled:opacity-40"
              placeholder="my-plants"
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-surface-border">
            <div>
              <div className="text-sm text-text font-medium">Send Test</div>
              <div className="text-xs text-text-muted mt-0.5">Verify notifications are working</div>
            </div>
            <div className="flex items-center gap-3">
              {testResult && (
                <span className={`text-xs font-mono ${testResult.type === 'success' ? 'text-accent' : 'text-danger'}`}>{testResult.text}</span>
              )}
              <button
                onClick={handleTestNotification}
                disabled={!ntfyDraft.ntfy_enabled || !ntfyDraft.ntfy_topic || testingNotification || ntfyDirty}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                {testingNotification ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
          <div className="text-xs text-text-muted">Install the ntfy app on your phone and subscribe to your topic to receive notifications.</div>
          <div className="flex items-center justify-end pt-2">
            <div className="flex items-center gap-3">
              {ntfyMsg && (
                <span className={`text-xs font-mono ${ntfyMsg.type === 'success' ? 'text-accent' : 'text-danger'}`}>{ntfyMsg.text}</span>
              )}
              <button
                onClick={handleSaveNtfy}
                disabled={!ntfyDirty || ntfySaving}
                className="btn-primary text-sm disabled:opacity-40"
              >
                {ntfySaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="card p-5">
        <div className="section-title mb-4">Location</div>
        <div className="text-xs text-text-muted mb-4">Set your coordinates to show weather data on the dashboard. Uses the free Open-Meteo API.</div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-surface-border">
            <div>
              <div className="text-sm text-text font-medium">Latitude</div>
              <div className="text-xs text-text-muted mt-0.5">e.g. 40.7128</div>
            </div>
            <input
              type="text"
              value={locationDraft.weather_latitude}
              onChange={(e) => { setLocationDraft({ ...locationDraft, weather_latitude: e.target.value }); setLocationMsg(null); }}
              className="input !w-32 text-right"
              placeholder="0.0"
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm text-text font-medium">Longitude</div>
              <div className="text-xs text-text-muted mt-0.5">e.g. -74.0060</div>
            </div>
            <input
              type="text"
              value={locationDraft.weather_longitude}
              onChange={(e) => { setLocationDraft({ ...locationDraft, weather_longitude: e.target.value }); setLocationMsg(null); }}
              className="input !w-32 text-right"
              placeholder="0.0"
            />
          </div>
          <div className="flex items-center justify-end pt-2">
            <div className="flex items-center gap-3">
              {locationMsg && (
                <span className={`text-xs font-mono ${locationMsg.type === 'success' ? 'text-accent' : 'text-danger'}`}>{locationMsg.text}</span>
              )}
              <button
                onClick={handleSaveLocation}
                disabled={!locationDirty || locationSaving}
                className="btn-primary text-sm disabled:opacity-40"
              >
                {locationSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Database Health */}
      <div className="card p-5">
        <div className="section-title mb-4">Database Health</div>
        {dbStatsLoading ? (
          <div className="text-sm text-text-muted py-3 text-center">Loading...</div>
        ) : dbStats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-canvas-100 rounded-xl p-3 border border-surface-border">
                <div className="text-xs text-text-muted font-mono">Total Readings</div>
                <div className="text-lg text-text font-semibold font-mono">{dbStats.total_readings.toLocaleString()}</div>
              </div>
              <div className="bg-canvas-100 rounded-xl p-3 border border-surface-border">
                <div className="text-xs text-text-muted font-mono">Database Size</div>
                <div className="text-lg text-text font-semibold font-mono">{dbStats.database_size_human}</div>
              </div>
              <div className="bg-canvas-100 rounded-xl p-3 border border-surface-border">
                <div className="text-xs text-text-muted font-mono">Readings / Day</div>
                <div className="text-lg text-text font-semibold font-mono">{dbStats.readings_per_day_avg}</div>
              </div>
              <div className="bg-canvas-100 rounded-xl p-3 border border-surface-border">
                <div className="text-xs text-text-muted font-mono">Oldest Reading</div>
                <div className="text-sm text-text font-semibold font-mono">
                  {dbStats.oldest_reading ? new Date(dbStats.oldest_reading).toLocaleDateString() : 'None'}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-surface-border">
              <div className="text-xs text-text-muted">
                {dbStats.total_watering_logs} watering logs &middot; {dbStats.total_alerts} alerts
              </div>
              <button onClick={loadDbStats} className="btn-ghost text-xs !py-1 !px-3">Refresh</button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-muted py-3 text-center">Could not load database stats</div>
        )}
      </div>

      {/* Backup & Data Maintenance */}
      <div className="card p-5">
        <div className="section-title mb-4">Backup & Data Maintenance</div>
        <div className="space-y-4">
          {/* Download Backup */}
          <div className="flex items-center justify-between py-3 border-b border-surface-border">
            <div>
              <div className="text-sm text-text font-medium">Download Backup</div>
              <div className="text-xs text-text-muted mt-0.5">Safe copy of the database while the system is running</div>
            </div>
            <div className="flex items-center gap-3">
              {backupMsg && (
                <span className={`text-xs font-mono ${backupMsg.type === 'success' ? 'text-accent' : 'text-danger'}`}>{backupMsg.text}</span>
              )}
              <button
                onClick={handleDownloadBackup}
                disabled={backupDownloading}
                className="btn-primary text-sm disabled:opacity-40"
              >
                {backupDownloading ? 'Downloading...' : 'Download .db'}
              </button>
            </div>
          </div>

          {/* Auto-Cleanup Retention */}
          <div className="flex items-center justify-between py-3 border-b border-surface-border">
            <div>
              <div className="text-sm text-text font-medium">Auto-Cleanup Retention</div>
              <div className="text-xs text-text-muted mt-0.5">Readings older than this are deleted on server startup (7-365 days)</div>
            </div>
            <input
              type="number"
              value={retentionDraft}
              onChange={(e) => { setRetentionDraft(e.target.value); setRetentionMsg(null); }}
              className="input !w-24 text-right"
              min="7" max="365"
            />
          </div>
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-3">
              {retentionMsg && (
                <span className={`text-xs font-mono ${retentionMsg.type === 'success' ? 'text-accent' : 'text-danger'}`}>{retentionMsg.text}</span>
              )}
              <button
                onClick={handleSaveRetention}
                disabled={!retentionDirty || retentionSaving}
                className="btn-primary text-sm disabled:opacity-40"
              >
                {retentionSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Manual Cleanup */}
          <div className="border-t border-surface-border pt-4">
            <div className="text-sm text-text font-medium mb-2">Manual Cleanup</div>
            <div className="flex items-end gap-3">
              <div>
                <label className="text-xs text-text-muted font-mono block mb-1">Delete readings older than (days)</label>
                <input
                  type="number"
                  value={cleanupDays}
                  onChange={(e) => setCleanupDays(e.target.value)}
                  className="input !w-28"
                  min="1"
                />
              </div>
              <button onClick={handleCleanup} className="btn-danger text-sm">Clean Up</button>
            </div>
            {cleanupResult && (
              <div className="mt-3 text-sm text-accent font-mono">{cleanupResult}</div>
            )}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card p-5">
        <div className="section-title mb-4">About</div>
        <div className="text-sm text-text-secondary space-y-2">
          <p>Plant Water Array is a distributed plant moisture monitoring system using ESP32 sensors, a Python backend, and a React frontend.</p>
          <p className="text-text-muted font-mono text-xs mt-3">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
