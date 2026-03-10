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

const steps: { key: Step; label: string; number: number }[] = [
  { key: 'dry', label: 'Dry', number: 1 },
  { key: 'wet', label: 'Wet', number: 2 },
  { key: 'confirm', label: 'Confirm', number: 3 },
];

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
  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                   bg-canvas-50 border border-surface-border rounded-2xl shadow-card
                                   p-6 w-full max-w-md animate-modal-slide-up">
          <Dialog.Title className="font-display text-xl text-text mb-1">
            Calibrate Sensor
          </Dialog.Title>
          <div className="text-sm text-text-muted mb-5">
            {sensor.name || `Sensor ${sensor.sensor_id}`}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map((s, i) => (
              <React.Fragment key={s.key}>
                <div className={`flex items-center gap-2 ${i <= currentStepIndex ? 'text-accent' : 'text-text-muted'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold
                    ${i < currentStepIndex ? 'bg-accent text-canvas' :
                      i === currentStepIndex ? 'bg-accent-glow border border-accent/30 text-accent' :
                      'bg-canvas-200 text-text-muted border border-surface-border'}`}>
                    {i < currentStepIndex ? '✓' : s.number}
                  </div>
                  <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px ${i < currentStepIndex ? 'bg-accent/40' : 'bg-surface-border'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {isCalibrated && (
            <div className="mb-4 p-3 rounded-xl bg-accent-glow border border-accent/15 text-sm">
              <p className="font-medium text-accent text-xs uppercase tracking-wider mb-1">Current Calibration</p>
              <p className="text-text-secondary font-mono text-sm">
                Dry: {sensor.calibration_dry} &middot; Wet: {sensor.calibration_wet}
              </p>
              <button
                onClick={handleClear}
                disabled={saving}
                className="mt-2 text-danger text-xs font-medium hover:underline"
              >
                Clear Calibration
              </button>
            </div>
          )}

          {noData && (
            <div className="mb-4 p-3 rounded-xl bg-soil-glow border border-soil/15 text-sm text-soil">
              No raw ADC data available. Make sure the sensor is sending readings.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-danger-glow border border-danger/20 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Live ADC display */}
          {(step === 'dry' || step === 'wet') && (
            <div className="mb-5 p-4 rounded-xl bg-canvas-100 border border-surface-border">
              <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">Live Raw ADC</div>
              <div className="text-4xl font-mono font-bold text-accent">
                {liveRaw !== null ? liveRaw : '--'}
              </div>
              {liveTimestamp && (
                <div className="text-xs text-text-muted font-mono mt-1">
                  {formatTimestamp(liveTimestamp)}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Dry */}
          {step === 'dry' && (
            <div>
              <p className="mb-4 text-sm text-text-secondary">
                Place the sensor in <strong className="text-text">dry air</strong> or dry soil, then record the value once it stabilizes.
              </p>
              <button
                onClick={handleRecordDry}
                disabled={liveRaw === null}
                className="btn-primary w-full justify-center"
              >
                Record Dry Value
              </button>
            </div>
          )}

          {/* Step 2: Wet */}
          {step === 'wet' && (
            <div>
              <div className="mb-3 p-3 rounded-xl bg-accent-glow border border-accent/15 text-sm">
                <span className="text-text-muted">Dry value:</span>{' '}
                <span className="font-mono font-bold text-accent">{dryValue}</span>
              </div>
              <p className="mb-4 text-sm text-text-secondary">
                Now place the sensor in <strong className="text-text">water</strong> or saturated soil, then record the value.
              </p>
              <button
                onClick={handleRecordWet}
                disabled={liveRaw === null}
                className="btn-primary w-full justify-center"
              >
                Record Wet Value
              </button>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div>
              <div className="mb-4 space-y-2">
                <div className="p-3 rounded-xl bg-canvas-100 border border-surface-border flex justify-between items-center">
                  <span className="text-sm text-text-muted">Dry (air)</span>
                  <span className="font-mono font-bold text-text">{dryValue}</span>
                </div>
                <div className="p-3 rounded-xl bg-canvas-100 border border-surface-border flex justify-between items-center">
                  <span className="text-sm text-text-muted">Wet (water)</span>
                  <span className="font-mono font-bold text-text">{wetValue}</span>
                </div>
              </div>
              {dryValue !== null && wetValue !== null && dryValue === wetValue && (
                <div className="mb-4 p-3 rounded-xl bg-soil-glow border border-soil/15 text-sm text-soil">
                  Dry and wet values are the same. Calibration won't produce meaningful results.
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('dry'); setDryValue(null); setWetValue(null); }}
                  className="btn-secondary flex-1 justify-center"
                >
                  Start Over
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex-1 justify-center"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-text-muted hover:text-text text-lg leading-none
                             w-7 h-7 flex items-center justify-center rounded-lg hover:bg-canvas-200 transition-colors"
                    aria-label="Close">
              &times;
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CalibrationWizard;
