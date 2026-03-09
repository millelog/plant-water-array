import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card p-5">
        <div className="section-title mb-4">System Configuration</div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-surface-border">
            <div>
              <div className="text-sm text-text font-medium">API Endpoint</div>
              <div className="text-xs text-text-muted mt-0.5">Backend server address</div>
            </div>
            <span className="data-value text-sm">localhost:8000</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-surface-border">
            <div>
              <div className="text-sm text-text font-medium">Polling Interval</div>
              <div className="text-xs text-text-muted mt-0.5">How often devices send readings</div>
            </div>
            <span className="data-value text-sm">30s</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm text-text font-medium">Device Timeout</div>
              <div className="text-xs text-text-muted mt-0.5">Time before marking device offline</div>
            </div>
            <span className="data-value text-sm">5m</span>
          </div>
        </div>
      </div>

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
