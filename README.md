# ALVIN

### Adaptive Living Virtual Intelligence Network

## Team Information

**Team Name:** Malita Bois
**Project Name:** ALVIN — Adaptive Living Virtual Intelligence Network

## Project Brief

**The problem:** Buildings today are static spaces — occupants have no real-time way of knowing which areas are comfortable to work or wait in, and in an emergency, no way of knowing the fastest safe route out or the nearest place to go for help. Facility managers, in turn, have no unified view of environmental conditions or device health across a building.

**Our solution:** ALVIN is a human-centered 3D digital twin that fuses IoT sensing, GIS mapping, weather intelligence, and 3D visualization into one decision-support layer. It scores the comfort of every space in real time using temperature, humidity, airflow, and noise data, recommends the best space for a given activity (study, wait, rest, meet), and — in an emergency — routes occupants by GPS to the nearest partner evacuation center with turn-by-turn navigation. The whole experience is built around a real 3D model of the building rather than a flat dashboard, so people can see and interact with the actual space they're in.

**Intended users/beneficiaries:** Building occupants (students, staff, visitors) who need to find comfortable or safe spaces day-to-day and during emergencies; facility managers and building administrators who need live visibility into environmental conditions, occupancy, and IoT sensor/device health.

**Impact:** ALVIN turns passive building infrastructure into an active safety and comfort system — reducing time-to-safety during emergencies, improving day-to-day comfort and space utilization, and giving administrators real-time, data-driven visibility into their building's environmental health.

## Team Members

| Name | Role |
|---|---|
| Vince Anjo R. Villar | Project Lead |
| Alvin P. Dellomas | Frontend |
| John Ray P. Cacananta | Backend |
| Gabriel John U. Solomon | Backend |

## Google Technologies Used

- **Cloud Firestore** — primary datastore for the map/routing graph (nodes and edges), room and sensor data, emergency state, and evacuation center records.
- **Firebase Admin SDK** — backend integration layer (FastAPI) used to read/write Firestore and manage credentials/auth for backend services.

## SparkFest 2026

This project was developed as part of **SparkFest 2026**, the flagship hackathon organized by the Google Developer Groups on Campus – Polytechnic University of the Philippines (GDG on Campus PUP).

---

## Highlights

- **3D city map, locked to BGC (Taguig).** A dark MapLibre GL basemap with real 3D building extrusions, a live clock, and a clickable "Main Building" marker.
- **Interactive 3D digital twin.** The building (and per-room) `.glb` models render with orbit controls via three.js / react-three-fiber.
- **Live comfort scoring.** Every space carries a 0–100 comfort score derived from temperature, humidity, airflow, and noise, shown as color-coded gauges.
- **Smart recommendations.** Best place to study, wait, rest, or meet — ranked by current conditions.
- **Emergency evacuation routing.** One button draws a walking GPS route from the building to a partner evacuation center and hands off to turn-by-turn navigation.
- **Analytics and device health.** Building-wide trends, occupancy, and ESP32 sensor-node status at a glance.
- **Fails soft.** The UI runs fully on mock data when the backend is offline, so the experience never breaks during development or demos.

---

## Architecture

```
IoT sensors (ESP32)        Weather APIs            3D models (.glb)
   temp / humidity            OpenWeatherMap          building + rooms
   airflow / AQI                   |                       |
        |                          |                       |
        v                          v                       v
+--------------------------------------------+     +----------------------+
|            ALVIN Backend (FastAPI)         |     |   ALVIN Frontend     |
|  Firestore bridge . comfort engine .       |<--->|   (React + Vite)     |
|  routing graph (networkx) . emergency      | HTTP|  MapLibre . three.js |
+--------------------------------------------+     +----------------------+
                     |                                      |
                Firestore                            Browser dashboard
```

- **Frontend** — this package. React + Vite single-page app.
- **Backend** — `alvin-backend/`. FastAPI service for the map graph, routing, sensor ingestion, weather, and emergency management. See its [README](alvin-backend/README.md).

---

## Tech stack

| Layer      | Tools |
| ---------- | ----- |
| UI         | React 19, React Router, Vite |
| Map        | MapLibre GL (3D vector basemap + building extrusions) |
| 3D models  | three.js, @react-three/fiber, @react-three/drei |
| Routing    | OSRM public API (walking directions) with straight-line fallback |
| Backend    | FastAPI, Firebase Admin (Firestore), networkx, OpenWeatherMap |

