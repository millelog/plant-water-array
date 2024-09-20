import React, { useEffect, useState } from 'react';
import { getReadings } from '../api/api';
import DataTable from '../components/DataTable';
import { Reading } from '../types';

const Readings: React.FC = () => {
  const [readings, setReadings] = useState<Reading[]>([]);

  useEffect(() => {
    fetchReadings();
  }, []);

  async function fetchReadings() {
    const readingsData = await getReadings();
    setReadings(readingsData);
  }

  const readingsColumns = [
    { Header: 'Sensor ID', accessor: 'sensor_id' },
    { Header: 'Moisture', accessor: 'moisture' },
    {
      Header: 'Timestamp',
      accessor: 'timestamp',
      Cell: (row: Reading) => new Date(row.timestamp).toLocaleString(),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Readings</h1>
      <DataTable columns={readingsColumns} data={readings} />
    </div>
  );
};

export default Readings;
