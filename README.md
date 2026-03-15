## Wind Forecast Monitoring App

This project is a small full‑stack dashboard that compares **actual** wind power generation in Great Britain with **forecasted** wind generation for January 2024.

Backend: **Node.js + Express + Axios**  
Frontend: **React (Vite) + Recharts + Axios**

-**Live**:-https://wind-forecast-monitor-smoky.vercel.app/

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

---

### 3. Frontend – React dashboard

Tech stack: **React 18, javascript, Vite, Axios, Recharts**

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

### 4. Running the project locally

#### Prerequisites

- Node.js **18+**
- npm or yarn

#### 4.1. Backend

```bash
cd backend
npm install
npm start
```

#### 4.2. Frontend

```bash
cd frontend
npm install
npm run dev
```
---

### 5. Deployment notes

There are multiple ways to deploy:

- **Frontend (Vercel)**
 
- **Backend (Render)**

---

