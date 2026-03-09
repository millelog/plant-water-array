import React, { useEffect, useState } from 'react';
import { getFirmwareList, uploadFirmware, deleteFirmware } from '../api/api';
import DataTable from '../components/DataTable';
import { FirmwareInfo } from '../types';

const Firmware: React.FC = () => {
  const [firmwareList, setFirmwareList] = useState<FirmwareInfo[]>([]);
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFirmware();
  }, []);

  async function fetchFirmware() {
    try {
      const data = await getFirmwareList();
      setFirmwareList(data);
    } catch {
      console.error('Failed to fetch firmware list');
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await uploadFirmware(version, notes, files);
      setVersion('');
      setNotes('');
      setFiles([]);
      fetchFirmware();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(firmwareVersion: string) {
    if (!confirm(`Delete firmware version ${firmwareVersion}?`)) return;
    try {
      await deleteFirmware(firmwareVersion);
      fetchFirmware();
    } catch {
      console.error('Failed to delete firmware');
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  const columns = [
    {
      Header: 'Version',
      accessor: 'version',
      Cell: ({ value }: { value: string }) => (
        <span className="badge bg-canvas-200 text-text-secondary border border-surface-border">v{value}</span>
      ),
    },
    {
      Header: 'Upload Date',
      accessor: 'upload_timestamp',
      Cell: ({ value }: { value: string }) => (
        <span className="text-sm font-mono text-text-secondary">
          {new Date(value).toLocaleDateString()} {new Date(value).toLocaleTimeString()}
        </span>
      ),
    },
    {
      Header: 'Size',
      accessor: 'size_bytes',
      Cell: ({ value }: { value: number }) => (
        <span className="data-value text-sm">{formatBytes(value)}</span>
      ),
    },
    {
      Header: 'Checksum',
      accessor: 'checksum',
      Cell: ({ value }: { value: string }) => (
        <span className="font-mono text-xs text-text-muted">{value.substring(0, 12)}...</span>
      ),
    },
    {
      Header: 'Notes',
      accessor: 'notes',
      Cell: ({ value }: { value: string | null }) => (
        <span className="text-sm text-text-secondary">{value || '\u2014'}</span>
      ),
    },
    {
      Header: '',
      accessor: 'actions',
      Cell: (_: { value: unknown }, row: FirmwareInfo) => (
        <button
          onClick={() => handleDelete(row.version)}
          className="btn-danger text-xs py-1.5 px-3"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload form */}
      <div className="card p-5">
        <div className="section-title mb-4">Upload Firmware</div>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger-glow border border-danger/20 text-sm text-danger">
            {error}
          </div>
        )}
        <form onSubmit={handleUpload}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-1.5">Version</label>
              <input
                type="text"
                placeholder="e.g. 1.0.1"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-1.5">Notes</label>
              <input
                type="text"
                placeholder="Optional release notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-1.5">Firmware Files (.py)</label>
            <input
              type="file"
              multiple
              accept=".py"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="input file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0
                         file:text-xs file:font-medium file:bg-accent-glow file:text-accent
                         file:cursor-pointer hover:file:bg-accent/20"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="btn-primary"
          >
            {uploading ? 'Uploading...' : 'Upload Firmware'}
          </button>
        </form>
      </div>

      {/* Firmware list */}
      <div>
        <div className="section-title mb-3">Available Versions</div>
        <DataTable columns={columns} data={firmwareList} />
      </div>
    </div>
  );
};

export default Firmware;
