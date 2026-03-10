import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { createWateringLog } from '../api/api';

interface LogWateringModalProps {
  sensorId: number;
  open: boolean;
  onClose: () => void;
  onLogged: () => void;
}

const methods = [
  { value: 'manual', label: 'Manual' },
  { value: 'auto', label: 'Auto' },
  { value: 'rain', label: 'Rain' },
] as const;

const LogWateringModal: React.FC<LogWateringModalProps> = ({ sensorId, open, onClose, onLogged }) => {
  const [method, setMethod] = useState('manual');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await createWateringLog({ sensor_id: sensorId, method, notes: notes.trim() || undefined });
      setNotes('');
      setMethod('manual');
      onLogged();
      onClose();
    } catch (error) {
      console.error('Failed to log watering:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                   bg-canvas-50 border border-surface-border rounded-2xl shadow-card
                                   p-6 w-full max-w-sm animate-modal-slide-up">
          <Dialog.Title className="font-display text-xl text-text mb-4">
            Log Watering
          </Dialog.Title>

          {/* Method selector */}
          <div className="mb-4">
            <label className="text-xs text-text-muted font-mono block mb-2">Method</label>
            <div className="flex gap-1">
              {methods.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    method === m.value
                      ? 'bg-accent-glow text-accent border border-accent/20'
                      : 'text-text-muted hover:text-text hover:bg-canvas-200 border border-surface-border'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-5">
            <label className="text-xs text-text-muted font-mono block mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full h-20 resize-none"
              placeholder="e.g. Deep watering, fertilizer added..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

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

export default LogWateringModal;