---

## Getting started

### Frontend

```bash
npm install
cp .env.example .env        # optional: set VITE_API_URL
npm run dev
```

The app runs on `http://localhost:5173` (or `5174`). With no backend, it uses the mock data in `src/data/mockData.js`.

### Backend

```bash
cd alvin-backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env         # set FIREBASE_CREDENTIALS + OPENWEATHER_API_KEY
uvicorn main:app --reload --port 8000
python seed.py               # optional: populate a sample building graph
```

Without Firebase credentials the backend still boots in a degraded mode: weather works, and Firestore-backed endpoints return a clear 503.

---

## Environment variables

**Frontend** (`.env`)

| Variable       | Default                 | Purpose                 |
| -------------- | ------------------------ | ------------------------ |
| `VITE_API_URL` | `http://localhost:8000` | Backend API base URL    |

**Backend** (`alvin-backend/.env`)

| Variable               | Purpose                                   |
| ----------------------- | ------------------------------------------ |
| `FIREBASE_CREDENTIALS` | Path to the Firebase service-account JSON |
| `OPENWEATHER_API_KEY`  | OpenWeatherMap key for live weather       |
| `ALVIN_CORS_ORIGINS`   | Comma-separated allowed frontend origins  |

---

## Project structure

```
src/
  components/    Sidebar, TopBar, MapView, BottomPanel, BuildingViewer,
                 BuildingPanel, RoomPanel, ComfortGauge, Icon, Layout
  pages/         MapOverview, ThreeDTwin, Environmental, Recommendations,
                 Emergency, Devices, Analytics, Settings
  context/       EmergencyContext (global evacuation mode)
  services/      api.js  - backend client (fails soft to mock data)
  config/        models.js - 3D model registry
  data/          mockData.js - fallback / demo data
public/models/   3D assets: main-building.glb, Room.glb, rooms/*.glb
alvin-backend/   FastAPI service + seed script
```

---

## 3D models

Drop `.glb` files into `public/models/`:

- `main-building.glb` — the whole building (shown on the 3D Twin page and the map building panel).
- `Room.glb` — the generic room model.
- Per-room models go in `public/models/rooms/` and are registered in `src/config/models.js` under `ROOM_MODELS`, keyed by room id.

---

## Backend API

| Method | Path                              | Purpose                              |
| ------ | ---------------------------------- | ------------------------------------- |
| GET    | `/`                               | Health + Firebase connection status  |
| POST   | `/api/nodes`                      | Create/update a map node             |
| POST   | `/api/edges`                      | Create/update a walkable path        |
| GET    | `/api/navigate`                   | Shortest / covered / comfortable route |
| GET    | `/api/rooms`                      | Full detail for all rooms            |
| GET    | `/api/recommendations`            | Best space per activity + ranked list |
| GET    | `/api/devices`                    | IoT devices + health summary         |
| POST   | `/api/emergency/global`           | Set global emergency mode            |
| GET    | `/api/emergency/status`           | Current emergency state              |
| PUT    | `/api/emergency/edges/{edge_id}`  | Block/open a pathway                 |
| GET    | `/api/evacuation-centers`         | Partner evacuation centers           |
| GET    | `/api/evacuation-centers/nearest` | Nearest center to a point            |
| POST   | `/api/sensors/ingest`             | Ingest an ESP32 sensor reading       |
| GET    | `/api/weather/current`            | Current outdoor conditions           |
| GET    | `/api/dashboard/live-sensors`     | Per-node comfort scores              |
| GET    | `/api/dashboard/stats`            | Building-wide comfort, occupancy, devices, alerts |

---

## Roadmap

- Georeferenced heat / rain overlays on the map
- Click-to-select rooms directly on the 3D model
- Nearest-of-many evacuation-center selection
- Crowd / occupancy prediction and air-quality (CO2 / PM2.5) sensing
- Multi-building and campus-wide comfort network

---

## Concept references

- PAGASA — Heat Index Advisories and Weather Forecasts
- World Health Organization — Heat and Health
- ASHRAE Standard 55 — Thermal Environmental Conditions for Human Occupancy
- OpenWeatherMap, MapLibre, and OpenStreetMap / CARTO basemaps
