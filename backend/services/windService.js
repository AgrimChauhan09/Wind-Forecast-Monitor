const axios = require('axios');
const { parseIsoDate, isWithinRange, toUtcISOString } = require('../utils/dateUtils');

// Use the /stream endpoints with correct date filter parameters
const ACTUAL_API_URL =
  'https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?fuelType=WIND&settlementDateFrom=2024-01-01&settlementDateTo=2024-01-31';

// For forecasts, publish time needs to start up to 48h before Jan 1 to capture all horizons
const FORECAST_API_URL =
  'https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom=2023-12-30T00:00:00Z&publishDateTimeTo=2024-01-31T23:59:59Z';

// January 2024 bounds in UTC
const JAN_START = new Date('2024-01-01T00:00:00Z');
const JAN_END = new Date('2024-02-01T00:00:00Z');

function extractRecords(responseData) {
  if (!responseData) return [];
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData.data)) return responseData.data;
  if (responseData.data && Array.isArray(responseData.data.data)) {
    return responseData.data.data;
  }
  return [];
}

function computeHorizonHours(targetTime, publishTime) {
  const target = new Date(targetTime);
  const publish = new Date(publishTime);
  const diffMs = target.getTime() - publish.getTime();
  return diffMs / (1000 * 60 * 60);
}

async function fetchActualGeneration() {
  try {
    const response = await axios.get(ACTUAL_API_URL);
    const records = extractRecords(response.data);

    return records
      .filter((r) => r && r.startTime && r.generation != null && r.fuelType === 'WIND')
      .map((r) => ({
        startTime: r.startTime,
        generation: Number(r.generation),
      }))
      .filter((r) => {
        const t = parseIsoDate(r.startTime);
        return isWithinRange(t, JAN_START, JAN_END);
      });
  } catch (error) {
    console.error('Failed to fetch actual generation', error.message);
    return [];
  }
}

async function fetchForecastGeneration() {
  try {
    const response = await axios.get(FORECAST_API_URL);
    const records = extractRecords(response.data);

    return records
      .filter((r) => r && r.startTime && r.publishTime && r.generation != null)
      .map((r) => ({
        startTime: r.startTime,
        publishTime: r.publishTime,
        generation: Number(r.generation),
      }))
      .filter((r) => {
        const t = parseIsoDate(r.startTime);
        return isWithinRange(t, JAN_START, JAN_END);
      });
  } catch (error) {
    console.error('Failed to fetch forecast generation', error.message);
    return [];
  }
}

async function getWindData({ startDate, endDate, horizonHours }) {
  const start = parseIsoDate(startDate);
  const endRaw = parseIsoDate(endDate);

  if (!start || !endRaw) {
    throw new Error('Invalid startDate or endDate');
  }

  // Make end date inclusive: extend to end of selected day
  const end = new Date(endRaw.getTime() + 24 * 60 * 60 * 1000);

  const [actual, forecast] = await Promise.all([
    fetchActualGeneration(),
    fetchForecastGeneration(),
  ]);

  const actualByTime = new Map();
  actual.forEach((item) => {
    const key = toUtcISOString(item.startTime);
    if (isWithinRange(parseIsoDate(item.startTime), start, end)) {
      actualByTime.set(key, item.generation);
    }
  });

  const forecastByTime = new Map();
  forecast.forEach((item) => {
    const horizon = computeHorizonHours(item.startTime, item.publishTime);
    if (horizon >= horizonHours && horizon <= 48) {
      const key = toUtcISOString(item.startTime);
      if (isWithinRange(parseIsoDate(item.startTime), start, end)) {
        const existing = forecastByTime.get(key);
        if (!existing || horizon < existing.horizon) {
          forecastByTime.set(key, {
            generation: item.generation,
            horizon,
          });
        }
      }
    }
  });

  const result = [];

  actualByTime.forEach((actualGen, key) => {
    const forecastEntry = forecastByTime.get(key);
    if (!forecastEntry) return;

    result.push({
      time: key,
      actual_generation: actualGen,
      forecast_generation: forecastEntry.generation,
    });
  });

  result.sort((a, b) => new Date(a.time) - new Date(b.time));

  return result;
}

module.exports = {
  getWindData,
};
