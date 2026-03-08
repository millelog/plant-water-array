import React from 'react';

const DeviceSetupInstructions: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-4">
      <h2 className="text-2xl font-bold mb-4">How to Set Up a New Device</h2>

      <h3 className="text-lg font-semibold mt-4 mb-2">Initial Setup</h3>
      <ol className="list-decimal list-inside space-y-2">
        <li>Flash the firmware to your ESP32 via USB (one-time only).</li>
        <li>Power on the device.</li>
        <li>On your phone or computer, find the WiFi network <strong>PlantSensor_XXXX</strong> (the last 4 characters are unique to each device).</li>
        <li>Connect with password <strong>plantsetup</strong>.</li>
        <li>A setup page should open automatically. If not, open a browser and go to <strong>http://192.168.4.1</strong>.</li>
        <li>Select your WiFi network from the dropdown.</li>
        <li>Enter your WiFi password.</li>
        <li>Confirm or edit the server URL.</li>
        <li>Name your device.</li>
        <li>Click <strong>Save & Connect</strong>.</li>
        <li>The device reboots, connects to your WiFi, and appears in the list within ~1 minute.</li>
      </ol>

      <h3 className="text-lg font-semibold mt-6 mb-2">Troubleshooting</h3>
      <ul className="list-disc list-inside space-y-2 text-gray-700">
        <li><strong>Device not appearing?</strong> Double-check your WiFi credentials and that the server is reachable from the device's network.</li>
        <li><strong>Need to re-provision a device?</strong> Hold the <strong>BOOT</strong> button for 5 seconds during startup. This clears the configuration and re-enters setup mode.</li>
        <li><strong>Setting up multiple devices?</strong> Each device broadcasts a unique AP name based on its MAC address (PlantSensor_XXXX).</li>
        <li><strong>Future firmware updates</strong> are delivered automatically over-the-air (OTA) — no USB needed after initial flash.</li>
      </ul>
    </div>
  );
};

export default DeviceSetupInstructions;
