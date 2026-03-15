const axios = require('axios');
const { parseIsoDate, isWithinRange, toUtcISOString } = require('../utils/dateUtils');

const ACTUAL_API_URL =
  'https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?fuelType=WIND&settlementDateFrom=2024-01-01&settlementDateTo=2024-01-31';

const FORECAST_API_URL =
  'https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom=2023-12-30T00:00:00Z&publishDateTimeTo=2024-01-31T23:59:59Z';

const JAN_START = new Date('2024-01-01T00:00:00Z');
const JAN_END = new Date('2024-02-01T00:00:00Z');

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// In-memory cache
let cache = null;
let cacheTimestamp = null;
let cachePromise = null;

function extractRecords(responseData) {
  if (!responseData) return [];
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData.data)) return responseData.data;
  if (responseData.data && Array.isArray(responseData.data.data)) {
    return responseData.data.data;
  }
  return [];
}

async function loadFromAPIs() {
  console.log('[cache] Fetching data from external APIs...');
  const [actualRes, forecastRes] = await Promise.all([
    axios.get(ACTUAL_API_URL),
    axios.get(FORECAST_API_URL),
  ]);

  // Build actual map: ISO string -> MW
  const actualByTime = new Map();
  extractRecords(actualRes.data)
    .filter((r) => r && r.startTime && r.generation != null && r.fuelType === 'WIND')
    .forEach((r) => {
      const t = parseIsoDate(r.startTime);
      if (!t || !isWithinRange(t, JAN_START, JAN_END)) return;
      const key = toUtcISOString(r.startTime);
      actualByTime.set(key, Number(r.generation));
    });

  // Build forecast list with pre-computed horizon and pre-parsed timestamps
  const forecastList = [];
  extractRecords(forecastRes.data)
    .filter((r) => r && r.startTime && r.publishTime && r.generation != null)
    .forEach((r) => {
      const startMs = new Date(r.startTime).getTime();
      const publishMs = new Date(r.publishTime).getTime();
      if (isNaN(startMs) || isNaN(publishMs)) return;
      const startDate = new Date(startMs);
      if (!isWithinRange(startDate, JAN_START, JAN_END)) return;
      const horizonHours = (startMs - publishMs) / (1000 * 60 * 60);
      forecastList.push({
        startMs,
        startISO: toUtcISOString(r.startTime),
        horizonHours,
        generation: Number(r.generation),
      });
    });

  console.log(`[cache] Loaded ${actualByTime.size} actuals, ${forecastList.length} forecasts`);
  return { actualByTime, forecastList };
}

async function getCachedData() {
  // Return valid cache immediately
  if (cache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cache;
  }

  // Coalesce concurrent requests into a single fetch
  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = loadFromAPIs()
    .then((data) => {
      cache = data;
      cacheTimestamp = Date.now();
      cachePromise = null;
      return data;
    })
    .catch((err) => {
      cachePromise = null;
      throw err;
    });

  return cachePromise;
}

async function getWindData({ startDate, endDate, horizonHours }) {
  const start = parseIsoDate(startDate);
  const endRaw = parseIsoDate(endDate);

  if (!start || !endRaw) {
    throw new Error('Invalid startDate or endDate');
  }

  // Make end inclusive: extend to end of selected day
  const endMs = endRaw.getTime() + 24 * 60 * 60 * 1000;
  const startMs = start.getTime();

  // Use cached data — no external API call after first load
  const { actualByTime, forecastList } = await getCachedData();

  // Filter actuals to selected date range
  const filteredActuals = new Map();
  actualByTime.forEach((gen, key) => {
    const t = new Date(key).getTime();
    if (t >= startMs && t < endMs) {
      filteredActuals.set(key, gen);
    }
  });

  // Filter forecasts: horizon in [horizonHours, 48], date in range, pick smallest qualifying horizon per startTime
  const forecastByTime = new Map();
  forecastList.forEach((item) => {
    if (item.startMs < startMs || item.startMs >= endMs) return;
    if (item.horizonHours < horizonHours || item.horizonHours > 48) return;
    const existing = forecastByTime.get(item.startISO);
    if (!existing || item.horizonHours < existing.horizonHours) {
      forecastByTime.set(item.startISO, item);
    }
  });

  // Merge: only include timestamps present in both datasets
  const result = [];
  filteredActuals.forEach((actualGen, key) => {
    const fc = forecastByTime.get(key);
    if (!fc) return;
    result.push({
      time: key,
      actual_generation: actualGen,
      forecast_generation: fc.generation,
    });
  });

  result.sort((a, b) => new Date(a.time) - new Date(b.time));
  return result;
}

// Warm up the cache as soon as the service loads
getCachedData().catch((e) => console.error('[cache] Warmup failed:', e.message));

module.exports = { getWindData };
