import React from 'react';

export const HorizonSlider = ({ value, onChange }) => {
  return (
    <div className="control-card">
      <h2 className="control-title">Forecast Horizon</h2>
      <div className="slider-row">
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="slider-value">{value}h</span>
      </div>
      <p className="helper-text">Only forecasts issued at least this many hours before target time.</p>
    </div>
  );
};
