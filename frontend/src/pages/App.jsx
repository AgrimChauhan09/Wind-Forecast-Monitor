import React, { useEffect, useState } from 'react';
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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWindData({ startDate, endDate, horizon });
      setData(result);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApply = () => {
    loadData();
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
          <button type="button" className="apply-button" onClick={handleApply}>
            Apply
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
