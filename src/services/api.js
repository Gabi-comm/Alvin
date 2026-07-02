// Thin client for the ALVIN FastAPI backend (alvin-backend/main.py).
// Every call fails soft: if the backend is unreachable, callers get null and
// can fall back to mock data, so the UI works offline during development.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function get(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    // Backend offline / CORS / network error — let the caller fall back.
    return null
  }
}

// GET /api/weather/current -> outdoor conditions for Sta. Mesa, Manila
export const fetchWeather = () => get('/api/weather/current')

// GET /api/dashboard/live-sensors -> per-node comfort scores
export const fetchLiveSensors = () => get('/api/dashboard/live-sensors')

// GET /api/dashboard/stats -> system-wide average comfort + alert areas
export const fetchDashboardStats = () => get('/api/dashboard/stats')

// GET /api/navigate?start_node=&end_node=&preference=
export const fetchRoute = (start, end, preference = 'shortest') =>
  get(`/api/navigate?start_node=${encodeURIComponent(start)}&end_node=${encodeURIComponent(end)}&preference=${preference}`)

// GET /api/rooms -> full room detail (temp, humidity, airflow, noise, occupancy)
export const fetchRooms = () => get('/api/rooms')

// GET /api/recommendations -> best space per activity + ranked list
export const fetchRecommendations = () => get('/api/recommendations')

// GET /api/devices -> IoT sensor nodes + health summary
export const fetchDevices = () => get('/api/devices')

// GET /api/emergency/status -> global emergency state + safe-route guidance
export const fetchEmergencyStatus = () => get('/api/emergency/status')

// GET /api/evacuation-centers -> partner evacuation centers
export const fetchEvacuationCenters = () => get('/api/evacuation-centers')

// GET /api/evacuation-centers/nearest?lat=&lng= -> closest center to a point
export const fetchNearestEvac = (lat, lng) =>
  get(`/api/evacuation-centers/nearest?lat=${lat}&lng=${lng}`)

export { BASE_URL }
