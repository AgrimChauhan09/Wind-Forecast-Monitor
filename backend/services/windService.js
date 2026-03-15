const axios = require("axios");
const {
  parseIsoDate,
  isWithinRange,
  toUtcISOString,
} = require("../utils/dateUtils");

// API which gives actual wind generation for each settlement period
const ACTUAL_API_URL =
  "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?fuelType=WIND&settlementDateFrom=2024-01-01&settlementDateTo=2024-01-31";

// API which gives forecasted wind generation
const FORECAST_API_URL =
  "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom=2023-12-30T00:00:00Z&publishDateTimeTo=2024-01-31T23:59:59Z";

// Date range for January dataset
const JAN_START = new Date("2024-01-01T00:00:00Z");
const JAN_END = new Date("2024-02-01T00:00:00Z");

// Cache TTL (1 hour). After this we reload data again.
const CACHE_TTL_MS = 60 * 60 * 1000;

// Simple in-memory cache variables
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
  const [actualRes, forecastRes] = await Promise.all([
    axios.get(ACTUAL_API_URL),
    axios.get(FORECAST_API_URL),
  ]);

  const actualByTime = new Map();

  extractRecords(actualRes.data)
    .filter(
      (r) => r && r.startTime && r.generation != null && r.fuelType === "WIND",
    )
    .forEach((r) => {
      const t = parseIsoDate(r.startTime);
      if (!t || !isWithinRange(t, JAN_START, JAN_END)) return;

      const key = toUtcISOString(r.startTime);

      // Store actual generation by timestamp
      actualByTime.set(key, Number(r.generation));
    });

  /*
    Forecasts are stored in a list instead of a map because
    the same timestamp can have multiple forecasts published
    at different times (different horizons).

    We will later pick the best forecast based on horizon.
  */
  const forecastList = [];

  extractRecords(forecastRes.data)
    .filter((r) => r && r.startTime && r.publishTime && r.generation != null)
    .forEach((r) => {
      const startMs = new Date(r.startTime).getTime();
      const publishMs = new Date(r.publishTime).getTime();

      if (isNaN(startMs) || isNaN(publishMs)) return;

      const startDate = new Date(startMs);
      if (!isWithinRange(startDate, JAN_START, JAN_END)) return;

      /*
        Horizon means how early the forecast was published
        compared to the actual generation time.

        Example:
        Forecast published at 10:00 for generation at 13:00
        Horizon = 3 hours
      */
      const horizonHours = (startMs - publishMs) / (1000 * 60 * 60);

      forecastList.push({
        startMs,
        startISO: toUtcISOString(r.startTime),
        horizonHours,
        generation: Number(r.generation),
      });
    });

  console.log(
    `[cache] Loaded ${actualByTime.size} actuals, ${forecastList.length} forecasts`,
  );

  return { actualByTime, forecastList };
}

/*
  Cache manager function.

  Instead of calling APIs every time a user requests data,
  we store the processed dataset in memory for 1 hour.

  Also includes request coalescing:
  If multiple requests come at the same time while loading data,
  they all wait for the same promise instead of triggering
  multiple API calls.
*/
async function getCachedData() {
  if (cache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cache;
  }

  // Request coalescing
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

/*
  Main service function.

  This function takes the user input:
  startDate, endDate and horizonHours.

  Then it:
  1. gets cached dataset
  2. filters actual data in requested range
  3. selects best forecast for each timestamp
  4. merges actual and forecast values
*/
async function getWindData({ startDate, endDate, horizonHours }) {
  const start = parseIsoDate(startDate);
  const endRaw = parseIsoDate(endDate);

  if (!start || !endRaw) {
    throw new Error("Invalid startDate or endDate");
  }

  const endMs = endRaw.getTime() + 24 * 60 * 60 * 1000;
  const startMs = start.getTime();

  const { actualByTime, forecastList } = await getCachedData();

  /*
    Filter actual generation based on requested date range
  */
  const filteredActuals = new Map();

  actualByTime.forEach((gen, key) => {
    const t = new Date(key).getTime();
    if (t >= startMs && t < endMs) {
      filteredActuals.set(key, gen);
    }
  });

  /*
    For each timestamp we choose the forecast
    which satisfies horizon condition and is closest
    to the actual generation time.
  */
  const forecastByTime = new Map();

  forecastList.forEach((item) => {
    if (item.startMs < startMs || item.startMs >= endMs) return;

    if (item.horizonHours < horizonHours || item.horizonHours > 48) return;

    const existing = forecastByTime.get(item.startISO);

    if (!existing || item.horizonHours < existing.horizonHours) {
      forecastByTime.set(item.startISO, item);
    }
  });

  /*
    Merge actual generation with selected forecast.
    Only timestamps that have both values are returned.
  */
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

  // Keep output sorted by time (important for charts/analysis)
  result.sort((a, b) => new Date(a.time) - new Date(b.time));

  return result;
}

/*
  Cache warm-up.

  When the service starts, we trigger the first API load
  so that the cache is already ready before the first user request.
*/
getCachedData().catch((e) =>
  console.error("[cache] Warmup failed:", e.message),
);

module.exports = { getWindData };



/*
Service Starts
     │
     ▼
Cache Warm-up (getCachedData)
     │
     ▼
loadFromAPIs()
     │
     ├── Call Actual API
     ├── Call Forecast API
     │
     ▼
Process Actual Data
(Map → actualByTime)
     │
     ▼
Process Forecast Data
(Array → forecastList)
     │
     ▼
Store in Cache (1 hour)
     │
     ▼
User calls getWindData()
     │
     ▼
Get Cached Dataset
     │
     ▼
Filter Actual Data by Date
     │
     ▼
Select Best Forecast (based on horizon)
     │
     ▼
Merge Actual + Forecast
     │
     ▼
Sort Result by Time
     │
     ▼
Return Final JSON Response
 */