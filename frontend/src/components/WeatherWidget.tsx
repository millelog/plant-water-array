import React, { useState, useEffect } from 'react';
import { getSystemConfig } from '../api/api';

interface WeatherData {
  temperature: number;
  humidity: number;
}

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      try {
        const config = await getSystemConfig();
        if (!config.weather_latitude || !config.weather_longitude) {
          setConfigured(false);
          return;
        }
        setConfigured(true);

        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${config.weather_latitude}&longitude=${config.weather_longitude}&current=temperature_2m,relative_humidity_2m&temperature_unit=fahrenheit`
        );
        const data = await res.json();
        if (!cancelled && data.current) {
          setWeather({
            temperature: data.current.temperature_2m,
            humidity: data.current.relative_humidity_2m,
          });
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (!configured || !weather) return null;

  return (
    <div className="card px-4 py-3 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-soil flex-shrink-0">
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="text-lg font-mono font-bold text-text">{Math.round(weather.temperature)}&deg;F</span>
      </div>
      <div className="w-px h-5 bg-surface-border" />
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-accent flex-shrink-0">
          <path d="M12 2c0 0-7 8.5-7 13a7 7 0 1 0 14 0c0-4.5-7-13-7-13z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="text-sm font-mono text-text-secondary">{weather.humidity}%</span>
        <span className="text-xs text-text-muted">humidity</span>
      </div>
    </div>
  );
};

export default WeatherWidget;
