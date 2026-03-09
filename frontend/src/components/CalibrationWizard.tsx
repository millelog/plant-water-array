import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Sensor } from '../types';
import { calibrateSensor, getLatestRawReading } from '../api/api';

interface CalibrationWizardProps {
  sensor: Sensor;
  open: boolean;
  onClose: () => void;
  onCalibrated: () => void;
}

type Step = 'dry' | 'wet' | 'confirm';

const CalibrationWizard: React.FC<CalibrationWizardProps> = ({ sensor, open, onClose, onCalibrated }) => {
  const [step, setStep] = useState<Step>('dry');
  const [liveRaw, setLiveRaw] = useState<number | null>(null);
  const [liveTimestamp, setLiveTimestamp] = useState<string | null>(null);
  const [dryValue, setDryValue] = useState<number | null>(null);
  const [wetValue, setWetValue] = useState<number | null>(null);
  const [noData, setNoData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollRaw = useCallback(async () => {
    try {
      const data = await getLatestRawReading(sensor.id);
      setLiveRaw(data.raw_adc);
      setLiveTimestamp(data.timestamp);
      setNoData(false);
    } catch {
      setNoData(true);
      setLiveRaw(null);
      setLiveTimestamp(null);
    }
  }, [sensor.id]);

  useEffect(() => {
    if (!open) return;
    setStep('dry');
    setDryValue(null);
    setWetValue(null);
    setError(null);
    setNoData(false);
    setSaving(false);
    pollRaw();
    intervalRef.current = setInterval(pollRaw, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, pollRaw]);

  const handleRecordDry = () => {
    if (liveRaw !== null) {
      setDryValue(liveRaw);
      setStep('wet');
    }
  };

  const handleRecordWet = () => {
    if (liveRaw !== null) {
      setWetValue(liveRaw);
      setStep('confirm');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await calibrateSensor(sensor.id, {
        calibration_dry: dryValue,
        calibration_wet: wetValue,
      });
      onCalibrated();
      onClose();
    } catch {
      setError('Failed to save calibration');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setError(null);
    try {
      await calibrateSensor(sensor.id, {
        calibration_dry: null,
        calibration_wet: null,
      });
      onCalibrated();
      onClose();
    } catch {
      setError('Failed to clear calibration');
    } finally {
      setSaving(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const cleaned = ts.replace(/\.\d+/, '');
      return new Date(cleaned).toLocaleString();
    } catch {
      return ts;
    }
  };

  const isCalibrated = sensor.calibration_dry !== null && sensor.calibration_wet !== null;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <Dialog.Title className="text-xl font-bold mb-4">
            Calibrate: {sensor.name || `Sensor ${sensor.sensor_id}`}
          </Dialog.Title>

          {isCalibrated && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <p className="font-medium text-blue-800">Current calibration</p>
              <p className="text-blue-700">Dry: {sensor.calibration_dry} | Wet: {sensor.calibration_wet}</p>
              <button
                onClick={handleClear}
                disabled={saving}
                className="mt-2 text-red-600 hover:underline text-sm"
              >
                Clear Calibration
              </button>
            </div>
          )}

          {noData && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
              No raw ADC data available. Make sure the sensor is sending readings with updated firmware.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Live ADC display */}
          {(step === 'dry' || step === 'wet') && (
            <div className="mb-4 p-4 bg-gray-50 rounded border">
              <div className="text-sm text-gray-500">Live Raw ADC</div>
              <div className="text-3xl font-mono font-bold">
                {liveRaw !== null ? liveRaw : '--'}
              </div>
              {liveTimestamp && (
                <div className="text-xs text-gray-400 mt-1">
                  Last reading: {formatTimestamp(liveTimestamp)}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Dry */}
          {step === 'dry' && (
            <div>
              <p className="mb-4 text-gray-600">
                Place the sensor in <strong>dry air</strong> (or dry soil), then record the value once it stabilizes.
              </p>
              <button
                onClick={handleRecordDry}
                disabled={liveRaw === null}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Record Dry Value
              </button>
            </div>
          )}

          {/* Step 2: Wet */}
          {step === 'wet' && (
            <div>
              <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                Dry value recorded: <strong className="font-mono">{dryValue}</strong>
              </div>
              <p className="mb-4 text-gray-600">
                Now place the sensor in <strong>water</strong> (or fully saturated soil), then record the value once it stabilizes.
              </p>
              <button
                onClick={handleRecordWet}
                disabled={liveRaw === null}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Record Wet Value
              </button>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div>
              <div className="mb-4 space-y-2">
                <div className="p-3 bg-gray-50 rounded border flex justify-between">
                  <span className="text-gray-600">Dry (air)</span>
                  <span className="font-mono font-bold">{dryValue}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded border flex justify-between">
                  <span className="text-gray-600">Wet (water)</span>
                  <span className="font-mono font-bold">{wetValue}</span>
                </div>
              </div>
              {dryValue !== null && wetValue !== null && dryValue === wetValue && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                  Dry and wet values are the same. Calibration won't produce meaningful results.
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('dry'); setDryValue(null); setWetValue(null); }}
                  className="flex-1 border border-gray-300 py-2 px-4 rounded hover:bg-gray-50"
                >
                  Start Over
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Calibration'}
                </button>
              </div>
            </div>
          )}

          <Dialog.Close asChild>
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">
              &times;
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CalibrationWizard;
