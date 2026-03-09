import React, { useState, useEffect } from 'react';
import { getAggregatedReadings, getDryingRate, getWateringLogs } from '../api/api';

interface PlantInsightsProps {
  sensorId: number;
}

const PlantInsights: React.FC<PlantInsightsProps> = ({ sensorId }) => {
  const [avgMoisture, setAvgMoisture] = useState<number | null>(null);
  const [ratePerDay, setRatePerDay] = useState<number | null>(null);
  const [daysUntilDry, setDaysUntilDry] = useState<number | null>(null);
  const [wateringsThisMonth, setWateringsThisMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      try {
        const [aggRes, dryingRes, wateringRes] = await Promise.all([
          getAggregatedReadings(sensorId, 'daily', sevenDaysAgo).catch(() => null),
          getDryingRate(sensorId).catch(() => null),
          getWateringLogs(sensorId, { start_time: firstOfMonth }).catch(() => null),
        ]);

        if (aggRes && aggRes.data.length > 0) {
          const totalAvg = aggRes.data.reduce((sum, d) => sum + d.avg_moisture, 0) / aggRes.data.length;
          setAvgMoisture(totalAvg);
        }

        if (dryingRes) {
          setRatePerDay(dryingRes.rate_per_day);
          setDaysUntilDry(dryingRes.estimated_days_until_dry);
        }

        if (wateringRes) {
          setWateringsThisMonth(wateringRes.length);
        }
      } catch (error) {
        console.error('Error loading insights:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sensorId]);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="section-title mb-4">Plant Insights</div>
        <div className="text-sm text-text-muted italic">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="section-title mb-4">Plant Insights</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-canvas-100 rounded-xl p-4">
          <div className="text-xs font-mono text-text-muted uppercase mb-1">Avg Moisture (7d)</div>
          <div className="data-value text-2xl">
            {avgMoisture !== null ? `${avgMoisture.toFixed(1)}%` : 'N/A'}
          </div>
        </div>
        <div className="bg-canvas-100 rounded-xl p-4">
          <div className="text-xs font-mono text-text-muted uppercase mb-1">Drying Rate</div>
          <div className="data-value text-2xl">
            {ratePerDay !== null && ratePerDay > 0 ? `${ratePerDay.toFixed(1)}% / day` : 'Not enough data'}
          </div>
        </div>
        <div className="bg-canvas-100 rounded-xl p-4">
          <div className="text-xs font-mono text-text-muted uppercase mb-1">Days Until Dry</div>
          <div className="data-value text-2xl">
            {daysUntilDry !== null ? `~${Math.round(daysUntilDry)} days` : 'N/A'}
          </div>
        </div>
        <div className="bg-canvas-100 rounded-xl p-4">
          <div className="text-xs font-mono text-text-muted uppercase mb-1">Waterings This Month</div>
          <div className="data-value text-2xl">
            {wateringsThisMonth !== null ? wateringsThisMonth : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlantInsights;
