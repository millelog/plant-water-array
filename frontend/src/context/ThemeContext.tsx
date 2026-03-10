import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

type Theme = 'dark' | 'light';

export interface ChartColors {
  canvas: string;
  surface: string;
  accent: string;
  accentDim: string;
  soil: string;
  danger: string;
  textMuted: string;
  textSecondary: string;
  gridStroke: string;
  axisStroke: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipShadow: string;
  soilAxisStroke: string;
  checkboxBorder: string;
  areaOpacity: number;
  bandOpacityTop: number;
  bandOpacityBottom: number;
}

const DARK_CHART_COLORS: ChartColors = {
  canvas: '#0c1117',
  surface: '#182028',
  accent: '#34d399',
  accentDim: '#10b981',
  soil: '#d97706',
  danger: '#f87171',
  textMuted: '#5c6f7e',
  textSecondary: '#8899a6',
  gridStroke: 'rgba(148, 163, 184, 0.06)',
  axisStroke: 'rgba(148, 163, 184, 0.1)',
  tooltipBg: '#182028',
  tooltipBorder: 'rgba(148, 163, 184, 0.15)',
  tooltipShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
  soilAxisStroke: 'rgba(217, 119, 6, 0.3)',
  checkboxBorder: 'rgba(148, 163, 184, 0.3)',
  areaOpacity: 0.3,
  bandOpacityTop: 0.1,
  bandOpacityBottom: 0.05,
};

const LIGHT_CHART_COLORS: ChartColors = {
  canvas: '#f8fafb',
  surface: '#ffffff',
  accent: '#10b981',
  accentDim: '#059669',
  soil: '#b45309',
  danger: '#dc2626',
  textMuted: '#8899a6',
  textSecondary: '#526170',
  gridStroke: 'rgba(15, 23, 42, 0.06)',
  axisStroke: 'rgba(15, 23, 42, 0.08)',
  tooltipBg: '#ffffff',
  tooltipBorder: 'rgba(15, 23, 42, 0.12)',
  tooltipShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
  soilAxisStroke: 'rgba(180, 83, 9, 0.3)',
  checkboxBorder: 'rgba(15, 23, 42, 0.2)',
  areaOpacity: 0.2,
  bandOpacityTop: 0.08,
  bandOpacityBottom: 0.03,
};

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  chartColors: ChartColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  chartColors: DARK_CHART_COLORS,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return stored === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f8fafb' : '#0c1117');
    }
  }, [theme]);

  useEffect(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transition');
    });
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const chartColors = useMemo(
    () => theme === 'dark' ? DARK_CHART_COLORS : LIGHT_CHART_COLORS,
    [theme]
  );

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, chartColors }}>
      {children}
    </ThemeContext.Provider>
  );
};
