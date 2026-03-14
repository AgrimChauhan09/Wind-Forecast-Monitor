import React from 'react';

export const DateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  return (
    <div className="control-card">
      <h2 className="control-title">Date Range</h2>

      <div className="date-row">
        <label className="field">
          <span>Start</span>
          <input
            type="date"
            value={startDate}
            min="2024-01-01"
            max="2024-01-31"
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </label>

        <label className="field">
          <span>End</span>
          <input
            type="date"
            value={endDate}
            min="2024-01-01"
            max="2024-01-31"
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </label>
      </div>

      <p className="helper-text">
        Data available for January 2024 only.
      </p>
    </div>
  );
};
