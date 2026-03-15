import React, { useEffect, useRef, useState } from 'react';
import { WindChart } from '../components/WindChart';
import { HorizonSlider } from '../components/HorizonSlider';
import { DateRangePicker } from '../components/DateRangePicker';
import { fetchWindData } from '../services/api';

const DEFAULT_START = '2024-01-01';
const DEFAULT_END = '2024-01-31';

const App = () => {
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);
  const [horizon, setHorizon] = useState(4);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track the request to ignore stale responses
  const requestIdRef = useRef(0);

  const loadData = async (params) => {
    const { startDate: sd, endDate: ed, horizon: h } = params;
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError(null);
      const result = await fetchWindData({ startDate: sd, endDate: ed, horizon: h });
      // Only apply if this is still the latest request
      if (requestId === requestIdRef.current) {
        setData(result);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError('Failed to load data. Please try again.');
        console.error(err);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData({ startDate: DEFAULT_START, endDate: DEFAULT_END, horizon: 4 });
  }, []);

  const handleApply = () => {
    loadData({ startDate, endDate, horizon });
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Wind Forecast Monitoring</h1>
      </header>
      <main className="app-main">
        <section className="controls">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <HorizonSlider value={horizon} onChange={setHorizon} />
          <button
            type="button"
            className={`apply-button${loading ? ' apply-button--loading' : ''}`}
            onClick={handleApply}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Apply'}
          </button>
        </section>
        <section className="chart-section">
          {error && <div className="error-banner">{error}</div>}
          <WindChart data={data} loading={loading} />
        </section>
      </main>
    </div>
  );
};

export default App;
