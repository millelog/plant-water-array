import React from 'react';

const DeviceSetupInstructions: React.FC = () => {
  return (
    <div className="card p-6">
      <div className="section-title mb-5">How to Set Up a New Device</div>

      <div className="space-y-3 mb-6">
        {[
          'Flash the firmware to your ESP32 via USB (one-time only).',
          'Power on the device.',
          <>On your phone or computer, find the WiFi network <span className="data-value">PlantSensor_XXXX</span> (last 4 characters are unique).</>,
          <>Connect with password <span className="data-value">plantsetup</span>.</>,
          <>A setup page should open automatically. If not, go to <span className="data-value">192.168.4.1</span>.</>,
          'Select your WiFi network from the dropdown.',
          'Enter your WiFi password.',
          'Confirm or edit the server URL.',
          'Name your device.',
          <>Click <strong className="text-text">Save & Connect</strong>.</>,
          'The device reboots, connects to WiFi, and appears in the list within ~1 minute.',
        ].map((text, i) => (
          <div key={i} className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-lg bg-canvas-200 border border-surface-border flex items-center justify-center
                           text-xs font-mono text-text-muted flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-text-secondary leading-relaxed">{text}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-surface-border pt-5">
        <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Troubleshooting</div>
        <div className="space-y-2 text-sm text-text-secondary">
          <p><strong className="text-text">Device not appearing?</strong> Check WiFi credentials and that the server is reachable.</p>
          <p><strong className="text-text">Re-provision?</strong> Hold the BOOT button for 5 seconds during startup to clear config.</p>
          <p><strong className="text-text">Multiple devices?</strong> Each broadcasts a unique AP name based on MAC address.</p>
          <p><strong className="text-text">Firmware updates</strong> are delivered OTA after initial flash &mdash; no USB needed.</p>
        </div>
      </div>
    </div>
  );
};

export default DeviceSetupInstructions;
