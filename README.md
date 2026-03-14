## Wind Forecast Monitoring App

This project is a small full‑stack dashboard that compares **actual** wind power generation in Great Britain with **forecasted** wind generation for January 2024.

Backend: **Node.js + Express + Axios**  
Frontend: **React (Vite) + Recharts + Axios**

Both the web and mobile (responsive) views are supported.

---

### 1. Project structure

- **backend/**
  - `server.js` – Express server entry
  - `routes/windRoutes.js` – `/api/wind-data` endpoint
  - `services/windService.js` – calls external BMRS APIs and applies business logic
  - `utils/dateUtils.js` – small date helpers
- **frontend/**
  - Vite + React app
  - `src/pages/App.tsx` – main page layout
  - `src/components/DateRangePicker.tsx`
  - `src/components/HorizonSlider.tsx`
  - `src/components/WindChart.tsx`
  - `src/services/api.ts` – calls backend `/api/wind-data`

---

### 2. Backend – Express API

Tech stack: **Node 18+, Express, Axios, CORS**

External APIs (called **only** from the backend):

- Actual generation (half‑hourly by fuel type):  
  `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH?fuelType=WIND`
- Wind forecasts:  
  `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR`

The service layer (`services/windService.js`) performs the following steps:

1. **Fetch actual generation** from `FUELHH` and keep rows where:
   - `fuelType === "WIND"`
   - Month is **January 2024**
2. **Fetch wind forecasts** from `WINDFOR` and keep rows where:
   - Fields `startTime`, `publishTime`, `generation` are present
   - Month is **January 2024**
3. Compute the **forecast horizon** in hours:
   - `horizon_hours = startTime - publishTime` (in hours)
4. Apply the selected **horizon filter** (`0–48` hours):
   - keep only forecasts where `horizon_hours >= selected_horizon`
   - if multiple forecasts exist for the same `startTime`, pick the one with
     the *smallest* horizon that still satisfies the constraint
5. Merge the datasets by `startTime` (target time):
   - ignore any timestamps where either actual or forecast is missing
6. Restrict to the user‑selected **date range** (within January 2024).

The REST endpoint:

- `GET /api/wind-data?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&horizon=HOURS`
- Response format:

```json
[
  {
    "time": "2024-01-10T08:00:00.000Z",
    "actual_generation": 1234.5,
    "forecast_generation": 1300.0
  }
]
```

---

### 3. Frontend – React dashboard

Tech stack: **React 18, TypeScript, Vite, Axios, Recharts**

Main UI pieces:

- **Header** – “Wind Forecast Monitoring”
- **Controls section**
  - `DateRangePicker`
    - HTML date inputs for `startDate` and `endDate`
    - Restricted to **January 2024**
  - `HorizonSlider`
    - Range slider `0–48` hours
  - “Apply” button that triggers data reload
- **Main chart section**
  - `WindChart` (Recharts `LineChart`)
  - Blue line: `actual_generation`
  - Green line: `forecast_generation`

Whenever the user changes the date range or horizon and clicks **Apply**, the
frontend calls:

```text
GET /api/wind-data?startDate=...&endDate=...&horizon=...
```

and updates the chart with the returned data.

The layout is mobile‑friendly via CSS grid + media queries (controls stack
vertically on small screens, chart resizes with `ResponsiveContainer`).

---

### 4. Running the project locally

#### Prerequisites

- Node.js **18+**
- npm or yarn

#### 4.1. Backend

```bash
cd backend
npm install
npm run dev      # or: npm start
```

The backend will start on `http://localhost:5000`.

#### 4.2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:3000` and proxies `/api`
requests to `http://localhost:5000` (configured in `vite.config.mts`).

---

### 5. Deployment notes

There are multiple ways to deploy:

- **Frontend (Vercel)**
  - Set the Vercel project root to `frontend/`.
  - Build command: `npm run build`
  - Output directory: `dist`
- **Backend (Render / Railway / Fly.io / similar)**
  - Set project root to `backend/`.
  - Install command: `npm install`
  - Start command: `npm start`
  - Make sure Node runtime is 18+.

Update the frontend API base URL if you are not hosting backend and frontend on
the same origin (for example, by setting an environment variable and using it
in `src/services/api.ts`).

---

### 6. Notes and assumptions

- Only **January 2024** data is used, as requested.
- External BMRS APIs are called **exclusively** from the backend service
  layer using **Axios**; the frontend only talks to `/api/wind-data`.
- Error handling is basic but user‑friendly (error banner above the chart).

