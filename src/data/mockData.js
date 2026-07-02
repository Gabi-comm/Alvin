// Mock data for the ALVIN dashboard. This stands in for the live feeds
// (Firebase Realtime DB for indoor sensors, Open-Meteo/PAGASA for weather)
// until the data layer is wired up.

// Building geo-anchor (placeholder — Manila). Rooms are scattered around it
// so the OpenStreetMap view has spatial context for each smart space.
export const BUILDING_CENTER = [14.5995, 120.9842]

export const BUILDINGS = ['Main Building', 'Annex Building', 'Science Hall']
export const FLOORS = ['Ground Floor', '2nd Floor', '3rd Floor']

// Comfort score (0-100) -> color band, matching the legend in the design.
export const COMFORT_BANDS = [
  { label: 'Excellent (90-100)', min: 90, color: '#22c55e' },
  { label: 'Good (70-89)', min: 70, color: '#4ade80' },
  { label: 'Moderate (50-69)', min: 50, color: '#fbbf24' },
  { label: 'Poor (30-49)', min: 30, color: '#fb923c' },
  { label: 'Very Poor (0-29)', min: 0, color: '#ef4444' },
]

export function comfortColor(score) {
  const band = COMFORT_BANDS.find((b) => score >= b.min)
  return band ? band.color : '#ef4444'
}

// Rooms with comfort scores, sensor readings, and coordinates.
export const ROOMS = [
  { id: 'lecture-1', name: 'Lecture Room 1', score: 75, lat: 14.6002, lng: 120.9852, temp: 26, humidity: 60, airflow: 0.4, occupancy: 18 },
  { id: 'library', name: 'Library', score: 95, lat: 14.5998, lng: 120.9838, temp: 24, humidity: 52, airflow: 0.6, occupancy: 24 },
  { id: 'study-1', name: 'Study Area 1', score: 92, lat: 14.5993, lng: 120.9833, temp: 24, humidity: 54, airflow: 0.5, occupancy: 12 },
  { id: 'admin', name: 'Admin Office', score: 70, lat: 14.5991, lng: 120.9841, temp: 27, humidity: 58, airflow: 0.3, occupancy: 6 },
  { id: 'hallway', name: 'Hallway', score: 58, lat: 14.5995, lng: 120.9845, temp: 29, humidity: 66, airflow: 0.7, occupancy: 9 },
  { id: 'lounge', name: 'Lounge', score: 82, lat: 14.6000, lng: 120.9858, temp: 25, humidity: 55, airflow: 0.5, occupancy: 14 },
  { id: 'cafeteria', name: 'Cafeteria', score: 64, lat: 14.5989, lng: 120.9853, temp: 28, humidity: 63, airflow: 0.4, occupancy: 31 },
  { id: 'entrance', name: 'Entrance Lobby', score: 50, lat: 14.5990, lng: 120.9848, temp: 30, humidity: 68, airflow: 0.8, occupancy: 20 },
  { id: 'storage', name: 'Storage', score: 40, lat: 14.5987, lng: 120.9836, temp: 31, humidity: 70, airflow: 0.2, occupancy: 1 },
]

// IoT sensor nodes (ESP32) deployed around the building.
export const DEVICES = [
  { id: 'esp32-01', room: 'Library', sensors: ['Temp', 'Humidity', 'Airflow'], battery: 92, status: 'online', lastSeen: '10s ago' },
  { id: 'esp32-02', room: 'Study Area 1', sensors: ['Temp', 'Humidity', 'Airflow'], battery: 88, status: 'online', lastSeen: '8s ago' },
  { id: 'esp32-03', room: 'Lecture Room 1', sensors: ['Temp', 'Humidity'], battery: 74, status: 'online', lastSeen: '12s ago' },
  { id: 'esp32-04', room: 'Cafeteria', sensors: ['Temp', 'Humidity', 'Airflow'], battery: 61, status: 'online', lastSeen: '5s ago' },
  { id: 'esp32-05', room: 'Entrance Lobby', sensors: ['Temp', 'Humidity', 'Airflow'], battery: 45, status: 'degraded', lastSeen: '2m ago' },
  { id: 'esp32-06', room: 'Storage', sensors: ['Temp', 'Humidity'], battery: 0, status: 'offline', lastSeen: '3h ago' },
]

// Emergency scenarios ALVIN adapts to (from the concept table).
export const EMERGENCY_SCENARIOS = [
  { id: 'fire', name: 'Fire', response: 'Safest evacuation exits', icon: '🔥' },
  { id: 'earthquake', name: 'Earthquake', response: 'Safe waiting areas', icon: '🌐' },
  { id: 'flood', name: 'Flood', response: 'Avoid flooded entrances', icon: '🌊' },
  { id: 'rain', name: 'Heavy Rain', response: 'Covered walkways', icon: '🌧️' },
  { id: 'heat', name: 'Extreme Heat', response: 'Cooling zones', icon: '☀️' },
]

export const OUTDOOR_WEATHER = {
  city: 'Manila City',
  temperature: 25,
  condition: 'Rain detected',
  humidity: 94,
  rainIntensity: '0.1 mm/h',
  wind: '10 km/h',
  heatIndex: '30 C',
  source: 'Live Open-Meteo',
  updatedAt: '4:45 AM',
}

export const RECOMMENDATIONS = [
  { id: 'library', name: 'Library', reason: 'Best for studying', score: 95 },
  { id: 'study-1', name: 'Study Area 1', reason: 'Quiet collaborative work', score: 92 },
  { id: 'lounge', name: 'Lounge', reason: 'Good for relaxation', score: 82, featured: true },
]

export const BEST_ROUTE = {
  mode: 'RAINY',
  name: 'Covered Path',
  via: 'via Hallway A',
  duration: '4 min walk',
}

export const EMERGENCY_STATUS = {
  active: false,
  headline: 'No Active Emergency',
  subtext: 'All systems normal',
  safeRoute: 'Hallway A',
  nearestExit: 'Front Lobby',
  assemblyArea: 'Covered court',
}
