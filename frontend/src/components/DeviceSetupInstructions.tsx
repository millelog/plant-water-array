import React from 'react';

const DeviceSetupInstructions: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">How to Set Up Your New Device</h2>
      <ol className="list-decimal list-inside space-y-2">
        <li>Power on your new ESP32 device.</li>
        <li>Look for a new WiFi network named "NewDevice_XXXX" on your phone or computer.</li>
        <li>Connect to this network using the password "setuppassword".</li>
        <li>You should be automatically redirected to a setup page. If not, open a web browser and go to "http://192.168.4.1".</li>
        <li>On the setup page, enter a name for your device and your home WiFi details.</li>
        <li>Click "Save and Connect".</li>
        <li>Your device will connect to your home WiFi and register itself with our system.</li>
        <li>Once complete, you'll see the new device appear in your devices list.</li>
      </ol>
    </div>
  );
};

export default DeviceSetupInstructions;