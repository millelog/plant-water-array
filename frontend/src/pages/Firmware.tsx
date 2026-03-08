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
    { Header: 'Version', accessor: 'version' },
    {
      Header: 'Upload Date',
      accessor: 'upload_timestamp',
      Cell: ({ value }: { value: string }) =>
        new Date(value).toLocaleDateString() + ' ' + new Date(value).toLocaleTimeString(),
    },
    {
      Header: 'Size',
      accessor: 'size_bytes',
      Cell: ({ value }: { value: number }) => formatBytes(value),
    },
    {
      Header: 'Checksum',
      accessor: 'checksum',
      Cell: ({ value }: { value: string }) => (
        <span className="font-mono text-xs">{value.substring(0, 12)}...</span>
      ),
    },
    {
      Header: 'Notes',
      accessor: 'notes',
      Cell: ({ value }: { value: string | null }) => value || '-',
    },
    {
      Header: 'Actions',
      accessor: 'actions',
      Cell: (_: { value: unknown }, row: FirmwareInfo) => (
        <button
          onClick={() => handleDelete(row.version)}
          className="text-red-600 hover:underline"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Firmware Management</h1>

      <form className="mb-6 bg-white shadow-md rounded-lg p-6" onSubmit={handleUpload}>
        <h2 className="text-lg font-semibold mb-3">Upload New Firmware</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-3">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
            <input
              type="text"
              placeholder="e.g. 1.0.1"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="border p-2 w-full rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              placeholder="Optional release notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border p-2 w-full rounded"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Firmware Files (.py)</label>
          <input
            type="file"
            multiple
            accept=".py"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="border p-2 w-full rounded"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload Firmware'}
        </button>
      </form>

      <h2 className="text-lg font-semibold mb-3">Available Versions</h2>
      <DataTable columns={columns} data={firmwareList} />
    </div>
  );
};

export default Firmware;
