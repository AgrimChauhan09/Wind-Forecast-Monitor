import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

export const WindChart = ({ data, loading }) => {
  const hasData = data && data.length > 0;

  // Show placeholder only on the very first load (no data yet)
  if (!hasData && loading) {
    return <div className="chart-card chart-card--placeholder">Loading data...</div>;
  }

  if (!hasData) {
    return <div className="chart-card chart-card--placeholder">No data for the selected range.</div>;
  }

  const formatted = data.map((d) => ({
    time: d.time,
    actual_generation: d.actual_generation,
    forecast_generation: d.forecast_generation,
    label: new Date(d.time).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  return (
    <div className={`chart-card${loading ? ' chart-card--stale' : ''}`}>
      {loading && <div className="chart-loading-overlay">Updating...</div>}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={formatted}
          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />

          <YAxis
            tick={{ fontSize: 11 }}
            domain={['auto', 'auto']}
          />

          <Tooltip
            formatter={(value) => `${value} MW`}
          />

          <Legend />

          <Line
            type="monotone"
            dataKey="actual_generation"
            name="Actual Generation"
            stroke="#4f8efa"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="forecast_generation"
            name="Forecast Generation"
            stroke="#35c86a"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
